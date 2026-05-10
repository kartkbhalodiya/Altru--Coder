import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import {
  createAltruCoderClient,
  type AltruCoderClient,
  type Event,
  type Message,
  type Part,
  type Session,
} from "@altru-coder/sdk/v2"
import { Server } from "@/server/server"
import { InstallationVersion } from "@opencode-ai/core/installation/version"

const TIMEOUT = 10 * 60 * 1000
const LIMIT = 20
const TEXT = 12000

type Approval = "reject" | "once" | "always"
type Network = "reject" | "resume"

export type ListInput = {
  limit?: number
  search?: string
  roots?: boolean
}

export type CreateInput = {
  title?: string
}

export type MessagesInput = {
  sessionID: string
  limit?: number
}

export type PromptInput = {
  sessionID?: string
  title?: string
  message: string
  agent?: string
  providerID?: string
  modelID?: string
  variant?: string
  approval?: Approval
  network?: Network
  timeoutMs?: number
}

export type AltruMcpRuntime = {
  directory: string
  list(input: ListInput): Promise<Record<string, unknown>>
  create(input: CreateInput): Promise<Record<string, unknown>>
  messages(input: MessagesInput): Promise<Record<string, unknown>>
  prompt(input: PromptInput): Promise<Record<string, unknown>>
}

type RuntimeInput = {
  directory: string
  workspace?: string
  client?: AltruCoderClient
}

type Seen = {
  permissions: Array<Record<string, unknown>>
  questions: Array<Record<string, unknown>>
  networks: Array<Record<string, unknown>>
  errors: Array<Record<string, unknown>>
}

type MessageItem = {
  info: Message
  parts: Part[]
}

function ok(data: Record<string, unknown>): CallToolResult {
  return {
    structuredContent: data,
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}

function fail(code: string, message: string, details?: Record<string, unknown>): CallToolResult {
  const data = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  }
  return {
    isError: true,
    structuredContent: data,
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}

async function tool(fn: () => Promise<Record<string, unknown>>) {
  try {
    return ok(await fn())
  } catch (err) {
    return fail("altru_coder_error", message(err), { name: name(err) })
  }
}

function name(err: unknown) {
  if (err instanceof Error) return err.name
  if (typeof err === "object" && err && "name" in err) return String(err.name)
  return typeof err
}

function message(err: unknown) {
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err && "data" in err) {
    const data = err.data
    if (typeof data === "object" && data && "message" in data) return String(data.message)
  }
  if (typeof err === "object" && err && "message" in err) return String(err.message)
  return String(err)
}

function required<T>(value: T | undefined, label: string): T {
  if (value !== undefined) return value
  throw new Error(`${label} response did not include data`)
}

function text(value: string, limit = TEXT) {
  if (value.length <= limit) return value
  return value.slice(0, limit) + `\n[truncated ${value.length - limit} characters]`
}

function partText(parts: Part[]) {
  return text(
    parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .filter(Boolean)
      .join("\n\n"),
  )
}

function formatSession(session: Session) {
  return {
    id: session.id,
    title: session.title,
    directory: session.directory,
    path: session.path,
    parentID: session.parentID,
    workspaceID: session.workspaceID,
    time: session.time,
    summary: session.summary,
  }
}

function formatMessage(item: MessageItem) {
  const model =
    item.info.role === "assistant"
      ? `${item.info.providerID}/${item.info.modelID}`
      : `${item.info.model.providerID}/${item.info.model.modelID}`
  return {
    id: item.info.id,
    role: item.info.role,
    agent: item.info.agent,
    model,
    time: item.info.time,
    text: partText(item.parts),
    ...(item.info.role === "assistant" && {
      cost: item.info.cost,
      tokens: item.info.tokens,
      finish: item.info.finish,
      error: item.info.error,
    }),
  }
}

function fetcher() {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    return Server.Default().app.fetch(request)
  }) as typeof globalThis.fetch
}

async function limited<T>(input: { task: Promise<T>; ms: number; ctrl: AbortController }) {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      input.ctrl.abort()
      reject(new Error(`MCP prompt timed out after ${input.ms}ms`))
    }, input.ms)
    input.task.finally(() => clearTimeout(id)).catch(() => clearTimeout(id))
  })
  return Promise.race([input.task, timeout])
}

async function watch(input: {
  sdk: AltruCoderClient
  stream: AsyncGenerator<Event>
  sessionID: string
  directory: string
  workspace?: string
  approval: Approval
  network: Network
  seen: Seen
  signal: AbortSignal
}) {
  try {
    for await (const event of input.stream) {
      if (event.type === "permission.asked" && event.properties.sessionID === input.sessionID) {
        input.seen.permissions.push({
          id: event.properties.id,
          permission: event.properties.permission,
          patterns: event.properties.patterns,
          reply: input.approval,
        })
        await input.sdk.permission
          .reply(
            {
              requestID: event.properties.id,
              directory: input.directory,
              workspace: input.workspace,
              reply: input.approval,
              message:
                input.approval === "reject"
                  ? "Rejected by the Altru Coder MCP server default permission policy."
                  : undefined,
            },
            { throwOnError: true },
          )
          .catch((err) => input.seen.errors.push({ source: "permission.reply", message: message(err) }))
      }

      if (event.type === "question.asked" && event.properties.sessionID === input.sessionID) {
        input.seen.questions.push({
          id: event.properties.id,
          questions: event.properties.questions,
          action: "reject",
        })
        await input.sdk.question
          .reject(
            {
              requestID: event.properties.id,
              directory: input.directory,
              workspace: input.workspace,
            },
            { throwOnError: true },
          )
          .catch((err) => input.seen.errors.push({ source: "question.reject", message: message(err) }))
      }

      if (event.type === "session.network.asked" && event.properties.sessionID === input.sessionID) {
        input.seen.networks.push({
          id: event.properties.id,
          message: event.properties.message,
          reply: input.network,
        })
        const task =
          input.network === "resume"
            ? input.sdk.network.reply(
                {
                  requestID: event.properties.id,
                  directory: input.directory,
                  workspace: input.workspace,
                },
                { throwOnError: true },
              )
            : input.sdk.network.reject(
                {
                  requestID: event.properties.id,
                  directory: input.directory,
                  workspace: input.workspace,
                },
                { throwOnError: true },
              )
        await task.catch((err) => input.seen.errors.push({ source: "network.reply", message: message(err) }))
      }

      if (event.type === "session.error" && event.properties.sessionID === input.sessionID) {
        input.seen.errors.push({
          source: "session.error",
          message: message(event.properties.error),
          error: event.properties.error,
        })
      }
    }
  } catch (err) {
    if (input.signal.aborted) return
    input.seen.errors.push({ source: "event.stream", message: message(err) })
  }
}

export function createSdkMcpRuntime(input: RuntimeInput): AltruMcpRuntime {
  const sdk =
    input.client ??
    createAltruCoderClient({
      baseUrl: "http://altru.internal",
      directory: input.directory,
      experimental_workspaceID: input.workspace,
      fetch: fetcher(),
    })

  const base = {
    directory: input.directory,
    workspace: input.workspace,
  }

  return {
    directory: input.directory,
    async list(data) {
      const res = await sdk.session.list(
        {
          ...base,
          limit: data.limit ?? LIMIT,
          search: data.search,
          roots: data.roots,
        },
        { throwOnError: true },
      )
      return {
        directory: input.directory,
        sessions: required(res.data, "session.list").map(formatSession),
      }
    },
    async create(data) {
      const res = await sdk.session.create(
        {
          ...base,
          title: data.title,
          platform: "mcp-server",
        },
        { throwOnError: true },
      )
      return {
        session: formatSession(required(res.data, "session.create")),
      }
    },
    async messages(data) {
      const res = await sdk.session.messages(
        {
          ...base,
          sessionID: data.sessionID,
          limit: data.limit ?? LIMIT,
        },
        { throwOnError: true },
      )
      return {
        sessionID: data.sessionID,
        messages: required(res.data, "session.messages").map(formatMessage),
      }
    },
    async prompt(data) {
      const created = data.sessionID
        ? undefined
        : required(
            (
              await sdk.session.create(
                {
                  ...base,
                  title: data.title,
                  platform: "mcp-server",
                },
                { throwOnError: true },
              )
            ).data,
            "session.create",
          )
      const sessionID = data.sessionID ?? required(created?.id, "session.create.id")
      const ctrl = new AbortController()
      const events = await sdk.event.subscribe(base, {
        signal: ctrl.signal,
        sseMaxRetryAttempts: 1,
      })
      const seen: Seen = {
        permissions: [],
        questions: [],
        networks: [],
        errors: [],
      }
      const watcher = watch({
        sdk,
        stream: events.stream,
        sessionID,
        directory: input.directory,
        workspace: input.workspace,
        approval: data.approval ?? "reject",
        network: data.network ?? "reject",
        seen,
        signal: ctrl.signal,
      })
      try {
        const model =
          data.providerID && data.modelID
            ? {
                providerID: data.providerID,
                modelID: data.modelID,
              }
            : undefined
        const res = await limited({
          ms: data.timeoutMs ?? TIMEOUT,
          ctrl,
          task: sdk.session.prompt(
            {
              ...base,
              sessionID,
              agent: data.agent,
              model,
              variant: data.variant,
              parts: [{ type: "text", text: data.message }],
            },
            { throwOnError: true, signal: ctrl.signal },
          ),
        })
        ctrl.abort()
        await watcher
        const msg = required(res.data, "session.prompt")
        return {
          sessionID,
          created: created ? formatSession(created) : undefined,
          messageID: msg.info.id,
          text: partText(msg.parts),
          error: msg.info.error,
          finish: msg.info.finish,
          cost: msg.info.cost,
          tokens: msg.info.tokens,
          permissions: seen.permissions,
          questions: seen.questions,
          networks: seen.networks,
          errors: seen.errors,
        }
      } catch (err) {
        ctrl.abort()
        await watcher
        throw err
      }
    },
  }
}

export function createAltruMcpServer(runtime: AltruMcpRuntime) {
  const server = new McpServer({
    name: "altru-coder",
    version: InstallationVersion,
  })

  server.registerTool(
    "altru_session_list",
    {
      title: "List Altru Coder sessions",
      description: "List recent Altru Coder sessions for the current repository.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        search: z.string().min(1).max(200).optional(),
        roots: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => tool(() => runtime.list(input)),
  )

  server.registerTool(
    "altru_session_create",
    {
      title: "Create Altru Coder session",
      description: "Create a new Altru Coder session in the current repository.",
      inputSchema: {
        title: z.string().min(1).max(200).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (input) => tool(() => runtime.create(input)),
  )

  server.registerTool(
    "altru_session_messages",
    {
      title: "Read Altru Coder session messages",
      description: "Read recent messages from an Altru Coder session.",
      inputSchema: {
        sessionID: z.string().min(1),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => tool(() => runtime.messages(input)),
  )

  server.registerTool(
    "altru_session_prompt",
    {
      title: "Prompt Altru Coder",
      description: "Send a prompt to Altru Coder and return the final assistant response.",
      inputSchema: {
        sessionID: z.string().min(1).optional(),
        title: z.string().min(1).max(200).optional(),
        message: z.string().min(1),
        agent: z.string().min(1).max(100).optional(),
        providerID: z.string().min(1).max(100).optional(),
        modelID: z.string().min(1).max(300).optional(),
        variant: z.string().min(1).max(100).optional(),
        approval: z.enum(["reject", "once", "always"]).optional(),
        network: z.enum(["reject", "resume"]).optional(),
        timeoutMs: z
          .number()
          .int()
          .min(1000)
          .max(30 * 60 * 1000)
          .optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    (input) => tool(() => runtime.prompt(input)),
  )

  return server
}

export async function runStdioMcpServer(runtime: AltruMcpRuntime) {
  const server = createAltruMcpServer(runtime)
  await server.connect(new StdioServerTransport())
  return server
}
