// altrucoder_change - new file
import { Effect, Schema } from "effect"
import { MCP } from "@/mcp"
import * as Tool from "./tool"
import DESCRIPTION from "./mcp-resource.txt"

const Parameters = Schema.Struct({
  mode: Schema.Literals(["list", "read"]).annotate({
    description: "Use list to discover MCP resources, read to load one resource by server and URI",
  }),
  server: Schema.optional(Schema.String).annotate({
    description: "MCP server/client name. Required for read mode.",
  }),
  uri: Schema.optional(Schema.String).annotate({
    description: "Resource URI. Required for read mode.",
  }),
  query: Schema.optional(Schema.String).annotate({
    description: "Optional text filter for resource name, URI, description, or server",
  }),
  limit: Schema.optional(Schema.Number).annotate({
    description: "Maximum resources to list. Defaults to 20.",
  }),
})

interface Metadata {
  count?: number
  server?: string
  uri?: string
}

function pick(value: unknown) {
  return typeof value === "string" ? value : ""
}

function match(item: { name?: string; uri?: string; description?: string; client?: string }, query?: string) {
  if (!query) return true
  const text = [item.name, item.uri, item.description, item.client].filter(Boolean).join("\n").toLowerCase()
  return text.includes(query.toLowerCase())
}

function line(item: { name?: string; uri?: string; description?: string; mimeType?: string; client?: string }) {
  const desc = item.description ? ` - ${item.description.replace(/\s+/g, " ").trim()}` : ""
  const mime = item.mimeType ? ` (${item.mimeType})` : ""
  return `- ${item.client}: ${item.name ?? item.uri}${mime}\n  uri: ${item.uri}${desc}`
}

export const McpResourceTool = Tool.define<typeof Parameters, Metadata, MCP.Service>(
  "mcp_resource",
  Effect.gen(function* () {
    const mcp = yield* MCP.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context<Metadata>) =>
        Effect.gen(function* () {
          const limit = Math.min(Math.max(params.limit ?? 20, 1), 100)

          if (params.mode === "list") {
            yield* ctx.ask({
              permission: "mcp_resource",
              patterns: [params.query ?? "*"],
              always: ["list"],
              metadata: { mode: "list", query: params.query },
            })

            const all = Object.values(yield* mcp.resources())
              .filter((item) => !params.server || item.client === params.server)
              .filter((item) => match(item, params.query))
              .toSorted((a, b) => `${a.client}:${a.name}`.localeCompare(`${b.client}:${b.name}`))
              .slice(0, limit)

            return {
              title: "MCP resources",
              output: all.length === 0 ? "No MCP resources found." : all.map(line).join("\n"),
              metadata: { count: all.length },
            }
          }

          if (!params.server?.trim()) throw new Error("server is required when mode is read")
          if (!params.uri?.trim()) throw new Error("uri is required when mode is read")

          yield* ctx.ask({
            permission: "mcp_resource",
            patterns: [`${params.server}:${params.uri}`],
            always: [params.server],
            metadata: { mode: "read", server: params.server, uri: params.uri },
          })

          const result = yield* mcp.readResource(params.server, params.uri)
          if (!result) throw new Error(`MCP resource not found: ${params.server}:${params.uri}`)

          const text: string[] = []
          const attachments: NonNullable<Tool.ExecuteResult["attachments"]> = []
          for (const item of result.contents ?? []) {
            const mime = pick(item.mimeType) || "application/octet-stream"
            if ("text" in item && item.text) {
              text.push(String(item.text))
              continue
            }
            if ("blob" in item && item.blob) {
              attachments.push({
                type: "file",
                mime,
                url: `data:${mime};base64,${item.blob}`,
                filename: pick(item.uri) || params.uri,
              })
              text.push(`[binary resource: ${pick(item.uri) || params.uri} (${mime})]`)
            }
          }

          return {
            title: `MCP resource: ${params.server}`,
            output: text.join("\n\n") || "MCP resource returned no text content.",
            attachments,
            metadata: { server: params.server, uri: params.uri, count: result.contents?.length ?? 0 },
          }
        }).pipe(Effect.orDie),
    }
  }),
)
