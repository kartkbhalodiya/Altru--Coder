// altrucoder_change - new file
import { Effect } from "effect"
import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { Global } from "@opencode-ai/core/global"
import * as Log from "@opencode-ai/core/util/log"
import type * as Tool from "@/tool/tool"

const log = Log.create({ service: "altrucoder-tool-hooks" })
const MAX_EVENTS = 200
const MAX_KEYS = 80
const MAX_ARRAY = 50
const MAX_TEXT = 4000
const MAX_IO = 64 * 1024
const DEFAULT_TIMEOUT = 5000
const SECRET_KEY = /(api[-_]?key|authorization|cookie|credential|password|secret|token)/i
const SECRET_TEXT = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bnvapi-[A-Za-z0-9_-]{12,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{12,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{12,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(api[-_]?key|authorization|cookie|password|secret|token)\s*[:=]\s*["']?[^"',\s;]+/gi,
]
const WRITE_TOOLS = new Set(["altru_coder_memory", "edit", "patch", "apply_patch", "todo", "write"])
const READ_SHELL = /^(cat|dir|git status|git diff|grep|head|ls|pwd|rg|select-string|type|get-childitem|get-content)\b/i

export namespace AltruCoderToolHooks {
  export type EventName = "PreToolUse" | "PostToolUse" | "ToolError"

  interface Hook {
    command: string
    matcher?: string
    timeout?: number
  }

  interface Hooks {
    hooks?: Partial<Record<EventName, Hook[]>>
  }

  export interface Input {
    tool: string
    args: unknown
    ctx: Pick<Tool.Context, "sessionID" | "messageID" | "callID">
  }

  export interface Event {
    id: string
    name: EventName
    tool: string
    sessionID: string
    messageID: string
    callID?: string
    args?: unknown
    result?: {
      title: string
      outputLength: number
      metadata: unknown
    }
    error?: string
    mutating: boolean
    created: number
  }

  const history: Event[] = []
  let seq = 0
  let cache: { until: number; hooks: Hooks; files: string[] } | undefined

  function redact(text: string) {
    const value = SECRET_TEXT.reduce(
      (next, rule) =>
        next.replace(rule, (_match, key: string | undefined) => (key ? `${key}=[redacted]` : "[redacted]")),
      text,
    )
    if (value.length <= MAX_TEXT) return value
    return `${value.slice(0, MAX_TEXT)}...[truncated]`
  }

  export function sanitize(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) return value
    if (typeof value === "string") return redact(value)
    if (typeof value === "number" || typeof value === "boolean") return value
    if (typeof value === "bigint") return value.toString()
    if (typeof value !== "object") return String(value)
    if (depth > 5) return "[truncated]"
    if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map((item) => sanitize(item, depth + 1))

    const pairs = Object.entries(value as { [key: string]: unknown }).slice(0, MAX_KEYS)
    return Object.fromEntries(
      pairs.map(([key, item]) => [key, SECRET_KEY.test(key) ? "[redacted]" : sanitize(item, depth + 1)]),
    )
  }

  function command(args: unknown) {
    if (!args || typeof args !== "object") return ""
    const data = args as { command?: unknown; cmd?: unknown }
    const value = data.command ?? data.cmd
    return typeof value === "string" ? value.trim() : ""
  }

  function mutating(tool: string, args: unknown) {
    const name = tool.toLowerCase()
    if (WRITE_TOOLS.has(name)) return true
    if (name !== "bash") return false
    const value = command(args)
    if (!value) return false
    return !READ_SHELL.test(value)
  }

  function push(input: Omit<Event, "id" | "created">) {
    const event = {
      ...input,
      id: `hook-${++seq}`,
      created: Date.now(),
    }
    history.push(event)
    if (history.length > MAX_EVENTS) history.splice(0, history.length - MAX_EVENTS)
    return event
  }

  function candidates() {
    return [
      process.env.ALTRU_CODER_HOOKS,
      path.join(Global.Path.config, "hooks.json"),
      path.join(process.cwd(), ".altru-coder", "hooks.json"),
      path.join(process.cwd(), ".opencode", "hooks.json"),
    ].filter((file): file is string => !!file)
  }

  function validHook(value: unknown): Hook | undefined {
    if (!value || typeof value !== "object") return
    const data = value as { command?: unknown; matcher?: unknown; timeout?: unknown }
    if (typeof data.command !== "string" || !data.command.trim()) return
    return {
      command: data.command,
      matcher: typeof data.matcher === "string" ? data.matcher : undefined,
      timeout: typeof data.timeout === "number" && data.timeout > 0 ? Math.min(data.timeout, 60_000) : undefined,
    }
  }

  async function load() {
    const now = Date.now()
    if (cache && cache.until > now) return cache

    const merged: Hooks = { hooks: {} }
    const seen: string[] = []
    for (const file of candidates()) {
      const raw = await fs.readFile(file, "utf8").catch((err: NodeJS.ErrnoException) => {
        if (err.code !== "ENOENT") log.warn("failed to read hook file", { file, err })
        return ""
      })
      if (!raw.trim()) continue
      try {
        const parsed = JSON.parse(raw) as Hooks
        for (const name of ["PreToolUse", "PostToolUse", "ToolError"] as const) {
          const hooks = Array.isArray(parsed.hooks?.[name]) ? parsed.hooks[name]?.map(validHook).filter(Boolean) : []
          if (!hooks.length) continue
          merged.hooks![name] = [...(merged.hooks![name] ?? []), ...(hooks as Hook[])]
        }
        seen.push(file)
      } catch (err) {
        log.warn("ignored invalid hook file", { file, err })
      }
    }

    cache = { until: now + 1000, hooks: merged, files: seen }
    return cache
  }

  function match(hook: Hook, tool: string) {
    if (!hook.matcher) return true
    try {
      return new RegExp(hook.matcher).test(tool)
    } catch (err) {
      log.warn("ignored invalid hook matcher", { matcher: hook.matcher, err })
      return false
    }
  }

  async function exec(command: string, payload: unknown, timeout: number) {
    const child = spawn(command, {
      shell: true,
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })
    const chunks: Buffer[] = []
    const errors: Buffer[] = []
    const done = new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      child.stdout.on("data", (chunk: Buffer) => {
        if (Buffer.concat(chunks).length < MAX_IO) chunks.push(chunk)
      })
      child.stderr.on("data", (chunk: Buffer) => {
        if (Buffer.concat(errors).length < MAX_IO) errors.push(chunk)
      })
      child.on("close", (code) => {
        resolve({
          code,
          stdout: Buffer.concat(chunks).toString("utf8").slice(0, MAX_IO),
          stderr: Buffer.concat(errors).toString("utf8").slice(0, MAX_IO),
        })
      })
      child.on("error", (err) => {
        resolve({ code: -1, stdout: "", stderr: String(err) })
      })
    })
    child.stdin.end(JSON.stringify(payload))
    const timer = new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      setTimeout(() => {
        child.kill()
        resolve({ code: -2, stdout: "", stderr: `hook timed out after ${timeout}ms` })
      }, timeout)
    })
    return Promise.race([done, timer])
  }

  function parse(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    try {
      return JSON.parse(trimmed) as {
        decision?: "allow" | "deny" | "block"
        reason?: string
        output?: string
        title?: string
        additionalContext?: string
      }
    } catch (err) {
      log.warn("ignored non-json hook output", { err })
      return
    }
  }

  async function run(name: EventName, event: Event, extra?: unknown) {
    const cfg = await load()
    const hooks = (cfg.hooks.hooks?.[name] ?? []).filter((hook) => match(hook, event.tool))
    if (hooks.length === 0) return []

    const payload = {
      hookEventName: name,
      hookEventID: event.id,
      tool: event.tool,
      sessionID: event.sessionID,
      messageID: event.messageID,
      callID: event.callID,
      mutating: event.mutating,
      args: event.args,
      result: event.result,
      error: event.error,
      files: cfg.files,
      extra,
    }
    const results = []
    for (const hook of hooks) {
      const result = await exec(hook.command, payload, hook.timeout ?? DEFAULT_TIMEOUT)
      const json = parse(result.stdout)
      if (result.code === 2 && name === "PreToolUse") {
        throw new Error(result.stderr.trim() || json?.reason || "blocked by PreToolUse hook")
      }
      if (result.code !== 0 && result.code !== null) {
        log.warn("hook command failed", {
          name,
          tool: event.tool,
          code: result.code,
          stderr: result.stderr,
        })
      }
      if (json?.decision === "deny" || json?.decision === "block") {
        throw new Error(json.reason || `blocked by ${name} hook`)
      }
      results.push(json)
    }
    return results.filter((item): item is NonNullable<typeof item> => !!item)
  }

  export function events() {
    return [...history]
  }

  export function clear() {
    history.splice(0, history.length)
    cache = undefined
    seq = 0
  }

  export function before(input: Input) {
    return Effect.gen(function* () {
      const event = push({
        name: "PreToolUse",
        tool: input.tool,
        sessionID: input.ctx.sessionID,
        messageID: input.ctx.messageID,
        callID: input.ctx.callID,
        args: sanitize(input.args),
        mutating: mutating(input.tool, input.args),
      })
      log.debug("before tool", {
        tool: input.tool,
        sessionID: input.ctx.sessionID,
        messageID: input.ctx.messageID,
        callID: input.ctx.callID,
        hookID: event.id,
        mutating: event.mutating,
      })
      yield* Effect.promise(() => run("PreToolUse", event))
    })
  }

  export function after<M extends Tool.Metadata>(input: Input & { result: Tool.ExecuteResult<M> }) {
    return Effect.gen(function* () {
      const output = typeof input.result.output === "string" ? input.result.output : JSON.stringify(input.result.output ?? "")
      const metadata =
        input.result.metadata && typeof input.result.metadata === "object" ? input.result.metadata : ({} as M)
      const title = typeof input.result.title === "string" ? input.result.title : ""
      const event = push({
        name: "PostToolUse",
        tool: input.tool,
        sessionID: input.ctx.sessionID,
        messageID: input.ctx.messageID,
        callID: input.ctx.callID,
        args: sanitize(input.args),
        result: {
          title,
          outputLength: output.length,
          metadata: sanitize(metadata),
        },
        mutating: mutating(input.tool, input.args),
      })
      log.debug("after tool", {
        tool: input.tool,
        sessionID: input.ctx.sessionID,
        messageID: input.ctx.messageID,
        callID: input.ctx.callID,
        outputLength: output.length,
        hookID: event.id,
      })
      const results = yield* Effect.promise(() => run("PostToolUse", event, { output }))
      const update = results.findLast((result) => typeof result.output === "string")
      const label = results.findLast((result) => typeof result.title === "string")
      return { ...input.result, title: label?.title ?? title, output: update?.output ?? output, metadata }
    })
  }

  export function failure(input: Input & { error: unknown }) {
    return Effect.gen(function* () {
      const event = push({
        name: "ToolError",
        tool: input.tool,
        sessionID: input.ctx.sessionID,
        messageID: input.ctx.messageID,
        callID: input.ctx.callID,
        args: sanitize(input.args),
        error: input.error instanceof Error ? input.error.message : String(input.error),
        mutating: mutating(input.tool, input.args),
      })
      log.warn("tool failed", {
        tool: input.tool,
        sessionID: input.ctx.sessionID,
        messageID: input.ctx.messageID,
        callID: input.ctx.callID,
        hookID: event.id,
        error: event.error,
      })
      yield* Effect.promise(() => run("ToolError", event)).pipe(
        Effect.catch((err) => Effect.sync(() => log.warn("tool error hook failed", { err }))),
      )
    })
  }
}
