import { AccountID, OrgID } from "@/account/schema"
import { MCP } from "@/mcp"
import { ProviderID, ModelID } from "@/provider/schema"
import { MessageV2 } from "@/session/message-v2" // altrucoder_change
import { Session } from "@/session/session"
import { SessionStatus } from "@/session/status" // altrucoder_change
import { MessageID, SessionID } from "@/session/schema" // altrucoder_change
import { Snapshot } from "@/snapshot" // altrucoder_change
import { Todo } from "@/session/todo" // altrucoder_change
import { Worktree } from "@/worktree"
import { NonNegativeInt } from "@/util/schema"
import { Schema, SchemaGetter } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import { WorkspaceRoutingMiddleware } from "../middleware/workspace-routing"
import { ExperimentalApiMiddleware } from "../middleware/experimental-api" // altrucoder_change
import { described } from "./metadata"

const ConsoleStateResponse = Schema.Struct({
  consoleManagedProviders: Schema.mutable(Schema.Array(Schema.String)),
  activeOrgName: Schema.optionalKey(Schema.String),
  switchableOrgCount: NonNegativeInt,
}).annotate({ identifier: "ConsoleState" })

const ConsoleOrgOption = Schema.Struct({
  accountID: Schema.String,
  accountEmail: Schema.String,
  accountUrl: Schema.String,
  orgID: Schema.String,
  orgName: Schema.String,
  active: Schema.Boolean,
})

const ConsoleOrgList = Schema.Struct({
  orgs: Schema.Array(ConsoleOrgOption),
})

export const ConsoleSwitchPayload = Schema.Struct({
  accountID: AccountID,
  orgID: OrgID,
})

const ToolIDs = Schema.Array(Schema.String).annotate({ identifier: "ToolIDs" })
const ToolListItem = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  parameters: Schema.Unknown,
}).annotate({ identifier: "ToolListItem" })
const ToolList = Schema.Array(ToolListItem).annotate({ identifier: "ToolList" })
export const ToolListQuery = Schema.Struct({
  provider: ProviderID,
  model: ModelID,
})

const QueryBoolean = Schema.Literals(["true", "false"]).pipe(
  Schema.decodeTo(Schema.Boolean, {
    decode: SchemaGetter.transform((value) => value === "true"),
    encode: SchemaGetter.transform((value) => (value ? "true" : "false")),
  }),
)
const WorktreeList = Schema.Array(Schema.String)
export const SessionListQuery = Schema.Struct({
  directory: Schema.optional(Schema.String),
  roots: Schema.optional(QueryBoolean),
  start: Schema.optional(Schema.NumberFromString),
  cursor: Schema.optional(Schema.NumberFromString),
  search: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.NumberFromString),
  archived: Schema.optional(QueryBoolean),
})

// altrucoder_change start
export const TerminalQuery = Schema.Struct({
  sessionID: Schema.optional(SessionID),
})
export const TerminalBody = Schema.Struct({
  sessionID: Schema.optional(SessionID),
})
export const TerminalWriteBody = Schema.Struct({
  sessionID: Schema.optional(SessionID),
  input: Schema.String,
  newline: Schema.optional(Schema.Boolean),
})
export const TerminalParams = Schema.Struct({
  jobID: Schema.String,
})
const TerminalJob = Schema.Struct({
  id: Schema.String,
  command: Schema.String,
  cwd: Schema.String,
  sessionID: SessionID,
  messageID: MessageID,
  callID: Schema.optional(Schema.String),
  pid: Schema.optional(Schema.Number),
  started: Schema.Number,
  updated: Schema.Number,
  status: Schema.String,
  running: Schema.Boolean,
  exit: Schema.NullOr(Schema.Number),
  error: Schema.optional(Schema.String),
  stopped: Schema.optional(Schema.Boolean),
  truncated: Schema.Boolean,
  output: Schema.String,
}).annotate({ identifier: "TerminalJob" })
export const ProcessQuery = Schema.Struct({
  sessionID: Schema.optional(SessionID),
})
export const ProcessOutputQuery = Schema.Struct({
  sessionID: Schema.optional(SessionID),
  offset: Schema.optional(Schema.NumberFromString),
})
export const ProcessStartBody = Schema.Struct({
  sessionID: SessionID,
  command: Schema.String,
  cwd: Schema.optional(Schema.String),
  shell: Schema.optional(Schema.String),
  env: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  messageID: Schema.optional(MessageID),
  callID: Schema.optional(Schema.String),
})
export const ProcessBody = Schema.Struct({
  sessionID: Schema.optional(SessionID),
})
export const ProcessWriteBody = Schema.Struct({
  sessionID: Schema.optional(SessionID),
  input: Schema.String,
  newline: Schema.optional(Schema.Boolean),
})
export const ProcessParams = Schema.Struct({
  processID: Schema.String,
})
const AppServerJsonRpcID = Schema.NullOr(Schema.Union([Schema.String, Schema.Number]))
export const AppServerRpcBody = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.optional(AppServerJsonRpcID),
  method: Schema.String,
  params: Schema.optional(Schema.Unknown),
})
const AppServerRpcError = Schema.Struct({
  code: Schema.Number,
  message: Schema.String,
  data: Schema.optional(Schema.Unknown),
}).annotate({ identifier: "AppServerRpcError" })
const AppServerRpcResponse = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: AppServerJsonRpcID,
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(AppServerRpcError),
}).annotate({ identifier: "AppServerRpcResponse" })
const AppServerCapabilities = Schema.Struct({
  protocolVersion: Schema.String,
  server: Schema.Struct({
    name: Schema.String,
    version: Schema.String,
  }),
  methods: Schema.Array(Schema.String),
  features: Schema.Record(Schema.String, Schema.Boolean),
}).annotate({ identifier: "AppServerCapabilities" })
export const ThreadResumeParams = Schema.Struct({
  sessionID: SessionID,
})
export const ThreadResumeQuery = Schema.Struct({
  limit: Schema.optional(Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))),
  before: Schema.optional(Schema.String),
  diff: Schema.optional(QueryBoolean),
})
const ProcessInfo = Schema.Struct({
  processID: Schema.String,
  id: Schema.String,
  command: Schema.String,
  cwd: Schema.String,
  sessionID: SessionID,
  messageID: MessageID,
  callID: Schema.optional(Schema.String),
  pid: Schema.optional(Schema.Number),
  started: Schema.Number,
  updated: Schema.Number,
  status: Schema.String,
  running: Schema.Boolean,
  exit: Schema.NullOr(Schema.Number),
  error: Schema.optional(Schema.String),
  stopped: Schema.optional(Schema.Boolean),
  truncated: Schema.Boolean,
  output: Schema.String,
}).annotate({ identifier: "ProcessInfo" })
const ProcessOutput = Schema.Struct({
  processID: Schema.String,
  id: Schema.String,
  offset: Schema.Number,
  nextOffset: Schema.Number,
  output: Schema.String,
  truncated: Schema.Boolean,
  running: Schema.Boolean,
  exit: Schema.NullOr(Schema.Number),
  status: Schema.String,
  error: Schema.optional(Schema.String),
}).annotate({ identifier: "ProcessOutput" })
export const FilesystemPathQuery = Schema.Struct({
  path: Schema.String,
})
export const FilesystemReadQuery = Schema.Struct({
  path: Schema.String,
  encoding: Schema.optional(Schema.Literals(["utf8", "base64"])),
})
export const FilesystemWriteBody = Schema.Struct({
  path: Schema.String,
  content: Schema.String,
  encoding: Schema.optional(Schema.Literals(["utf8", "base64"])),
  createDirs: Schema.optional(Schema.Boolean),
})
export const FilesystemMkdirBody = Schema.Struct({
  path: Schema.String,
  recursive: Schema.optional(Schema.Boolean),
})
export const FilesystemRemoveBody = Schema.Struct({
  path: Schema.String,
  recursive: Schema.optional(Schema.Boolean),
})
export const FilesystemRenameBody = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  overwrite: Schema.optional(Schema.Boolean),
})
const FilesystemStat = Schema.Struct({
  path: Schema.String,
  absolute: Schema.String,
  type: Schema.Literals(["file", "directory", "missing"]),
  exists: Schema.Boolean,
  size: Schema.optional(Schema.Number),
  mtime: Schema.optional(Schema.Number),
}).annotate({ identifier: "FilesystemStat" })
const FilesystemRead = Schema.Struct({
  path: Schema.String,
  absolute: Schema.String,
  type: Schema.Literal("file"),
  exists: Schema.Literal(true),
  size: Schema.optional(Schema.Number),
  mtime: Schema.optional(Schema.Number),
  content: Schema.String,
  encoding: Schema.Literals(["utf8", "base64"]),
}).annotate({ identifier: "FilesystemRead" })
const FilesystemRemoved = Schema.Struct({
  path: Schema.String,
  absolute: Schema.String,
  removed: Schema.Boolean,
}).annotate({ identifier: "FilesystemRemoved" })
const FilesystemEntry = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  absolute: Schema.String,
  type: Schema.Literals(["file", "directory"]),
}).annotate({ identifier: "FilesystemEntry" })
const ThreadUsage = Schema.Struct({
  cost: Schema.Finite,
  tokens: Schema.Struct({
    input: NonNegativeInt,
    output: NonNegativeInt,
    reasoning: NonNegativeInt,
    total: NonNegativeInt,
    cache: Schema.Struct({
      read: NonNegativeInt,
      write: NonNegativeInt,
    }),
  }),
}).annotate({ identifier: "ThreadUsage" })
const ThreadRecovery = Schema.Struct({
  resumable: Schema.Boolean,
  returnedMessages: NonNegativeInt,
  truncated: Schema.Boolean,
  nextCursor: Schema.optional(Schema.String),
  lastMessageID: Schema.optional(MessageID),
  lastUserMessageID: Schema.optional(MessageID),
  lastAssistantMessageID: Schema.optional(MessageID),
}).annotate({ identifier: "ThreadRecovery" })
const ThreadResume = Schema.Struct({
  session: Session.Info,
  status: SessionStatus.Info,
  messages: Schema.Array(MessageV2.WithParts),
  todos: Schema.Array(Todo.Info),
  diff: Schema.Array(Snapshot.FileDiff),
  usage: ThreadUsage,
  recovery: ThreadRecovery,
}).annotate({ identifier: "ThreadResume" })
// altrucoder_change end

export const ExperimentalPaths = {
  console: "/experimental/console",
  consoleOrgs: "/experimental/console/orgs",
  consoleSwitch: "/experimental/console/switch",
  tool: "/experimental/tool",
  toolIDs: "/experimental/tool/ids",
  worktree: "/experimental/worktree",
  worktreeReset: "/experimental/worktree/reset",
  session: "/experimental/session",
  resource: "/experimental/resource",
  process: "/experimental/process", // altrucoder_change
  processClean: "/experimental/process/clean", // altrucoder_change
  processRead: "/experimental/process/:processID", // altrucoder_change
  processOutput: "/experimental/process/:processID/output", // altrucoder_change
  processWrite: "/experimental/process/:processID/write", // altrucoder_change
  processStop: "/experimental/process/:processID/stop", // altrucoder_change
  appServerCapabilities: "/experimental/app-server/capabilities", // altrucoder_change
  appServerRpc: "/experimental/app-server/rpc", // altrucoder_change
  threadResume: "/experimental/thread/:sessionID/resume", // altrucoder_change
  threadSubscribe: "/experimental/thread/:sessionID/subscribe", // altrucoder_change
  filesystemStat: "/experimental/filesystem/stat", // altrucoder_change
  filesystemRead: "/experimental/filesystem/read", // altrucoder_change
  filesystemWrite: "/experimental/filesystem/write", // altrucoder_change
  filesystemMkdir: "/experimental/filesystem/mkdir", // altrucoder_change
  filesystemRemove: "/experimental/filesystem/remove", // altrucoder_change
  filesystemRename: "/experimental/filesystem/rename", // altrucoder_change
  filesystemList: "/experimental/filesystem/list", // altrucoder_change
  terminal: "/experimental/terminal", // altrucoder_change
  terminalClean: "/experimental/terminal/clean", // altrucoder_change
  terminalRead: "/experimental/terminal/:jobID", // altrucoder_change
  terminalWrite: "/experimental/terminal/:jobID/write", // altrucoder_change
  terminalStop: "/experimental/terminal/:jobID/stop", // altrucoder_change
} as const

export const ExperimentalApi = HttpApi.make("experimental")
  .add(
    HttpApiGroup.make("experimental")
      .add(
        HttpApiEndpoint.get("console", ExperimentalPaths.console, {
          success: described(ConsoleStateResponse, "Active Console provider metadata"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.get",
            summary: "Get active Console provider metadata",
            description: "Get the active Console org name and the set of provider IDs managed by that Console org.",
          }),
        ),
        HttpApiEndpoint.get("consoleOrgs", ExperimentalPaths.consoleOrgs, {
          success: described(ConsoleOrgList, "Switchable Console orgs"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.listOrgs",
            summary: "List switchable Console orgs",
            description: "Get the available Console orgs across logged-in accounts, including the current active org.",
          }),
        ),
        HttpApiEndpoint.post("consoleSwitch", ExperimentalPaths.consoleSwitch, {
          payload: ConsoleSwitchPayload,
          success: described(Schema.Boolean, "Switch success"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.console.switchOrg",
            summary: "Switch active Console org",
            description: "Persist a new active Console account/org selection for the current local OpenCode state.",
          }),
        ),
        HttpApiEndpoint.get("tool", ExperimentalPaths.tool, {
          query: ToolListQuery,
          success: described(ToolList, "Tools"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tool.list",
            summary: "List tools",
            description:
              "Get a list of available tools with their JSON schema parameters for a specific provider and model combination.",
          }),
        ),
        HttpApiEndpoint.get("toolIDs", ExperimentalPaths.toolIDs, {
          success: described(ToolIDs, "Tool IDs"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tool.ids",
            summary: "List tool IDs",
            description:
              "Get a list of all available tool IDs, including both built-in tools and dynamically registered tools.",
          }),
        ),
        HttpApiEndpoint.get("worktree", ExperimentalPaths.worktree, {
          success: described(WorktreeList, "List of worktree directories"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "worktree.list",
            summary: "List worktrees",
            description: "List all sandbox worktrees for the current project.",
          }),
        ),
        HttpApiEndpoint.post("worktreeCreate", ExperimentalPaths.worktree, {
          payload: Schema.optional(Worktree.CreateInput),
          success: described(Worktree.Info, "Worktree created"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "worktree.create",
            summary: "Create worktree",
            description: "Create a new git worktree for the current project and run any configured startup scripts.",
          }),
        ),
        HttpApiEndpoint.delete("worktreeRemove", ExperimentalPaths.worktree, {
          payload: Worktree.RemoveInput,
          success: described(Schema.Boolean, "Worktree removed"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "worktree.remove",
            summary: "Remove worktree",
            description: "Remove a git worktree and delete its branch.",
          }),
        ),
        HttpApiEndpoint.post("worktreeReset", ExperimentalPaths.worktreeReset, {
          payload: Worktree.ResetInput,
          success: described(Schema.Boolean, "Worktree reset"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "worktree.reset",
            summary: "Reset worktree",
            description: "Reset a worktree branch to the primary default branch.",
          }),
        ),
        HttpApiEndpoint.get("session", ExperimentalPaths.session, {
          query: SessionListQuery,
          success: described(Schema.Array(Session.GlobalInfo), "List of sessions"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.session.list",
            summary: "List sessions",
            description:
              "Get a list of all OpenCode sessions across projects, sorted by most recently updated. Archived sessions are excluded by default.",
          }),
        ),
        HttpApiEndpoint.get("resource", ExperimentalPaths.resource, {
          success: described(Schema.Record(Schema.String, MCP.Resource), "MCP resources"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.resource.list",
            summary: "Get MCP resources",
            description: "Get all available MCP resources from connected servers. Optionally filter by name.",
          }),
        ),
        // altrucoder_change start
        HttpApiEndpoint.get("process", ExperimentalPaths.process, {
          query: ProcessQuery,
          success: described(Schema.Array(ProcessInfo), "Background processes"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.process.list",
            summary: "List background processes",
            description: "List retained background processes created through the experimental process API.",
          }),
        ),
        HttpApiEndpoint.post("processStart", ExperimentalPaths.process, {
          payload: ProcessStartBody,
          success: described(ProcessInfo, "Background process"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.process.start",
            summary: "Start background process",
            description: "Start a shell command as a retained background process and return its stable process ID.",
          }),
        ),
        HttpApiEndpoint.post("processClean", ExperimentalPaths.processClean, {
          payload: ProcessBody,
          success: described(Schema.Array(ProcessInfo), "Background processes"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.process.clean",
            summary: "Clean background processes",
            description: "Stop and remove retained background processes, optionally scoped to a session.",
          }),
        ),
        HttpApiEndpoint.get("processRead", ExperimentalPaths.processRead, {
          params: ProcessParams,
          query: ProcessQuery,
          success: described(ProcessInfo, "Background process"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.process.read",
            summary: "Read background process",
            description: "Read retained status and truncated output for one background process.",
          }),
        ),
        HttpApiEndpoint.get("processOutput", ExperimentalPaths.processOutput, {
          params: ProcessParams,
          query: ProcessOutputQuery,
          success: described(ProcessOutput, "Background process output"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.process.output",
            summary: "Read background process output",
            description: "Poll incremental output for one background process using an offset cursor.",
          }),
        ),
        HttpApiEndpoint.post("processWrite", ExperimentalPaths.processWrite, {
          params: ProcessParams,
          payload: ProcessWriteBody,
          success: described(ProcessInfo, "Background process"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.process.write",
            summary: "Write to background process",
            description: "Send stdin text to one running background process.",
          }),
        ),
        HttpApiEndpoint.post("processStop", ExperimentalPaths.processStop, {
          params: ProcessParams,
          payload: ProcessBody,
          success: described(ProcessInfo, "Background process"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.process.stop",
            summary: "Stop background process",
            description: "Terminate one running background process.",
          }),
        ),
        HttpApiEndpoint.get("appServerCapabilities", ExperimentalPaths.appServerCapabilities, {
          success: described(AppServerCapabilities, "App-server capabilities"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.appServer.capabilities",
            summary: "Get app-server capabilities",
            description: "Return the experimental app-server protocol version, methods, and supported feature flags.",
          }),
        ),
        HttpApiEndpoint.post("appServerRpc", ExperimentalPaths.appServerRpc, {
          payload: AppServerRpcBody,
          success: described(AppServerRpcResponse, "App-server JSON-RPC response"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.appServer.rpc",
            summary: "Call app-server JSON-RPC method",
            description:
              "Call an experimental app-server JSON-RPC method such as initialize, thread/start, thread/resume, or thread/list.",
          }),
        ),
        HttpApiEndpoint.get("threadResume", ExperimentalPaths.threadResume, {
          params: ThreadResumeParams,
          query: ThreadResumeQuery,
          success: described(ThreadResume, "Thread resume payload"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.thread.resume",
            summary: "Get thread resume payload",
            description:
              "Return a compact reconnect payload with session metadata, recent messages, status, todos, optional diff, and restored usage totals.",
          }),
        ),
        HttpApiEndpoint.get("threadSubscribe", ExperimentalPaths.threadSubscribe, {
          params: ThreadResumeParams,
          success: Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/event-stream" })),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.thread.subscribe",
            summary: "Subscribe to realtime thread events",
            description:
              "Stream server-sent events for one thread, including sync updates, message deltas, approvals, questions, status changes, and background process output.",
          }),
        ),
        HttpApiEndpoint.get("filesystemStat", ExperimentalPaths.filesystemStat, {
          query: FilesystemPathQuery,
          success: described(FilesystemStat, "Filesystem path status"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.filesystem.stat",
            summary: "Stat filesystem path",
            description: "Return workspace-scoped file or directory metadata without reading content.",
          }),
        ),
        HttpApiEndpoint.get("filesystemRead", ExperimentalPaths.filesystemRead, {
          query: FilesystemReadQuery,
          success: described(FilesystemRead, "Filesystem file content"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.filesystem.read",
            summary: "Read filesystem file",
            description: "Read a workspace-scoped file as utf8 text or base64 content.",
          }),
        ),
        HttpApiEndpoint.post("filesystemWrite", ExperimentalPaths.filesystemWrite, {
          payload: FilesystemWriteBody,
          success: described(FilesystemStat, "Written filesystem path"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.filesystem.write",
            summary: "Write filesystem file",
            description: "Write a workspace-scoped file, optionally creating parent directories.",
          }),
        ),
        HttpApiEndpoint.post("filesystemMkdir", ExperimentalPaths.filesystemMkdir, {
          payload: FilesystemMkdirBody,
          success: described(FilesystemStat, "Created filesystem directory"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.filesystem.mkdir",
            summary: "Create filesystem directory",
            description: "Create a workspace-scoped directory.",
          }),
        ),
        HttpApiEndpoint.post("filesystemRemove", ExperimentalPaths.filesystemRemove, {
          payload: FilesystemRemoveBody,
          success: described(FilesystemRemoved, "Removed filesystem path"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.filesystem.remove",
            summary: "Remove filesystem path",
            description: "Remove a workspace-scoped file or, with recursive enabled, a directory.",
          }),
        ),
        HttpApiEndpoint.post("filesystemRename", ExperimentalPaths.filesystemRename, {
          payload: FilesystemRenameBody,
          success: described(FilesystemStat, "Renamed filesystem path"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.filesystem.rename",
            summary: "Rename filesystem path",
            description: "Rename or move a workspace-scoped file or directory.",
          }),
        ),
        HttpApiEndpoint.get("filesystemList", ExperimentalPaths.filesystemList, {
          query: FilesystemPathQuery,
          success: described(Schema.Array(FilesystemEntry), "Filesystem directory entries"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.filesystem.list",
            summary: "List filesystem directory",
            description: "List workspace-scoped directory entries.",
          }),
        ),
        HttpApiEndpoint.get("terminal", ExperimentalPaths.terminal, {
          query: TerminalQuery,
          success: described(Schema.Array(TerminalJob), "Background terminal jobs"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.terminal.list",
            summary: "List background terminal jobs",
            description: "List retained background terminal jobs started by Bash background mode.",
          }),
        ),
        HttpApiEndpoint.get("terminalRead", ExperimentalPaths.terminalRead, {
          params: TerminalParams,
          query: TerminalQuery,
          success: described(TerminalJob, "Background terminal job"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.terminal.read",
            summary: "Read background terminal job",
            description: "Read retained output and status for one background terminal job.",
          }),
        ),
        HttpApiEndpoint.post("terminalWrite", ExperimentalPaths.terminalWrite, {
          params: TerminalParams,
          payload: TerminalWriteBody,
          success: described(TerminalJob, "Background terminal job"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.terminal.write",
            summary: "Write to background terminal job",
            description: "Send text to the stdin stream of one running background terminal job.",
          }),
        ),
        HttpApiEndpoint.post("terminalStop", ExperimentalPaths.terminalStop, {
          params: TerminalParams,
          payload: TerminalBody,
          success: described(TerminalJob, "Background terminal job"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.terminal.stop",
            summary: "Stop background terminal job",
            description: "Terminate one running background terminal job.",
          }),
        ),
        HttpApiEndpoint.post("terminalClean", ExperimentalPaths.terminalClean, {
          payload: TerminalBody,
          success: described(Schema.Array(TerminalJob), "Background terminal jobs"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.terminal.clean",
            summary: "Clean background terminal jobs",
            description: "Stop and remove retained background terminal jobs, optionally scoped to a session.",
          }),
        ),
        // altrucoder_change end
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "experimental",
          description: "Experimental HttpApi routes. Clients must opt in with experimentalApi capability.", // altrucoder_change
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(ExperimentalApiMiddleware) // altrucoder_change
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "opencode experimental HttpApi",
      version: "0.0.1",
      description: "Experimental HttpApi surface for selected instance routes.",
    }),
  )
