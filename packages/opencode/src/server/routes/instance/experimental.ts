import { Hono, type Context } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import { streamSSE } from "hono/streaming" // altrucoder_change
import z from "zod"
import * as EffectZod from "@/util/effect-zod"
import { ProviderID, ModelID } from "@/provider/schema"
import { ToolRegistry } from "@/tool/registry"
import { Worktree } from "@/worktree"
import { Instance } from "@/project/instance"
import { InstanceState } from "@/effect/instance-state" // altrucoder_change
import { Project } from "@/project/project"
import { Bus } from "@/bus" // altrucoder_change
import { File } from "@/file" // altrucoder_change
import { FileWatcher } from "@/file/watcher" // altrucoder_change
import { MCP } from "@/mcp"
import { Session } from "@/session/session"
import { MessageID, SessionID } from "@/session/schema" // altrucoder_change
import { MessageV2 } from "@/session/message-v2" // altrucoder_change
import { SessionStatus } from "@/session/status" // altrucoder_change
import { SessionSummary } from "@/session/summary" // altrucoder_change
import { Todo } from "@/session/todo" // altrucoder_change
import { Config } from "@/config/config"
import { ConsoleState } from "@/config/console-state"
import { Account } from "@/account/account"
import { AccountID, OrgID } from "@/account/schema"
import { errors } from "../../error"
import { lazy } from "@/util/lazy"
import { Effect, Option } from "effect"
import { Agent } from "@/agent/agent"
import { Snapshot } from "@/snapshot" // altrucoder_change
import { Review } from "@/altrucoder/review/review" // altrucoder_change
import { WorktreeDiff } from "@/altrucoder/review/worktree-diff" // altrucoder_change
import { WorktreeFamily } from "@/altrucoder/worktree-family" // altrucoder_change
import * as Log from "@opencode-ai/core/util/log" // altrucoder_change
import { Filesystem } from "@/util/filesystem" // altrucoder_change
import path from "path" // altrucoder_change
import { jsonRequest, runRequest } from "./trace"
import { BashBackground } from "@/tool/bash" // altrucoder_change
import * as Truncate from "@/tool/truncate" // altrucoder_change
import { NotFoundError } from "@/storage/storage" // altrucoder_change
import { ExperimentalApi } from "@/altrucoder/server/experimental-api" // altrucoder_change
import { AppServerProtocol } from "@/altrucoder/app-server/protocol" // altrucoder_change
import { ProcessRpc } from "@/altrucoder/process/rpc" // altrucoder_change
import { FilesystemRpc } from "@/altrucoder/filesystem/rpc" // altrucoder_change
import { ThreadResume } from "@/altrucoder/session/resume" // altrucoder_change
import { ThreadRealtime } from "@/altrucoder/thread/realtime" // altrucoder_change
import { GlobalBus, type GlobalEvent } from "@/bus/global" // altrucoder_change
import { AsyncQueue } from "@/util/queue" // altrucoder_change

const realtimeLog = Log.create({ service: "thread-realtime" }) // altrucoder_change

const ConsoleOrgOption = z.object({
  accountID: z.string(),
  accountEmail: z.string(),
  accountUrl: z.string(),
  orgID: z.string(),
  orgName: z.string(),
  active: z.boolean(),
})

const ConsoleOrgList = z.object({
  orgs: z.array(ConsoleOrgOption),
})

const ConsoleSwitchBody = z.object({
  accountID: z.string(),
  orgID: z.string(),
})

const QueryBoolean = z.union([
  z.preprocess((value) => (value === "true" ? true : value === "false" ? false : value), z.boolean()),
  z.enum(["true", "false"]),
])

function queryBoolean(value: z.infer<typeof QueryBoolean> | undefined) {
  if (value === undefined) return
  return value === true || value === "true"
}

// altrucoder_change start
const TerminalJob = z
  .object({
    id: z.string(),
    command: z.string(),
    cwd: z.string(),
    sessionID: z.string(),
    messageID: z.string(),
    callID: z.string().optional(),
    pid: z.number().optional(),
    started: z.number(),
    updated: z.number(),
    status: z.string(),
    running: z.boolean(),
    exit: z.number().nullable(),
    error: z.string().optional(),
    stopped: z.boolean().optional(),
    truncated: z.boolean(),
    output: z.string(),
  })
  .meta({ ref: "TerminalJob" })
const TerminalQuery = z.object({
  sessionID: z.string().optional(),
})
const TerminalBody = z.object({
  sessionID: z.string().optional(),
})
const TerminalWriteBody = TerminalBody.extend({
  input: z.string(),
  newline: z.boolean().optional(),
})
const ProcessInfo = TerminalJob.extend({
  processID: z.string(),
}).meta({ ref: "ProcessInfo" })
const ProcessOutput = z
  .object({
    processID: z.string(),
    id: z.string(),
    offset: z.number(),
    nextOffset: z.number(),
    output: z.string(),
    truncated: z.boolean(),
    running: z.boolean(),
    exit: z.number().nullable(),
    status: z.string(),
    error: z.string().optional(),
  })
  .meta({ ref: "ProcessOutput" })
const ProcessQuery = z.object({
  sessionID: z.string().optional(),
})
const ProcessOutputQuery = ProcessQuery.extend({
  offset: z.coerce.number().optional(),
})
const ProcessStartBody = z.object({
  sessionID: z.string(),
  command: z.string(),
  cwd: z.string().optional(),
  shell: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  messageID: z.string().optional(),
  callID: z.string().optional(),
})
const ProcessBody = z.object({
  sessionID: z.string().optional(),
})
const ProcessWriteBody = ProcessBody.extend({
  input: z.string(),
  newline: z.boolean().optional(),
})
const AppServerJsonRpcID = z.union([z.string(), z.number(), z.null()])
const AppServerRpcBody = z.object({
  jsonrpc: z.literal("2.0"),
  id: AppServerJsonRpcID.optional(),
  method: z.string(),
  params: z.unknown().optional(),
})
const AppServerRpcResponse = z
  .object({
    jsonrpc: z.literal("2.0"),
    id: AppServerJsonRpcID,
    result: z.unknown().optional(),
    error: z
      .object({
        code: z.number(),
        message: z.string(),
        data: z.unknown().optional(),
      })
      .optional(),
  })
  .meta({ ref: "AppServerRpcResponse" })
const AppServerCapabilities = z
  .object({
    protocolVersion: z.string(),
    server: z.object({
      name: z.string(),
      version: z.string(),
    }),
    methods: z.array(z.string()),
    features: z.record(z.string(), z.boolean()),
  })
  .meta({ ref: "AppServerCapabilities" })
const ThreadResumeQuery = z.object({
  limit: z.coerce.number().int().min(0).optional(),
  before: z.string().optional(),
  diff: QueryBoolean.optional(),
})
const ThreadUsage = z
  .object({
    cost: z.number(),
    tokens: z.object({
      input: z.number(),
      output: z.number(),
      reasoning: z.number(),
      total: z.number(),
      cache: z.object({
        read: z.number(),
        write: z.number(),
      }),
    }),
  })
  .meta({ ref: "ThreadUsage" })
const ThreadRecovery = z
  .object({
    resumable: z.boolean(),
    returnedMessages: z.number(),
    truncated: z.boolean(),
    nextCursor: z.string().optional(),
    lastMessageID: z.string().optional(),
    lastUserMessageID: z.string().optional(),
    lastAssistantMessageID: z.string().optional(),
  })
  .meta({ ref: "ThreadRecovery" })
const ThreadResumeResponse = z
  .object({
    session: Session.Info.zod,
    status: SessionStatus.Info.zod,
    messages: z.array(MessageV2.WithParts.zod),
    todos: z.array(Todo.Info.zod),
    diff: z.array(Snapshot.FileDiff.zod),
    usage: ThreadUsage,
    recovery: ThreadRecovery,
  })
  .meta({ ref: "ThreadResume" })
const FilesystemEncoding = z.enum(["utf8", "base64"])
const FilesystemPathQuery = z.object({
  path: z.string(),
})
const FilesystemReadQuery = FilesystemPathQuery.extend({
  encoding: FilesystemEncoding.optional(),
})
const FilesystemWriteBody = z.object({
  path: z.string(),
  content: z.string(),
  encoding: FilesystemEncoding.optional(),
  createDirs: z.boolean().optional(),
})
const FilesystemMkdirBody = z.object({
  path: z.string(),
  recursive: z.boolean().optional(),
})
const FilesystemRemoveBody = z.object({
  path: z.string(),
  recursive: z.boolean().optional(),
})
const FilesystemRenameBody = z.object({
  from: z.string(),
  to: z.string(),
  overwrite: z.boolean().optional(),
})
const FilesystemStat = z
  .object({
    path: z.string(),
    absolute: z.string(),
    type: z.enum(["file", "directory", "missing"]),
    exists: z.boolean(),
    size: z.number().optional(),
    mtime: z.number().optional(),
  })
  .meta({ ref: "FilesystemStat" })
const FilesystemRead = FilesystemStat.extend({
  type: z.literal("file"),
  exists: z.literal(true),
  content: z.string(),
  encoding: FilesystemEncoding,
}).meta({ ref: "FilesystemRead" })
const FilesystemRemoved = z
  .object({
    path: z.string(),
    absolute: z.string(),
    removed: z.boolean(),
  })
  .meta({ ref: "FilesystemRemoved" })
const FilesystemEntry = z
  .object({
    name: z.string(),
    path: z.string(),
    absolute: z.string(),
    type: z.enum(["file", "directory"]),
  })
  .meta({ ref: "FilesystemEntry" })
const TerminalLimits = { maxLines: Truncate.MAX_LINES, maxBytes: Truncate.MAX_BYTES }

function terminalSession(value?: string) {
  return value ? SessionID.make(value) : undefined
}

function terminalError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  if (message.toLowerCase().includes("not found")) {
    throw new NotFoundError({ message })
  }
  return {
    data: { message },
    errors: [{ message }],
    success: false as const,
  }
}

async function threadStream(c: Context, sessionID: string) {
  return streamSSE(c, async (stream) => {
    const q = new AsyncQueue<string | null>()
    let done = false

    q.push(ThreadRealtime.data(ThreadRealtime.connected(sessionID)))

    const heartbeat = setInterval(() => {
      q.push(ThreadRealtime.data(ThreadRealtime.heartbeat(sessionID)))
    }, 10_000)

    const handler = (event: GlobalEvent) => {
      const next = ThreadRealtime.fromGlobal(sessionID, event)
      if (next) q.push(ThreadRealtime.data(next))
    }

    const stop = () => {
      if (done) return
      done = true
      clearInterval(heartbeat)
      GlobalBus.off("event", handler)
      q.push(null)
      realtimeLog.info("thread event disconnected", { sessionID })
    }

    GlobalBus.on("event", handler)
    stream.onAbort(stop)

    try {
      for await (const data of q) {
        if (data === null) return
        try {
          await stream.writeSSE({ data })
        } catch (err) {
          realtimeLog.info("thread event write failed, cleaning up dead stream", {
            sessionID,
            error: err instanceof Error ? err.message : String(err),
          })
          stop()
          return
        }
      }
    } finally {
      stop()
    }
  })
}
// altrucoder_change end

export const ExperimentalRoutes = lazy(() =>
  new Hono()
    // altrucoder_change start - require client opt-in for unstable experimental routes
    .use("*", async (c, next) => {
      const ok = ExperimentalApi.enabled({
        url: c.req.url,
        header: (name) => c.req.header(name),
      })
      if (ok) return next()
      return c.json(ExperimentalApi.response(), 403)
    })
    // altrucoder_change end
    .get(
      "/console",
      describeRoute({
        summary: "Get active Console provider metadata",
        description: "Get the active Console org name and the set of provider IDs managed by that Console org.",
        operationId: "experimental.console.get",
        responses: {
          200: {
            description: "Active Console provider metadata",
            content: {
              "application/json": {
                schema: resolver(ConsoleState.zod),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("ExperimentalRoutes.console.get", c, function* () {
          const config = yield* Config.Service
          const account = yield* Account.Service
          const [state, groups] = yield* Effect.all([config.getConsoleState(), account.orgsByAccount()], {
            concurrency: "unbounded",
          })
          return {
            ...state,
            switchableOrgCount: groups.reduce((count, group) => count + group.orgs.length, 0),
          }
        }),
    )
    .get(
      "/console/orgs",
      describeRoute({
        summary: "List switchable Console orgs",
        description: "Get the available Console orgs across logged-in accounts, including the current active org.",
        operationId: "experimental.console.listOrgs",
        responses: {
          200: {
            description: "Switchable Console orgs",
            content: {
              "application/json": {
                schema: resolver(ConsoleOrgList),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("ExperimentalRoutes.console.listOrgs", c, function* () {
          const account = yield* Account.Service
          const [groups, active] = yield* Effect.all([account.orgsByAccount(), account.active()], {
            concurrency: "unbounded",
          })
          const info = Option.getOrUndefined(active)
          const orgs = groups.flatMap((group) =>
            group.orgs.map((org) => ({
              accountID: group.account.id,
              accountEmail: group.account.email,
              accountUrl: group.account.url,
              orgID: org.id,
              orgName: org.name,
              active: !!info && info.id === group.account.id && info.active_org_id === org.id,
            })),
          )
          return { orgs }
        }),
    )
    .post(
      "/console/switch",
      describeRoute({
        summary: "Switch active Console org",
        description: "Persist a new active Console account/org selection for the current local OpenCode state.",
        operationId: "experimental.console.switchOrg",
        responses: {
          200: {
            description: "Switch success",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
        },
      }),
      validator("json", ConsoleSwitchBody),
      async (c) =>
        jsonRequest("ExperimentalRoutes.console.switchOrg", c, function* () {
          const body = c.req.valid("json")
          const account = yield* Account.Service
          yield* account.use(AccountID.make(body.accountID), Option.some(OrgID.make(body.orgID)))
          return true
        }),
    )
    .get(
      "/tool/ids",
      describeRoute({
        summary: "List tool IDs",
        description:
          "Get a list of all available tool IDs, including both built-in tools and dynamically registered tools.",
        operationId: "tool.ids",
        responses: {
          200: {
            description: "Tool IDs",
            content: {
              "application/json": {
                schema: resolver(z.array(z.string()).meta({ ref: "ToolIDs" })),
              },
            },
          },
          ...errors(400),
        },
      }),
      async (c) =>
        jsonRequest("ExperimentalRoutes.tool.ids", c, function* () {
          const registry = yield* ToolRegistry.Service
          return yield* registry.ids()
        }),
    )
    .get(
      "/tool",
      describeRoute({
        summary: "List tools",
        description:
          "Get a list of available tools with their JSON schema parameters for a specific provider and model combination.",
        operationId: "tool.list",
        responses: {
          200: {
            description: "Tools",
            content: {
              "application/json": {
                schema: resolver(
                  z
                    .array(
                      z
                        .object({
                          id: z.string(),
                          description: z.string(),
                          parameters: z.any(),
                        })
                        .meta({ ref: "ToolListItem" }),
                    )
                    .meta({ ref: "ToolList" }),
                ),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "query",
        z.object({
          provider: z.string(),
          model: z.string(),
        }),
      ),
      async (c) => {
        const { provider, model } = c.req.valid("query")
        const tools = await runRequest(
          "ExperimentalRoutes.tool.list",
          c,
          Effect.gen(function* () {
            const agents = yield* Agent.Service
            const registry = yield* ToolRegistry.Service
            return yield* registry.tools({
              providerID: ProviderID.make(provider),
              modelID: ModelID.make(model),
              agent: yield* agents.get(yield* agents.defaultAgent()),
            })
          }),
        )
        return c.json(
          tools.map((t) => ({
            id: t.id,
            description: t.description,
            parameters: EffectZod.toJsonSchema(t.parameters),
          })),
        )
      },
    )
    .post(
      "/worktree",
      describeRoute({
        summary: "Create worktree",
        description: "Create a new git worktree for the current project and run any configured startup scripts.",
        operationId: "worktree.create",
        responses: {
          200: {
            description: "Worktree created",
            content: {
              "application/json": {
                schema: resolver(Worktree.Info.zod),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", Worktree.CreateInput.zod.optional()),
      async (c) =>
        jsonRequest("ExperimentalRoutes.worktree.create", c, function* () {
          const body = c.req.valid("json")
          const svc = yield* Worktree.Service
          return yield* svc.create(body)
        }),
    )
    .get(
      "/worktree",
      describeRoute({
        summary: "List worktrees",
        description: "List all sandbox worktrees for the current project.",
        operationId: "worktree.list",
        responses: {
          200: {
            description: "List of worktree directories",
            content: {
              "application/json": {
                schema: resolver(z.array(z.string())),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("ExperimentalRoutes.worktree.list", c, function* () {
          const svc = yield* Project.Service
          return yield* svc.sandboxes(Instance.project.id)
        }),
    )
    .delete(
      "/worktree",
      describeRoute({
        summary: "Remove worktree",
        description: "Remove a git worktree and delete its branch.",
        operationId: "worktree.remove",
        responses: {
          200: {
            description: "Worktree removed",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", Worktree.RemoveInput.zod),
      async (c) =>
        jsonRequest("ExperimentalRoutes.worktree.remove", c, function* () {
          const body = c.req.valid("json")
          const worktree = yield* Worktree.Service
          const project = yield* Project.Service
          yield* worktree.remove(body)
          yield* project.removeSandbox(Instance.project.id, body.directory)
          return true
        }),
    )
    .post(
      "/worktree/reset",
      describeRoute({
        summary: "Reset worktree",
        description: "Reset a worktree branch to the primary default branch.",
        operationId: "worktree.reset",
        responses: {
          200: {
            description: "Worktree reset",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", Worktree.ResetInput.zod),
      async (c) =>
        jsonRequest("ExperimentalRoutes.worktree.reset", c, function* () {
          const body = c.req.valid("json")
          const svc = yield* Worktree.Service
          yield* svc.reset(body)
          return true
        }),
    )
    // altrucoder_change start - worktree diff endpoint for agent manager
    .get(
      "/worktree/diff",
      describeRoute({
        summary: "Get worktree diff",
        description: "Get file diffs for a worktree compared to its base branch. Includes uncommitted changes.",
        operationId: "worktree.diff",
        responses: {
          200: {
            description: "File diffs",
            content: {
              "application/json": {
                schema: resolver(z.array(Snapshot.FileDiff.zod)),
              },
            },
          },
          ...errors(400),
        },
      }),
      // altrucoder_change start
      validator(
        "query",
        z.object({
          base: z.string().optional().meta({ description: "Base branch or ref to diff against" }),
        }),
      ),
      async (c) => {
        const log = Log.create({ service: "worktree-diff" })
        const query = c.req.valid("query")
        const base = query.base || (await Review.getBaseBranch())
        // altrucoder_change end
        const dir = Instance.directory
        log.info("computing diff", { dir, base })
        const diffs = await WorktreeDiff.full({ dir, base, log })
        return c.json(
          diffs.map((diff) => ({
            file: diff.file,
            before: diff.before,
            after: diff.after,
            additions: diff.additions,
            deletions: diff.deletions,
            status: diff.status,
          })),
        )
      },
    )
    .get(
      "/worktree/diff/summary",
      describeRoute({
        summary: "Get worktree diff summary",
        description: "Get lightweight file diff metadata for a worktree compared to its base branch.",
        operationId: "worktree.diffSummary",
        responses: {
          200: {
            description: "Diff summary items",
            content: {
              "application/json": {
                schema: resolver(z.array(WorktreeDiff.Item.zod)),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "query",
        z.object({
          base: z.string().optional().meta({ description: "Base branch or ref to diff against" }),
        }),
      ),
      async (c) => {
        const log = Log.create({ service: "worktree-diff" })
        const query = c.req.valid("query")
        const base = query.base || (await Review.getBaseBranch())
        const dir = Instance.directory
        log.info("computing diff summary", { dir, base })
        return c.json(await WorktreeDiff.summary({ dir, base, log }))
      },
    )
    .get(
      "/worktree/diff/file",
      describeRoute({
        summary: "Get worktree diff detail",
        description: "Get full diff contents for one worktree file compared to its base branch.",
        operationId: "worktree.diffFile",
        responses: {
          200: {
            description: "Diff detail item",
            content: {
              "application/json": {
                schema: resolver(WorktreeDiff.Item.zod.nullable()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "query",
        z.object({
          base: z.string().optional().meta({ description: "Base branch or ref to diff against" }),
          file: z.string().meta({ description: "Relative file path to load diff contents for" }),
        }),
      ),
      async (c) => {
        const log = Log.create({ service: "worktree-diff" })
        const query = c.req.valid("query")
        const base = query.base || (await Review.getBaseBranch())
        const dir = Instance.directory
        log.info("computing diff detail", { dir, base, file: query.file })
        return c.json((await WorktreeDiff.detail({ dir, base, file: query.file, log })) ?? null)
      },
    )
    // altrucoder_change end
    .get(
      "/session",
      describeRoute({
        summary: "List sessions",
        description:
          "Get a list of all OpenCode sessions across projects, sorted by most recently updated. Archived sessions are excluded by default.",
        operationId: "experimental.session.list",
        responses: {
          200: {
            description: "List of sessions",
            content: {
              "application/json": {
                schema: resolver(Session.GlobalInfo.zod.array()),
              },
            },
          },
        },
      }),
      validator(
        "query",
        z.object({
          // altrucoder_change start
          projectID: z.string().optional().meta({ description: "Filter sessions by project ID" }),
          directory: z.string().optional().meta({ description: "Filter sessions by project directory" }),
          worktrees: z.coerce
            .boolean()
            .optional()
            .meta({ description: "Restrict sessions to the current repo worktree family or current directory" }),
          // altrucoder_change end
          roots: QueryBoolean.optional().meta({ description: "Only return root sessions (no parentID)" }),
          start: z.coerce
            .number()
            .optional()
            .meta({ description: "Filter sessions updated on or after this timestamp (milliseconds since epoch)" }),
          cursor: z.coerce
            .number()
            .optional()
            .meta({ description: "Return sessions updated before this timestamp (milliseconds since epoch)" }),
          search: z.string().optional().meta({ description: "Filter sessions by title (case-insensitive)" }),
          limit: z.coerce.number().optional().meta({ description: "Maximum number of sessions to return" }),
          archived: QueryBoolean.optional().meta({ description: "Include archived sessions (default false)" }),
        }),
      ),
      async (c) => {
        const query = c.req.valid("query")
        const limit = query.limit ?? 100 // altrucoder_change
        // altrucoder_change start
        const projectID = query.worktrees && !query.projectID ? Instance.project.id : query.projectID
        // altrucoder_change end
        const directories = query.worktrees ? await WorktreeFamily.list() : undefined // altrucoder_change
        // altrucoder_change start - sort longest-first so most specific worktree matches first
        const sorted = directories ? [...directories].sort((a, b) => b.length - a.length) : undefined
        // altrucoder_change end
        const sessions: Session.GlobalInfo[] = []
        for await (const session of Session.listGlobal({
          projectID, // altrucoder_change
          directory: query.worktrees ? undefined : query.directory, // altrucoder_change - ignore SDK-injected directory when listing across worktrees
          directories, // altrucoder_change
          roots: queryBoolean(query.roots),
          start: query.start,
          cursor: query.cursor,
          search: query.search,
          limit: limit + 1,
          archived: queryBoolean(query.archived),
        })) {
          // altrucoder_change start - resolve worktree folder name for each session
          if (sorted) {
            const root = sorted.find((d) => Filesystem.contains(d, session.directory))
            sessions.push({ ...session, worktreeName: path.basename(root ?? session.directory) })
            continue
          }
          // altrucoder_change end
          sessions.push(session)
        }
        const hasMore = sessions.length > limit
        const list = hasMore ? sessions.slice(0, limit) : sessions
        if (hasMore && list.length > 0) {
          c.header("x-next-cursor", String(list[list.length - 1].time.updated))
        }
        return c.json(list)
      },
    )
    // altrucoder_change start - process RPC API
    .get(
      "/process",
      describeRoute({
        summary: "List background processes",
        description: "List retained background processes created through the experimental process API.",
        operationId: "experimental.process.list",
        responses: {
          200: {
            description: "Background processes",
            content: {
              "application/json": {
                schema: resolver(z.array(ProcessInfo)),
              },
            },
          },
        },
      }),
      validator("query", ProcessQuery),
      async (c) => {
        const query = c.req.valid("query")
        return c.json(ProcessRpc.list(ProcessRpc.session(query.sessionID)))
      },
    )
    .post(
      "/process",
      describeRoute({
        summary: "Start background process",
        description: "Start a shell command as a retained background process and return its stable process ID.",
        operationId: "experimental.process.start",
        responses: {
          200: {
            description: "Background process",
            content: {
              "application/json": {
                schema: resolver(ProcessInfo),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", ProcessStartBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(
            await runRequest(
              "ExperimentalRoutes.process.start",
              c,
              Effect.gen(function* () {
                const config = yield* Config.Service
                const state = yield* InstanceState.context
                const cfg = yield* config.get()
                return ProcessRpc.start({
                  ...body,
                  cwd: ProcessRpc.directory(state.directory, body.cwd),
                  shell: ProcessRpc.shell(body.shell, cfg.shell),
                  sessionID: SessionID.make(body.sessionID),
                  messageID: body.messageID ? MessageID.make(body.messageID) : undefined,
                })
              }),
            ),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/process/clean",
      describeRoute({
        summary: "Clean background processes",
        description: "Stop and remove retained background processes, optionally scoped to a session.",
        operationId: "experimental.process.clean",
        responses: {
          200: {
            description: "Background processes",
            content: {
              "application/json": {
                schema: resolver(z.array(ProcessInfo)),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("json", ProcessBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(await ProcessRpc.clean(ProcessRpc.session(body.sessionID)))
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .get(
      "/process/:processID",
      describeRoute({
        summary: "Read background process",
        description: "Read retained status and truncated output for one background process.",
        operationId: "experimental.process.read",
        responses: {
          200: {
            description: "Background process",
            content: {
              "application/json": {
                schema: resolver(ProcessInfo),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("query", ProcessQuery),
      async (c) => {
        const query = c.req.valid("query")
        try {
          return c.json(ProcessRpc.read(c.req.param("processID"), ProcessRpc.session(query.sessionID)))
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .get(
      "/process/:processID/output",
      describeRoute({
        summary: "Read background process output",
        description: "Poll incremental output for one background process using an offset cursor.",
        operationId: "experimental.process.output",
        responses: {
          200: {
            description: "Background process output",
            content: {
              "application/json": {
                schema: resolver(ProcessOutput),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("query", ProcessOutputQuery),
      async (c) => {
        const query = c.req.valid("query")
        try {
          return c.json(
            ProcessRpc.poll(c.req.param("processID"), query.offset ?? 0, ProcessRpc.session(query.sessionID)),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/process/:processID/write",
      describeRoute({
        summary: "Write to background process",
        description: "Send stdin text to one running background process.",
        operationId: "experimental.process.write",
        responses: {
          200: {
            description: "Background process",
            content: {
              "application/json": {
                schema: resolver(ProcessInfo),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("json", ProcessWriteBody),
      async (c) => {
        const body = c.req.valid("json")
        const text = body.newline ? `${body.input}\n` : body.input
        try {
          return c.json(await ProcessRpc.write(c.req.param("processID"), text, ProcessRpc.session(body.sessionID)))
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/process/:processID/stop",
      describeRoute({
        summary: "Stop background process",
        description: "Terminate one running background process.",
        operationId: "experimental.process.stop",
        responses: {
          200: {
            description: "Background process",
            content: {
              "application/json": {
                schema: resolver(ProcessInfo),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("json", ProcessBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(await ProcessRpc.stop(c.req.param("processID"), ProcessRpc.session(body.sessionID)))
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    // altrucoder_change end
    // altrucoder_change start - app-server JSON-RPC compatibility layer
    .get(
      "/app-server/capabilities",
      describeRoute({
        summary: "Get app-server capabilities",
        description: "Return the experimental app-server protocol version, methods, and supported feature flags.",
        operationId: "experimental.appServer.capabilities",
        responses: {
          200: {
            description: "App-server capabilities",
            content: {
              "application/json": {
                schema: resolver(AppServerCapabilities),
              },
            },
          },
        },
      }),
      (c) => c.json(AppServerProtocol.capabilities()),
    )
    .post(
      "/app-server/rpc",
      describeRoute({
        summary: "Call app-server JSON-RPC method",
        description:
          "Call an experimental app-server JSON-RPC method such as initialize, thread/start, thread/resume, or thread/list.",
        operationId: "experimental.appServer.rpc",
        responses: {
          200: {
            description: "App-server JSON-RPC response",
            content: {
              "application/json": {
                schema: resolver(AppServerRpcResponse),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", AppServerRpcBody),
      async (c) => {
        const request = c.req.valid("json") as AppServerProtocol.Request
        const fx = Effect.gen(function* () {
          switch (request.method) {
            case "initialize":
              return AppServerProtocol.ok(request, AppServerProtocol.capabilities())

            case "initialized":
              return AppServerProtocol.ok(request, { ok: true })

            case "thread/start": {
              const params = AppServerProtocol.params(request.params)
              const title = AppServerProtocol.optionalText(params, "title")
              const sessions = yield* Session.Service
              const session = yield* sessions.create(title ? { title } : undefined)
              return AppServerProtocol.ok(request, { session: AppServerProtocol.thread(session) })
            }

            case "thread/resume": {
              const params = AppServerProtocol.params(request.params)
              const sessionID = SessionID.make(AppServerProtocol.text(params, "sessionID"))
              const sessions = yield* Session.Service
              const status = yield* SessionStatus.Service
              const summary = yield* SessionSummary.Service
              const todos = yield* Todo.Service
              const session = yield* sessions.get(sessionID)
              const page = MessageV2.page({
                sessionID,
                limit: AppServerProtocol.optionalNumber(params, "limit") ?? 100,
                before: AppServerProtocol.optionalText(params, "before"),
              })
              const [state, todo, diff, usage] = yield* Effect.all(
                [
                  status.get(sessionID),
                  todos.get(sessionID),
                  AppServerProtocol.optionalBoolean(params, "diff") ? summary.diff({ sessionID }) : Effect.succeed([]),
                  Effect.sync(() => ThreadResume.usage(sessionID)),
                ],
                { concurrency: "unbounded" },
              )
              return AppServerProtocol.ok(
                request,
                AppServerProtocol.payload({
                  session,
                  status: state,
                  messages: page.items,
                  todos: todo,
                  diff,
                  usage,
                  recovery: {
                    resumable: true,
                    returnedMessages: page.items.length,
                    truncated: page.more,
                    ...(page.cursor ? { nextCursor: page.cursor } : {}),
                    ...ThreadResume.last(page.items),
                  },
                }),
              )
            }

            case "thread/list": {
              const params = AppServerProtocol.params(request.params)
              const limit = AppServerProtocol.optionalNumber(params, "limit") ?? 100
              const directory = AppServerProtocol.optionalText(params, "directory")
              return AppServerProtocol.ok(request, { sessions: Array.from(Session.listGlobal({ directory, limit })) })
            }

            case "process/list": {
              const params = AppServerProtocol.params(request.params)
              return AppServerProtocol.ok(request, {
                processes: ProcessRpc.list(ProcessRpc.session(AppServerProtocol.optionalText(params, "sessionID"))),
              })
            }

            case "filesystem/stat": {
              const state = yield* InstanceState.context
              const params = AppServerProtocol.params(request.params)
              return AppServerProtocol.ok(
                request,
                yield* Effect.promise(() => FilesystemRpc.stat(state, AppServerProtocol.text(params, "path"))),
              )
            }

            default:
              return AppServerProtocol.fail(request, -32601, `Method not found: ${request.method}`)
          }
        }).pipe(
          Effect.catch((err: unknown) =>
            Effect.succeed(AppServerProtocol.fail(request, -32602, err instanceof Error ? err.message : String(err))),
          ),
          Effect.catchDefect((err) =>
            Effect.succeed(AppServerProtocol.fail(request, -32603, err instanceof Error ? err.message : String(err))),
          ),
        )
        return c.json(await runRequest("ExperimentalRoutes.appServer.rpc", c, fx))
      },
    )
    // altrucoder_change end
    // altrucoder_change start - thread-scoped realtime SSE for app-server style clients
    .get(
      "/thread/:sessionID/subscribe",
      describeRoute({
        summary: "Subscribe to realtime thread events",
        description:
          "Stream server-sent events for one thread, including sync updates, message deltas, approvals, questions, status changes, and background process output.",
        operationId: "experimental.thread.subscribe",
        responses: {
          200: {
            description: "Thread event stream",
            content: {
              "text/event-stream": {
                schema: resolver(
                  z
                    .object({
                      sessionID: z.string(),
                      directory: z.string().optional(),
                      project: z.string().optional(),
                      workspace: z.string().optional(),
                      payload: z.unknown(),
                    })
                    .meta({ ref: "ThreadRealtimeEvent" }),
                ),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      async (c) => {
        const sessionID = c.req.param("sessionID")
        c.header("Cache-Control", ThreadRealtime.headers["Cache-Control"])
        c.header("X-Accel-Buffering", ThreadRealtime.headers["X-Accel-Buffering"])
        c.header("X-Content-Type-Options", ThreadRealtime.headers["X-Content-Type-Options"])
        return threadStream(c, sessionID)
      },
    )
    // altrucoder_change end
    // altrucoder_change start - thread resume payload for app-server style clients
    .get(
      "/thread/:sessionID/resume",
      describeRoute({
        summary: "Get thread resume payload",
        description:
          "Return a compact reconnect payload with session metadata, recent messages, status, todos, optional diff, and restored usage totals.",
        operationId: "experimental.thread.resume",
        responses: {
          200: {
            description: "Thread resume payload",
            content: {
              "application/json": {
                schema: resolver(ThreadResumeResponse),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("query", ThreadResumeQuery),
      async (c) =>
        jsonRequest("ExperimentalRoutes.thread.resume", c, function* () {
          const query = c.req.valid("query")
          const sessionID = SessionID.make(c.req.param("sessionID"))
          const sessions = yield* Session.Service
          const status = yield* SessionStatus.Service
          const summary = yield* SessionSummary.Service
          const todos = yield* Todo.Service
          const session = yield* sessions.get(sessionID)
          const page = MessageV2.page({
            sessionID,
            limit: query.limit ?? 100,
            before: query.before,
          })
          const [state, todo, diff, usage] = yield* Effect.all(
            [
              status.get(sessionID),
              todos.get(sessionID),
              queryBoolean(query.diff) ? summary.diff({ sessionID }) : Effect.succeed([]),
              Effect.sync(() => ThreadResume.usage(sessionID)),
            ],
            { concurrency: "unbounded" },
          )

          return {
            session,
            status: state,
            messages: page.items,
            todos: todo,
            diff,
            usage,
            recovery: {
              resumable: true,
              returnedMessages: page.items.length,
              truncated: page.more,
              ...(page.cursor ? { nextCursor: page.cursor } : {}),
              ...ThreadResume.last(page.items),
            },
          }
        }),
    )
    // altrucoder_change end
    // altrucoder_change start - workspace-scoped filesystem RPC API
    .get(
      "/filesystem/stat",
      describeRoute({
        summary: "Stat filesystem path",
        description: "Return workspace-scoped file or directory metadata without reading content.",
        operationId: "experimental.filesystem.stat",
        responses: {
          200: {
            description: "Filesystem path status",
            content: {
              "application/json": {
                schema: resolver(FilesystemStat),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("query", FilesystemPathQuery),
      async (c) => {
        const query = c.req.valid("query")
        try {
          return c.json(
            await runRequest(
              "ExperimentalRoutes.filesystem.stat",
              c,
              Effect.gen(function* () {
                const state = yield* InstanceState.context
                return yield* Effect.promise(() => FilesystemRpc.stat(state, query.path))
              }),
            ),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .get(
      "/filesystem/read",
      describeRoute({
        summary: "Read filesystem file",
        description: "Read a workspace-scoped file as utf8 text or base64 content.",
        operationId: "experimental.filesystem.read",
        responses: {
          200: {
            description: "Filesystem file content",
            content: {
              "application/json": {
                schema: resolver(FilesystemRead),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("query", FilesystemReadQuery),
      async (c) => {
        const query = c.req.valid("query")
        try {
          return c.json(
            await runRequest(
              "ExperimentalRoutes.filesystem.read",
              c,
              Effect.gen(function* () {
                const state = yield* InstanceState.context
                return yield* Effect.promise(() => FilesystemRpc.read(state, query.path, query.encoding))
              }),
            ),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/filesystem/write",
      describeRoute({
        summary: "Write filesystem file",
        description: "Write a workspace-scoped file, optionally creating parent directories.",
        operationId: "experimental.filesystem.write",
        responses: {
          200: {
            description: "Written filesystem path",
            content: {
              "application/json": {
                schema: resolver(FilesystemStat),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", FilesystemWriteBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(
            await runRequest(
              "ExperimentalRoutes.filesystem.write",
              c,
              Effect.gen(function* () {
                const state = yield* InstanceState.context
                const bus = yield* Bus.Service
                const before = yield* Effect.promise(() => FilesystemRpc.stat(state, body.path))
                const result = yield* Effect.promise(() => FilesystemRpc.write(state, body))
                if (!before.exists) {
                  yield* bus.publish(File.Event.Edited, { file: result.absolute })
                  yield* bus.publish(FileWatcher.Event.Updated, { file: result.absolute, event: "add" })
                  return result
                }
                yield* bus.publish(File.Event.Edited, { file: result.absolute })
                yield* bus.publish(FileWatcher.Event.Updated, { file: result.absolute, event: "change" })
                return result
              }),
            ),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/filesystem/mkdir",
      describeRoute({
        summary: "Create filesystem directory",
        description: "Create a workspace-scoped directory.",
        operationId: "experimental.filesystem.mkdir",
        responses: {
          200: {
            description: "Created filesystem directory",
            content: {
              "application/json": {
                schema: resolver(FilesystemStat),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", FilesystemMkdirBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(
            await runRequest(
              "ExperimentalRoutes.filesystem.mkdir",
              c,
              Effect.gen(function* () {
                const state = yield* InstanceState.context
                const bus = yield* Bus.Service
                const before = yield* Effect.promise(() => FilesystemRpc.stat(state, body.path))
                const result = yield* Effect.promise(() => FilesystemRpc.mkdirp(state, body))
                yield* bus.publish(FileWatcher.Event.Updated, {
                  file: result.absolute,
                  event: before.exists ? "change" : "add",
                })
                return result
              }),
            ),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/filesystem/remove",
      describeRoute({
        summary: "Remove filesystem path",
        description: "Remove a workspace-scoped file or, with recursive enabled, a directory.",
        operationId: "experimental.filesystem.remove",
        responses: {
          200: {
            description: "Removed filesystem path",
            content: {
              "application/json": {
                schema: resolver(FilesystemRemoved),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("json", FilesystemRemoveBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(
            await runRequest(
              "ExperimentalRoutes.filesystem.remove",
              c,
              Effect.gen(function* () {
                const state = yield* InstanceState.context
                const bus = yield* Bus.Service
                const before = yield* Effect.promise(() => FilesystemRpc.stat(state, body.path))
                const result = yield* Effect.promise(() => FilesystemRpc.remove(state, body))
                yield* bus.publish(FileWatcher.Event.Updated, { file: before.absolute, event: "unlink" })
                return result
              }),
            ),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/filesystem/rename",
      describeRoute({
        summary: "Rename filesystem path",
        description: "Rename or move a workspace-scoped file or directory.",
        operationId: "experimental.filesystem.rename",
        responses: {
          200: {
            description: "Renamed filesystem path",
            content: {
              "application/json": {
                schema: resolver(FilesystemStat),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("json", FilesystemRenameBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(
            await runRequest(
              "ExperimentalRoutes.filesystem.rename",
              c,
              Effect.gen(function* () {
                const state = yield* InstanceState.context
                const bus = yield* Bus.Service
                const from = yield* Effect.promise(() => FilesystemRpc.stat(state, body.from))
                const to = yield* Effect.promise(() => FilesystemRpc.stat(state, body.to))
                const result = yield* Effect.promise(() => FilesystemRpc.move(state, body))
                yield* bus.publish(FileWatcher.Event.Updated, { file: from.absolute, event: "unlink" })
                yield* bus.publish(File.Event.Edited, { file: result.absolute })
                yield* bus.publish(FileWatcher.Event.Updated, {
                  file: result.absolute,
                  event: to.exists ? "change" : "add",
                })
                return result
              }),
            ),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .get(
      "/filesystem/list",
      describeRoute({
        summary: "List filesystem directory",
        description: "List workspace-scoped directory entries.",
        operationId: "experimental.filesystem.list",
        responses: {
          200: {
            description: "Filesystem directory entries",
            content: {
              "application/json": {
                schema: resolver(z.array(FilesystemEntry)),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("query", FilesystemPathQuery),
      async (c) => {
        const query = c.req.valid("query")
        try {
          return c.json(
            await runRequest(
              "ExperimentalRoutes.filesystem.list",
              c,
              Effect.gen(function* () {
                const state = yield* InstanceState.context
                return yield* Effect.promise(() => FilesystemRpc.list(state, query.path))
              }),
            ),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    // altrucoder_change end
    // altrucoder_change start - background terminal process API
    .get(
      "/terminal",
      describeRoute({
        summary: "List background terminal jobs",
        description: "List retained background terminal jobs started by Bash background mode.",
        operationId: "experimental.terminal.list",
        responses: {
          200: {
            description: "Background terminal jobs",
            content: {
              "application/json": {
                schema: resolver(z.array(TerminalJob)),
              },
            },
          },
        },
      }),
      validator("query", TerminalQuery),
      async (c) => {
        const query = c.req.valid("query")
        return c.json(BashBackground.list(TerminalLimits, terminalSession(query.sessionID)))
      },
    )
    .post(
      "/terminal/clean",
      describeRoute({
        summary: "Clean background terminal jobs",
        description: "Stop and remove retained background terminal jobs, optionally scoped to a session.",
        operationId: "experimental.terminal.clean",
        responses: {
          200: {
            description: "Background terminal jobs",
            content: {
              "application/json": {
                schema: resolver(z.array(TerminalJob)),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("json", TerminalBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(await BashBackground.clean(TerminalLimits, terminalSession(body.sessionID)))
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .get(
      "/terminal/:jobID",
      describeRoute({
        summary: "Read background terminal job",
        description: "Read retained output and status for one background terminal job.",
        operationId: "experimental.terminal.read",
        responses: {
          200: {
            description: "Background terminal job",
            content: {
              "application/json": {
                schema: resolver(TerminalJob),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("query", TerminalQuery),
      async (c) => {
        const query = c.req.valid("query")
        try {
          return c.json(BashBackground.read(c.req.param("jobID"), TerminalLimits, terminalSession(query.sessionID)))
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/terminal/:jobID/write",
      describeRoute({
        summary: "Write to background terminal job",
        description: "Send text to the stdin stream of one running background terminal job.",
        operationId: "experimental.terminal.write",
        responses: {
          200: {
            description: "Background terminal job",
            content: {
              "application/json": {
                schema: resolver(TerminalJob),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("json", TerminalWriteBody),
      async (c) => {
        const body = c.req.valid("json")
        const text = body.newline ? `${body.input}\n` : body.input
        try {
          return c.json(
            await BashBackground.write(c.req.param("jobID"), text, TerminalLimits, terminalSession(body.sessionID)),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    .post(
      "/terminal/:jobID/stop",
      describeRoute({
        summary: "Stop background terminal job",
        description: "Terminate one running background terminal job.",
        operationId: "experimental.terminal.stop",
        responses: {
          200: {
            description: "Background terminal job",
            content: {
              "application/json": {
                schema: resolver(TerminalJob),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator("json", TerminalBody),
      async (c) => {
        const body = c.req.valid("json")
        try {
          return c.json(
            await BashBackground.stop(c.req.param("jobID"), TerminalLimits, terminalSession(body.sessionID)),
          )
        } catch (err) {
          return c.json(terminalError(err), 400)
        }
      },
    )
    // altrucoder_change end
    .get(
      "/resource",
      describeRoute({
        summary: "Get MCP resources",
        description: "Get all available MCP resources from connected servers. Optionally filter by name.",
        operationId: "experimental.resource.list",
        responses: {
          200: {
            description: "MCP resources",
            content: {
              "application/json": {
                schema: resolver(z.record(z.string(), MCP.Resource.zod)),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("ExperimentalRoutes.resource.list", c, function* () {
          const mcp = yield* MCP.Service
          return yield* mcp.resources()
        }),
    ),
)
