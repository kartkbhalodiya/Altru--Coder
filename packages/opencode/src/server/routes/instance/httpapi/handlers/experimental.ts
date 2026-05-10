import { Account } from "@/account/account"
import { Agent } from "@/agent/agent"
import { Bus } from "@/bus" // altrucoder_change
import { Config } from "@/config/config"
import { InstanceState } from "@/effect/instance-state"
import { File } from "@/file" // altrucoder_change
import { FileWatcher } from "@/file/watcher" // altrucoder_change
import { MCP } from "@/mcp"
import { Project } from "@/project/project"
import { MessageV2 } from "@/session/message-v2" // altrucoder_change
import { SessionID } from "@/session/schema" // altrucoder_change
import { Session } from "@/session/session"
import { SessionStatus } from "@/session/status" // altrucoder_change
import { SessionSummary } from "@/session/summary" // altrucoder_change
import { Todo } from "@/session/todo" // altrucoder_change
import { BashBackground } from "@/tool/bash" // altrucoder_change
import * as Truncate from "@/tool/truncate" // altrucoder_change
import { ToolRegistry } from "@/tool/registry"
import * as EffectZod from "@/util/effect-zod"
import { Worktree } from "@/worktree"
import { Effect, Option } from "effect"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { AppServerProtocol } from "@/altrucoder/app-server/protocol" // altrucoder_change
import { FilesystemRpc } from "@/altrucoder/filesystem/rpc" // altrucoder_change
import { ProcessRpc } from "@/altrucoder/process/rpc" // altrucoder_change
import { ThreadResume } from "@/altrucoder/session/resume" // altrucoder_change
import { ThreadRealtime } from "@/altrucoder/thread/realtime" // altrucoder_change
import { HttpServerRequest } from "effect/unstable/http" // altrucoder_change
import { InstanceHttpApi } from "../api"
import {
  AppServerRpcBody,
  ConsoleSwitchPayload,
  FilesystemMkdirBody,
  FilesystemPathQuery,
  FilesystemReadQuery,
  FilesystemRemoveBody,
  FilesystemRenameBody,
  FilesystemWriteBody,
  ProcessBody,
  ProcessOutputQuery,
  ProcessParams,
  ProcessQuery,
  ProcessStartBody,
  ProcessWriteBody,
  SessionListQuery,
  TerminalBody,
  TerminalParams,
  TerminalQuery,
  TerminalWriteBody,
  ThreadResumeParams,
  ThreadResumeQuery,
  ToolListQuery,
} from "../groups/experimental" // altrucoder_change

export const experimentalHandlers = HttpApiBuilder.group(InstanceHttpApi, "experimental", (handlers) =>
  Effect.gen(function* () {
    const account = yield* Account.Service
    const agents = yield* Agent.Service
    const bus = yield* Bus.Service // altrucoder_change
    const config = yield* Config.Service
    const mcp = yield* MCP.Service
    const project = yield* Project.Service
    const registry = yield* ToolRegistry.Service
    const sessions = yield* Session.Service // altrucoder_change
    const status = yield* SessionStatus.Service // altrucoder_change
    const summary = yield* SessionSummary.Service // altrucoder_change
    const todos = yield* Todo.Service // altrucoder_change
    const worktreeSvc = yield* Worktree.Service
    const limits = { maxLines: Truncate.MAX_LINES, maxBytes: Truncate.MAX_BYTES } // altrucoder_change

    // altrucoder_change start
    const fault = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes("not found")) return new HttpApiError.NotFound({})
      return new HttpApiError.BadRequest({})
    }
    // altrucoder_change end

    const getConsole = Effect.fn("ExperimentalHttpApi.console")(function* () {
      const [state, groups] = yield* Effect.all(
        [config.getConsoleState(), account.orgsByAccount().pipe(Effect.orDie)],
        {
          concurrency: "unbounded",
        },
      )
      return {
        consoleManagedProviders: state.consoleManagedProviders,
        ...(state.activeOrgName ? { activeOrgName: state.activeOrgName } : {}),
        switchableOrgCount: groups.reduce((count, group) => count + group.orgs.length, 0),
      }
    })

    const listConsoleOrgs = Effect.fn("ExperimentalHttpApi.consoleOrgs")(function* () {
      const [groups, active] = yield* Effect.all(
        [account.orgsByAccount().pipe(Effect.orDie), account.active().pipe(Effect.orDie)],
        {
          concurrency: "unbounded",
        },
      )
      const info = Option.getOrUndefined(active)
      return {
        orgs: groups.flatMap((group) =>
          group.orgs.map((org) => ({
            accountID: group.account.id,
            accountEmail: group.account.email,
            accountUrl: group.account.url,
            orgID: org.id,
            orgName: org.name,
            active: !!info && info.id === group.account.id && info.active_org_id === org.id,
          })),
        ),
      }
    })

    const switchConsole = Effect.fn("ExperimentalHttpApi.consoleSwitch")(function* (ctx: {
      payload: typeof ConsoleSwitchPayload.Type
    }) {
      yield* account
        .use(ctx.payload.accountID, Option.some(ctx.payload.orgID))
        .pipe(Effect.catch(() => Effect.fail(new HttpApiError.BadRequest({}))))
      return true
    })

    const tool = Effect.fn("ExperimentalHttpApi.tool")(function* (ctx: { query: typeof ToolListQuery.Type }) {
      const list = yield* registry.tools({
        providerID: ctx.query.provider,
        modelID: ctx.query.model,
        agent: yield* agents.get(yield* agents.defaultAgent()),
      })
      return list.map((item) => ({
        id: item.id,
        description: item.description,
        parameters: EffectZod.toJsonSchema(item.parameters),
      }))
    })

    const toolIDs = Effect.fn("ExperimentalHttpApi.toolIDs")(function* () {
      return yield* registry.ids()
    })

    const worktree = Effect.fn("ExperimentalHttpApi.worktree")(function* () {
      const ctx = yield* InstanceState.context
      return yield* project.sandboxes(ctx.project.id)
    })

    const worktreeCreate = Effect.fn("ExperimentalHttpApi.worktreeCreate")(function* (ctx: {
      payload: Worktree.CreateInput | undefined
    }) {
      return yield* worktreeSvc.create(ctx.payload)
    })

    const worktreeRemove = Effect.fn("ExperimentalHttpApi.worktreeRemove")(function* (input: {
      payload: Worktree.RemoveInput
    }) {
      const ctx = yield* InstanceState.context
      yield* worktreeSvc.remove(input.payload)
      yield* project.removeSandbox(ctx.project.id, input.payload.directory)
      return true
    })

    const worktreeReset = Effect.fn("ExperimentalHttpApi.worktreeReset")(function* (ctx: {
      payload: Worktree.ResetInput
    }) {
      yield* worktreeSvc.reset(ctx.payload)
      return true
    })

    const session = Effect.fn("ExperimentalHttpApi.session")(function* (ctx: { query: typeof SessionListQuery.Type }) {
      const limit = ctx.query.limit ?? 100
      const sessions = Array.from(
        Session.listGlobal({
          directory: ctx.query.directory,
          roots: ctx.query.roots,
          start: ctx.query.start,
          cursor: ctx.query.cursor,
          search: ctx.query.search,
          limit: limit + 1,
          archived: ctx.query.archived,
        }),
      )
      const list = sessions.length > limit ? sessions.slice(0, limit) : sessions
      return HttpServerResponse.jsonUnsafe(list, {
        headers:
          sessions.length > limit && list.length > 0
            ? { "x-next-cursor": String(list[list.length - 1].time.updated) }
            : undefined,
      })
    })

    const resource = Effect.fn("ExperimentalHttpApi.resource")(function* () {
      return yield* mcp.resources()
    })

    // altrucoder_change start
    const publish = Effect.fn("ExperimentalHttpApi.filesystemPublish")(function* (
      file: string,
      event: "add" | "change" | "unlink",
    ) {
      if (event !== "unlink") yield* bus.publish(File.Event.Edited, { file })
      yield* bus.publish(FileWatcher.Event.Updated, { file, event })
    })

    const processList = Effect.fn("ExperimentalHttpApi.process")(function* (ctx: { query: typeof ProcessQuery.Type }) {
      return ProcessRpc.list(ctx.query.sessionID)
    })

    const processStart = Effect.fn("ExperimentalHttpApi.processStart")(function* (ctx: {
      payload: typeof ProcessStartBody.Type
    }) {
      const state = yield* InstanceState.context
      const cfg = yield* config.get()
      return yield* Effect.try({
        try: () =>
          ProcessRpc.start({
            ...ctx.payload,
            cwd: ProcessRpc.directory(state.directory, ctx.payload.cwd),
            shell: ProcessRpc.shell(ctx.payload.shell, cfg.shell),
          }),
        catch: () => new HttpApiError.BadRequest({}),
      })
    })

    const processRead = Effect.fn("ExperimentalHttpApi.processRead")(function* (ctx: {
      params: typeof ProcessParams.Type
      query: typeof ProcessQuery.Type
    }) {
      return yield* Effect.try({
        try: () => ProcessRpc.read(ctx.params.processID, ctx.query.sessionID),
        catch: fault,
      })
    })

    const processOutput = Effect.fn("ExperimentalHttpApi.processOutput")(function* (ctx: {
      params: typeof ProcessParams.Type
      query: typeof ProcessOutputQuery.Type
    }) {
      return yield* Effect.try({
        try: () => ProcessRpc.poll(ctx.params.processID, ctx.query.offset ?? 0, ctx.query.sessionID),
        catch: fault,
      })
    })

    const processWrite = Effect.fn("ExperimentalHttpApi.processWrite")(function* (ctx: {
      params: typeof ProcessParams.Type
      payload: typeof ProcessWriteBody.Type
    }) {
      const text = ctx.payload.newline ? `${ctx.payload.input}\n` : ctx.payload.input
      return yield* Effect.tryPromise({
        try: () => ProcessRpc.write(ctx.params.processID, text, ctx.payload.sessionID),
        catch: fault,
      })
    })

    const processStop = Effect.fn("ExperimentalHttpApi.processStop")(function* (ctx: {
      params: typeof ProcessParams.Type
      payload: typeof ProcessBody.Type
    }) {
      return yield* Effect.tryPromise({
        try: () => ProcessRpc.stop(ctx.params.processID, ctx.payload.sessionID),
        catch: fault,
      })
    })

    const processClean = Effect.fn("ExperimentalHttpApi.processClean")(function* (ctx: {
      payload: typeof ProcessBody.Type
    }) {
      return yield* Effect.tryPromise({
        try: () => ProcessRpc.clean(ctx.payload.sessionID),
        catch: fault,
      })
    })

    const resume = Effect.fn("ExperimentalHttpApi.threadResumePayload")(function* (input: {
      sessionID: SessionID
      limit?: number
      before?: string
      diff?: boolean
    }) {
      const session = yield* sessions.get(input.sessionID).pipe(Effect.mapError(fault))
      const page = yield* Effect.try({
        try: () =>
          MessageV2.page({
            sessionID: input.sessionID,
            limit: input.limit ?? 100,
            before: input.before,
          }),
        catch: fault,
      })
      const [state, todo, diff, usage] = yield* Effect.all(
        [
          status.get(input.sessionID),
          todos.get(input.sessionID),
          input.diff ? summary.diff({ sessionID: input.sessionID }) : Effect.succeed([]),
          Effect.sync(() => ThreadResume.usage(input.sessionID)),
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
    })

    const threadResume = Effect.fn("ExperimentalHttpApi.threadResume")(function* (ctx: {
      params: typeof ThreadResumeParams.Type
      query: typeof ThreadResumeQuery.Type
    }) {
      return yield* resume({ sessionID: ctx.params.sessionID, ...ctx.query })
    })

    const threadSubscribe = Effect.fn("ExperimentalHttpApi.threadSubscribe")(function* (ctx: {
      request: HttpServerRequest.HttpServerRequest
    }) {
      const url = new URL(ctx.request.url, "http://localhost")
      const sessionID = ThreadRealtime.path(url.pathname)
      if (!sessionID)
        return HttpServerResponse.jsonUnsafe({ success: false, error: "Invalid thread path" }, { status: 400 })
      return ThreadRealtime.response(sessionID)
    })

    const appServerCapabilities = Effect.fn("ExperimentalHttpApi.appServerCapabilities")(function* () {
      return AppServerProtocol.capabilities()
    })

    const appServerRpc = (ctx: { payload: typeof AppServerRpcBody.Type }) =>
      Effect.gen(function* () {
        const req = ctx.payload as AppServerProtocol.Request

        switch (req.method) {
          case "initialize":
            return AppServerProtocol.ok(req, AppServerProtocol.capabilities())

          case "initialized":
            return AppServerProtocol.ok(req, { ok: true })

          case "thread/start": {
            const params = AppServerProtocol.params(req.params)
            const title = AppServerProtocol.optionalText(params, "title")
            const session = yield* sessions.create(title ? { title } : undefined)
            return AppServerProtocol.ok(req, { session: AppServerProtocol.thread(session) })
          }

          case "thread/resume": {
            const params = AppServerProtocol.params(req.params)
            const sessionID = SessionID.make(AppServerProtocol.text(params, "sessionID"))
            const limit = AppServerProtocol.optionalNumber(params, "limit")
            const before = AppServerProtocol.optionalText(params, "before")
            const diff = AppServerProtocol.optionalBoolean(params, "diff")
            return AppServerProtocol.ok(
              req,
              AppServerProtocol.payload(yield* resume({ sessionID, limit, before, diff })),
            )
          }

          case "thread/list": {
            const params = AppServerProtocol.params(req.params)
            const limit = AppServerProtocol.optionalNumber(params, "limit") ?? 100
            const directory = AppServerProtocol.optionalText(params, "directory")
            const list = Array.from(Session.listGlobal({ directory, limit }))
            return AppServerProtocol.ok(req, { sessions: list })
          }

          case "process/list": {
            const params = AppServerProtocol.params(req.params)
            const sessionID = AppServerProtocol.optionalText(params, "sessionID")
            return AppServerProtocol.ok(req, { processes: ProcessRpc.list(ProcessRpc.session(sessionID)) })
          }

          case "filesystem/stat": {
            const state = yield* InstanceState.context
            const params = AppServerProtocol.params(req.params)
            return AppServerProtocol.ok(
              req,
              yield* Effect.promise(() => FilesystemRpc.stat(state, AppServerProtocol.text(params, "path"))),
            )
          }

          default:
            return AppServerProtocol.fail(req, -32601, `Method not found: ${req.method}`)
        }
      }).pipe(
        Effect.catch((err: unknown) =>
          Effect.succeed(
            AppServerProtocol.fail(
              ctx.payload as AppServerProtocol.Request,
              -32602,
              err instanceof Error ? err.message : String(err),
            ),
          ),
        ),
        Effect.catchDefect((err) =>
          Effect.succeed(
            AppServerProtocol.fail(
              ctx.payload as AppServerProtocol.Request,
              -32603,
              err instanceof Error ? err.message : String(err),
            ),
          ),
        ),
      )

    const filesystemStat = Effect.fn("ExperimentalHttpApi.filesystemStat")(function* (ctx: {
      query: typeof FilesystemPathQuery.Type
    }) {
      const state = yield* InstanceState.context
      return yield* Effect.tryPromise({
        try: () => FilesystemRpc.stat(state, ctx.query.path),
        catch: fault,
      })
    })

    const filesystemRead = Effect.fn("ExperimentalHttpApi.filesystemRead")(function* (ctx: {
      query: typeof FilesystemReadQuery.Type
    }) {
      const state = yield* InstanceState.context
      return yield* Effect.tryPromise({
        try: () => FilesystemRpc.read(state, ctx.query.path, ctx.query.encoding),
        catch: fault,
      })
    })

    const filesystemWrite = Effect.fn("ExperimentalHttpApi.filesystemWrite")(function* (ctx: {
      payload: typeof FilesystemWriteBody.Type
    }) {
      const state = yield* InstanceState.context
      const before = yield* Effect.tryPromise({
        try: () => FilesystemRpc.stat(state, ctx.payload.path),
        catch: fault,
      })
      const result = yield* Effect.tryPromise({
        try: () => FilesystemRpc.write(state, ctx.payload),
        catch: fault,
      })
      yield* publish(result.absolute, before.exists ? "change" : "add")
      return result
    })

    const filesystemMkdir = Effect.fn("ExperimentalHttpApi.filesystemMkdir")(function* (ctx: {
      payload: typeof FilesystemMkdirBody.Type
    }) {
      const state = yield* InstanceState.context
      const before = yield* Effect.tryPromise({
        try: () => FilesystemRpc.stat(state, ctx.payload.path),
        catch: fault,
      })
      const result = yield* Effect.tryPromise({
        try: () => FilesystemRpc.mkdirp(state, ctx.payload),
        catch: fault,
      })
      yield* publish(result.absolute, before.exists ? "change" : "add")
      return result
    })

    const filesystemRemove = Effect.fn("ExperimentalHttpApi.filesystemRemove")(function* (ctx: {
      payload: typeof FilesystemRemoveBody.Type
    }) {
      const state = yield* InstanceState.context
      const before = yield* Effect.tryPromise({
        try: () => FilesystemRpc.stat(state, ctx.payload.path),
        catch: fault,
      })
      const result = yield* Effect.tryPromise({
        try: () => FilesystemRpc.remove(state, ctx.payload),
        catch: fault,
      })
      yield* publish(before.absolute, "unlink")
      return result
    })

    const filesystemRename = Effect.fn("ExperimentalHttpApi.filesystemRename")(function* (ctx: {
      payload: typeof FilesystemRenameBody.Type
    }) {
      const state = yield* InstanceState.context
      const from = yield* Effect.tryPromise({
        try: () => FilesystemRpc.stat(state, ctx.payload.from),
        catch: fault,
      })
      const to = yield* Effect.tryPromise({
        try: () => FilesystemRpc.stat(state, ctx.payload.to),
        catch: fault,
      })
      const result = yield* Effect.tryPromise({
        try: () => FilesystemRpc.move(state, ctx.payload),
        catch: fault,
      })
      yield* publish(from.absolute, "unlink")
      yield* publish(result.absolute, to.exists ? "change" : "add")
      return result
    })

    const filesystemList = Effect.fn("ExperimentalHttpApi.filesystemList")(function* (ctx: {
      query: typeof FilesystemPathQuery.Type
    }) {
      const state = yield* InstanceState.context
      return yield* Effect.tryPromise({
        try: () => FilesystemRpc.list(state, ctx.query.path),
        catch: fault,
      })
    })

    const terminal = Effect.fn("ExperimentalHttpApi.terminal")(function* (ctx: { query: typeof TerminalQuery.Type }) {
      return BashBackground.list(limits, ctx.query.sessionID)
    })

    const terminalRead = Effect.fn("ExperimentalHttpApi.terminalRead")(function* (ctx: {
      params: typeof TerminalParams.Type
      query: typeof TerminalQuery.Type
    }) {
      return yield* Effect.try({
        try: () => BashBackground.read(ctx.params.jobID, limits, ctx.query.sessionID),
        catch: fault,
      })
    })

    const terminalWrite = Effect.fn("ExperimentalHttpApi.terminalWrite")(function* (ctx: {
      params: typeof TerminalParams.Type
      payload: typeof TerminalWriteBody.Type
    }) {
      const text = ctx.payload.newline ? `${ctx.payload.input}\n` : ctx.payload.input
      return yield* Effect.tryPromise({
        try: () => BashBackground.write(ctx.params.jobID, text, limits, ctx.payload.sessionID),
        catch: fault,
      })
    })

    const terminalStop = Effect.fn("ExperimentalHttpApi.terminalStop")(function* (ctx: {
      params: typeof TerminalParams.Type
      payload: typeof TerminalBody.Type
    }) {
      return yield* Effect.tryPromise({
        try: () => BashBackground.stop(ctx.params.jobID, limits, ctx.payload.sessionID),
        catch: fault,
      })
    })

    const terminalClean = Effect.fn("ExperimentalHttpApi.terminalClean")(function* (ctx: {
      payload: typeof TerminalBody.Type
    }) {
      return yield* Effect.tryPromise({
        try: () => BashBackground.clean(limits, ctx.payload.sessionID),
        catch: fault,
      })
    })
    // altrucoder_change end

    return (
      handlers
        .handle("console", getConsole)
        .handle("consoleOrgs", listConsoleOrgs)
        .handle("consoleSwitch", switchConsole)
        .handle("tool", tool)
        .handle("toolIDs", toolIDs)
        .handle("worktree", worktree)
        .handle("worktreeCreate", worktreeCreate)
        .handle("worktreeRemove", worktreeRemove)
        .handle("worktreeReset", worktreeReset)
        .handle("session", session)
        .handle("resource", resource)
        // altrucoder_change start
        .handle("process", processList)
        .handle("processStart", processStart)
        .handle("processRead", processRead)
        .handle("processOutput", processOutput)
        .handle("processWrite", processWrite)
        .handle("processStop", processStop)
        .handle("processClean", processClean)
        .handle("appServerCapabilities", appServerCapabilities)
        .handle("appServerRpc", appServerRpc)
        .handle("threadResume", threadResume)
        .handleRaw("threadSubscribe", threadSubscribe)
        .handle("filesystemStat", filesystemStat)
        .handle("filesystemRead", filesystemRead)
        .handle("filesystemWrite", filesystemWrite)
        .handle("filesystemMkdir", filesystemMkdir)
        .handle("filesystemRemove", filesystemRemove)
        .handle("filesystemRename", filesystemRename)
        .handle("filesystemList", filesystemList)
        .handle("terminal", terminal)
        .handle("terminalRead", terminalRead)
        .handle("terminalWrite", terminalWrite)
        .handle("terminalStop", terminalStop)
        .handle("terminalClean", terminalClean)
    )
    // altrucoder_change end
  }),
)
