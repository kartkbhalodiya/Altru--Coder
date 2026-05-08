// altrucoder_change - new file
import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const TOOL_SEARCH_ID = "tool_search"

const Parameters = Schema.Struct({
  query: Schema.optional(Schema.String).annotate({
    description: "Optional search text to match tool names and descriptions",
  }),
  limit: Schema.optional(Schema.Number).annotate({
    description: "Maximum tools to return. Defaults to 20.",
  }),
})

interface Metadata {
  count: number
}

function brief(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 240)
}

export function create(catalog: Tool.Def[]): Tool.Def<typeof Parameters, Metadata> {
  return {
    id: TOOL_SEARCH_ID,
    description:
      "Search the currently available tools by name or description. Use this when you need to discover which tool can perform a task.",
    parameters: Parameters,
    execute: (params) =>
      Effect.sync(() => {
        const query = params.query?.trim().toLowerCase()
        const limit = Math.min(Math.max(params.limit ?? 20, 1), 50)
        const items = catalog
          .filter((tool) => tool.id !== TOOL_SEARCH_ID)
          .filter((tool) => {
            if (!query) return true
            return `${tool.id}\n${tool.description}`.toLowerCase().includes(query)
          })
          .toSorted((a, b) => a.id.localeCompare(b.id))
          .slice(0, limit)

        return {
          title: query ? `Tool search: ${query}` : "Available tools",
          output:
            items.length === 0
              ? "No matching tools found."
              : items.map((tool) => `- ${tool.id}: ${brief(tool.description)}`).join("\n"),
          metadata: { count: items.length },
        }
      }),
  }
}
