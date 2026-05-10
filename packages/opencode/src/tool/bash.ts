import { Schema } from "effect"
import { PositiveInt } from "@/util/schema"
import os from "os"
import { createWriteStream } from "node:fs"
import { randomUUID } from "node:crypto" // altrucoder_change
import * as Tool from "./tool"
import path from "path"
import DESCRIPTION from "./bash.txt"
import * as Log from "@opencode-ai/core/util/log"
import { containsPath, type InstanceContext } from "../project/instance-context"
import { lazy } from "@/util/lazy"
import { Language, type Node } from "web-tree-sitter"

import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { fileURLToPath } from "url"
import { Config } from "@/config/config"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Global } from "@opencode-ai/core/global"
import { Shell } from "@/shell/shell"

import { BashArity } from "@/permission/arity"
import * as Truncate from "./truncate"
import { Plugin } from "@/plugin"
import { Effect, Stream } from "effect"
import { ChildProcess } from "effect/unstable/process"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { InstanceState } from "@/effect/instance-state"
import { Process } from "@/util/process" // altrucoder_change
import { MessageID } from "@/session/schema" // altrucoder_change
import { ProcessEvents } from "@/altrucoder/process/events" // altrucoder_change

const MAX_METADATA_LENGTH = 30_000
const DEFAULT_TIMEOUT = Flag.ALTRU_CODER_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS || 2 * 60 * 1000
const BACKGROUND_POLL_MS = 7_000 // altrucoder_change
const CWD = new Set(["cd", "push-location", "set-location"])
const FILES = new Set([
  ...CWD,
  "rm",
  "cp",
  "mv",
  "mkdir",
  "touch",
  "chmod",
  "chown",
  "cat",
  // Leave PowerShell aliases out for now. Common ones like cat/cp/mv/rm/mkdir
  // already hit the entries above, and alias normalization should happen in one
  // place later so we do not risk double-prompting.
  "get-content",
  "set-content",
  "add-content",
  "copy-item",
  "move-item",
  "remove-item",
  "new-item",
  "rename-item",
])
// altrucoder_change start
const READ = new Set(["cat", "get-content"])
// altrucoder_change end
const FLAGS = new Set(["-destination", "-literalpath", "-path"])
const SWITCHES = new Set(["-confirm", "-debug", "-force", "-nonewline", "-recurse", "-verbose", "-whatif"])

export const Parameters = Schema.Struct({
  command: Schema.String.annotate({ description: "The command to execute" }),
  timeout: Schema.optional(PositiveInt).annotate({ description: "Optional timeout in milliseconds" }),
  // altrucoder_change start
  background: Schema.optional(Schema.Boolean).annotate({
    description:
      "Run long-lived server/watch commands in the background. Polls output every 7 seconds and returns when the process exits, prints a known ready message, or reaches the monitor timeout while leaving the process running.",
  }),
  // altrucoder_change end
  workdir: Schema.optional(Schema.String).annotate({
    description: `The working directory to run the command in. Defaults to the current directory. Use this instead of 'cd' commands.`,
  }),
  description: Schema.optional(Schema.String).annotate({
    // altrucoder_change
    // altrucoder_change start
    description:
      "Recommended: a clear, concise description of what this command does in 5-10 words. Examples:\nInput: ls\nOutput: Lists files in current directory\n\nInput: git status\nOutput: Shows working tree status\n\nInput: npm install\nOutput: Installs package dependencies\n\nInput: mkdir foo\nOutput: Creates directory 'foo'",
    // altrucoder_change end
  }),
})

type Part = {
  type: string
  text: string
}

// altrucoder_change start
type Access = "read" | "unknown"
// altrucoder_change end

type Scan = {
  dirs: Set<string>
  patterns: Set<string>
  always: Set<string>
  access: Access // altrucoder_change
}

type Chunk = {
  text: string
  size: number
}

// altrucoder_change start
type Job = {
  id: string
  child: ReturnType<typeof Process.spawn>
  command: string
  cwd: string
  sessionID: Tool.Context["sessionID"]
  messageID: Tool.Context["messageID"]
  callID?: string
  started: number
  updated: number
  list: Chunk[]
  used: number
  base: number
  cut: boolean
  exit?: number
  error?: string
  stopped?: boolean
}

type BashState = {
  jobs: Map<string, Job>
}

type Metadata = {
  output: string
  exit: number | null
  description: string
  truncated: boolean
  outputPath?: string
  background?: boolean
  jobID?: string
  pid?: number
  running?: boolean
  ready?: boolean
  status?: string
}

const background: BashState = {
  jobs: new Map(),
}

let cleanup = false
const MAX_BACKGROUND_JOBS = 20
const MAX_BACKGROUND_HISTORY = 40
// altrucoder_change end

export const log = Log.create({ service: "bash-tool" })

const resolveWasm = (asset: string) => {
  if (asset.startsWith("file://")) return fileURLToPath(asset)
  if (asset.startsWith("/") || /^[a-z]:/i.test(asset)) return asset
  const url = new URL(asset, import.meta.url)
  return fileURLToPath(url)
}

function parts(node: Node) {
  const out: Part[] = []
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i)
    if (!child) continue
    if (child.type === "command_elements") {
      for (let j = 0; j < child.childCount; j++) {
        const item = child.child(j)
        if (!item || item.type === "command_argument_sep" || item.type === "redirection") continue
        out.push({ type: item.type, text: item.text })
      }
      continue
    }
    if (
      child.type !== "command_name" &&
      child.type !== "command_name_expr" &&
      child.type !== "word" &&
      child.type !== "string" &&
      child.type !== "raw_string" &&
      child.type !== "concatenation"
    ) {
      continue
    }
    out.push({ type: child.type, text: child.text })
  }
  return out
}

function source(node: Node) {
  return (node.parent?.type === "redirected_statement" ? node.parent.text : node.text).trim()
}

// altrucoder_change start
function access(cmd: string, node: Node): Access {
  if (!READ.has(cmd)) return "unknown"
  if (node.parent?.type === "redirected_statement") return "unknown"
  return "read"
}
// altrucoder_change end

function commands(node: Node) {
  return node.descendantsOfType("command").filter((child): child is Node => Boolean(child))
}

function unquote(text: string) {
  if (text.length < 2) return text
  const first = text[0]
  const last = text[text.length - 1]
  if ((first === '"' || first === "'") && first === last) return text.slice(1, -1)
  return text
}

function home(text: string) {
  if (text === "~") return os.homedir()
  if (text.startsWith("~/") || text.startsWith("~\\")) return path.join(os.homedir(), text.slice(2))
  return text
}

function envValue(key: string) {
  if (process.platform !== "win32") return process.env[key]
  const name = Object.keys(process.env).find((item) => item.toLowerCase() === key.toLowerCase())
  return name ? process.env[name] : undefined
}

function auto(key: string, cwd: string, shell: string) {
  const name = key.toUpperCase()
  if (name === "HOME") return os.homedir()
  if (name === "PWD") return cwd
  if (name === "PSHOME") return path.dirname(shell)
}

function expand(text: string, cwd: string, shell: string) {
  const out = unquote(text)
    .replace(/\$\{env:([^}]+)\}/gi, (_, key: string) => envValue(key) || "")
    .replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/gi, (_, key: string) => envValue(key) || "")
    .replace(/\$(HOME|PWD|PSHOME)(?=$|[\\/])/gi, (_, key: string) => auto(key, cwd, shell) || "")
  return home(out)
}

function provider(text: string) {
  const match = text.match(/^([A-Za-z]+)::(.*)$/)
  if (match) {
    if (match[1].toLowerCase() !== "filesystem") return
    return match[2]
  }
  const prefix = text.match(/^([A-Za-z]+):(.*)$/)
  if (!prefix) return text
  if (prefix[1].length === 1) return text
  return
}

function dynamic(text: string, ps: boolean) {
  if (text.startsWith("(") || text.startsWith("@(")) return true
  if (text.includes("$(") || text.includes("${") || text.includes("`")) return true
  if (ps) return /\$(?!env:)/i.test(text)
  return text.includes("$")
}

function prefix(text: string) {
  const match = /[?*[]/.exec(text)
  if (!match) return text
  if (match.index === 0) return
  return text.slice(0, match.index)
}

function pathArgs(list: Part[], ps: boolean) {
  if (!ps) {
    return list
      .slice(1)
      .filter((item) => !item.text.startsWith("-") && !(list[0]?.text === "chmod" && item.text.startsWith("+")))
      .map((item) => item.text)
  }

  const out: string[] = []
  let want = false
  for (const item of list.slice(1)) {
    if (want) {
      out.push(item.text)
      want = false
      continue
    }
    if (item.type === "command_parameter") {
      const flag = item.text.toLowerCase()
      if (SWITCHES.has(flag)) continue
      want = FLAGS.has(flag)
      continue
    }
    out.push(item.text)
  }
  return out
}

function preview(text: string) {
  if (text.length <= MAX_METADATA_LENGTH) return text
  return "...\n\n" + text.slice(-MAX_METADATA_LENGTH)
}

function tail(text: string, maxLines: number, maxBytes: number) {
  const lines = text.split("\n")
  if (lines.length <= maxLines && Buffer.byteLength(text, "utf-8") <= maxBytes) {
    return {
      text,
      cut: false,
    }
  }

  const out: string[] = []
  let bytes = 0
  for (let i = lines.length - 1; i >= 0 && out.length < maxLines; i--) {
    const size = Buffer.byteLength(lines[i], "utf-8") + (out.length > 0 ? 1 : 0)
    if (bytes + size > maxBytes) {
      if (out.length === 0) {
        const buf = Buffer.from(lines[i], "utf-8")
        let start = buf.length - maxBytes
        if (start < 0) start = 0
        while (start < buf.length && (buf[start] & 0xc0) === 0x80) start++
        out.unshift(buf.subarray(start).toString("utf-8"))
      }
      break
    }
    out.unshift(lines[i])
    bytes += size
  }
  return {
    text: out.join("\n"),
    cut: true,
  }
}

// altrucoder_change start
const READY = [
  /\bready in\s+\d+/i,
  /\bcompiled successfully\b/i,
  /\bwebpack compiled\b/i,
  /\bserver\s+(?:running|started|listening)\b/i,
  /\blistening on\b/i,
  /\brunning at\b/i,
  /\blocal:\s+https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])/i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i,
  /\bpress\s+(?:ctrl|control)\+c\b/i,
]

function position(job: Job) {
  return job.base + job.list.reduce((total, item) => total + item.text.length, 0)
}

function append(job: Job, chunk: string, keep: number) {
  const offset = position(job)
  const size = Buffer.byteLength(chunk, "utf-8")
  job.list.push({ text: chunk, size })
  job.used += size
  job.updated = Date.now()
  while (job.used > keep && job.list.length > 1) {
    const item = job.list.shift()
    if (!item) break
    job.used -= item.size
    job.base += item.text.length
    job.cut = true
  }
  return {
    offset,
    nextOffset: position(job),
    truncated: job.cut || offset < job.base,
  }
}

function raw(job: Job) {
  return job.list.map((item) => item.text).join("")
}

function view(job: Job, limits: { maxLines: number; maxBytes: number }) {
  const text = raw(job)
  const end = tail(text, limits.maxLines, limits.maxBytes)
  const cut = job.cut || end.cut
  const output = end.text || "(no output yet)"
  return {
    output: cut ? "...output truncated...\n\n" + output : output,
    cut,
  }
}

function ready(text: string) {
  return READY.some((pattern) => pattern.test(text))
}

function running(job: Job) {
  return job.child.exitCode === null && job.child.signalCode === null && job.exit === undefined && !job.error
}

function status(job: Job) {
  if (running(job)) return job.stopped ? "stopping" : "running"
  if (job.stopped) return "stopped"
  if (job.error) return "failed"
  return "completed"
}

function processOutput(job: Job, chunk: string, offset: number, nextOffset: number, truncated: boolean) {
  ProcessEvents.output({
    processID: job.id,
    id: job.id,
    sessionID: job.sessionID,
    messageID: job.messageID,
    callID: job.callID,
    offset,
    nextOffset,
    output: chunk,
    truncated,
    running: running(job),
    exit: job.exit ?? job.child.exitCode ?? null,
    status: status(job),
    error: job.error,
  })
}

function prune() {
  const extra = background.jobs.size - MAX_BACKGROUND_HISTORY
  if (extra <= 0) return
  const done = Array.from(background.jobs.values())
    .filter((job) => !running(job))
    .toSorted((a, b) => a.updated - b.updated)
    .slice(0, extra)
  for (const job of done) {
    background.jobs.delete(job.id)
  }
}

function assertJob(id: string, sessionID?: Tool.Context["sessionID"]) {
  const job = background.jobs.get(id)
  if (!job) throw new Error(`Terminal job not found: ${id}`)
  if (sessionID && job.sessionID !== sessionID) throw new Error(`Terminal job not found in this session: ${id}`)
  return job
}

export namespace BashBackground {
  export type Start = {
    command: string
    cwd: string
    shell: string
    env?: NodeJS.ProcessEnv
    sessionID: Tool.Context["sessionID"]
    messageID?: Tool.Context["messageID"]
    callID?: string
  }

  export type Snapshot = {
    id: string
    command: string
    cwd: string
    sessionID: Tool.Context["sessionID"]
    messageID: Tool.Context["messageID"]
    callID?: string
    pid?: number
    started: number
    updated: number
    status: string
    running: boolean
    exit: number | null
    error?: string
    stopped?: boolean
    truncated: boolean
    output: string
  }

  export type Output = {
    id: string
    offset: number
    nextOffset: number
    output: string
    truncated: boolean
    running: boolean
    exit: number | null
    status: string
    error?: string
  }

  export const max = MAX_BACKGROUND_JOBS

  export function count() {
    return Array.from(background.jobs.values()).filter(running).length
  }

  export function start(input: Start, limits: { maxLines: number; maxBytes: number }) {
    registerCleanup()
    const active = count()
    if (active >= MAX_BACKGROUND_JOBS) {
      throw new Error(`Too many background terminal jobs are running (${active}/${MAX_BACKGROUND_JOBS}).`)
    }

    const spec = native(input.shell, input.command)
    const child = Process.spawn(spec.cmd, {
      cwd: input.cwd,
      env: input.env,
      shell: spec.shell,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    })
    const job: Job = {
      id: randomUUID(),
      child,
      command: input.command,
      cwd: input.cwd,
      sessionID: input.sessionID,
      messageID: input.messageID ?? MessageID.ascending(),
      callID: input.callID,
      started: Date.now(),
      updated: Date.now(),
      list: [],
      used: 0,
      base: 0,
      cut: false,
    }
    background.jobs.set(job.id, job)

    ProcessEvents.started(ProcessEvents.info(snapshot(job, limits)))

    const keep = limits.maxBytes * 2
    const ingest = InstanceState.bind((chunk: Buffer | string) => {
      const text = chunk.toString()
      const out = append(job, text, keep)
      processOutput(job, text, out.offset, out.nextOffset, out.truncated)
    })
    child.stdout?.on("data", ingest)
    child.stderr?.on("data", ingest)
    child.once(
      "error",
      InstanceState.bind((err) => {
        job.error = err instanceof Error ? err.message : String(err)
        job.updated = Date.now()
        ProcessEvents.exited(ProcessEvents.info(snapshot(job, limits)))
      }),
    )
    void child.exited
      .then(
        InstanceState.bind((code) => {
          job.exit = code
          job.updated = Date.now()
          ProcessEvents.exited(ProcessEvents.info(snapshot(job, limits)))
          prune()
        }),
      )
      .catch(
        InstanceState.bind((err) => {
          job.error = err instanceof Error ? err.message : String(err)
          job.updated = Date.now()
          ProcessEvents.exited(ProcessEvents.info(snapshot(job, limits)))
          prune()
          log.warn("background process failed", { id: job.id, error: job.error })
        }),
      )

    return snapshot(job, limits)
  }

  export function snapshot(job: Job, limits: { maxLines: number; maxBytes: number }): Snapshot {
    const out = view(job, limits)
    return {
      id: job.id,
      command: job.command,
      cwd: job.cwd,
      sessionID: job.sessionID,
      messageID: job.messageID,
      callID: job.callID,
      pid: job.child.pid,
      started: job.started,
      updated: job.updated,
      status: status(job),
      running: running(job),
      exit: job.exit ?? job.child.exitCode ?? null,
      error: job.error,
      stopped: job.stopped,
      truncated: out.cut,
      output: out.output,
    }
  }

  export function list(limits: { maxLines: number; maxBytes: number }, sessionID?: Tool.Context["sessionID"]) {
    prune()
    return Array.from(background.jobs.values())
      .filter((job) => !sessionID || job.sessionID === sessionID)
      .toSorted((a, b) => b.started - a.started)
      .map((job) => snapshot(job, limits))
  }

  export function read(
    id: string,
    limits: { maxLines: number; maxBytes: number },
    sessionID?: Tool.Context["sessionID"],
  ) {
    prune()
    return snapshot(assertJob(id, sessionID), limits)
  }

  export function output(id: string, offset: number, sessionID?: Tool.Context["sessionID"]): Output {
    prune()
    const job = assertJob(id, sessionID)
    const text = raw(job)
    const start = Math.max(offset, job.base)
    const index = Math.max(0, start - job.base)
    return {
      id: job.id,
      offset: start,
      nextOffset: job.base + text.length,
      output: text.slice(index),
      truncated: job.cut || offset < job.base,
      running: running(job),
      exit: job.exit ?? job.child.exitCode ?? null,
      status: status(job),
      error: job.error,
    }
  }

  export async function stop(
    id: string,
    limits: { maxLines: number; maxBytes: number },
    sessionID?: Tool.Context["sessionID"],
  ) {
    const job = assertJob(id, sessionID)
    if (running(job)) {
      job.stopped = true
      job.updated = Date.now()
      ProcessEvents.updated(ProcessEvents.info(snapshot(job, limits)))
      await Process.stop(job.child)
    }
    const next = snapshot(job, limits)
    ProcessEvents.exited(ProcessEvents.info(next))
    return next
  }

  export async function write(
    id: string,
    text: string,
    limits: { maxLines: number; maxBytes: number },
    sessionID?: Tool.Context["sessionID"],
  ) {
    const job = assertJob(id, sessionID)
    if (!running(job)) throw new Error(`Terminal job is not running: ${id}`)

    const pipe = job.child.stdin
    if (!pipe || pipe.destroyed || !pipe.writable) throw new Error(`Terminal job is not writable: ${id}`)

    await new Promise<void>((resolve, reject) => {
      pipe.write(text, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
    job.updated = Date.now()
    const next = snapshot(job, limits)
    ProcessEvents.updated(ProcessEvents.info(next))
    return next
  }

  export async function clean(limits: { maxLines: number; maxBytes: number }, sessionID?: Tool.Context["sessionID"]) {
    const jobs = Array.from(background.jobs.values()).filter((job) => !sessionID || job.sessionID === sessionID)
    await Promise.all(
      jobs.filter(running).map(async (job) => {
        job.stopped = true
        job.updated = Date.now()
        ProcessEvents.updated(ProcessEvents.info(snapshot(job, limits)))
        await Process.stop(job.child)
        ProcessEvents.exited(ProcessEvents.info(snapshot(job, limits)))
      }),
    )
    for (const job of jobs) {
      background.jobs.delete(job.id)
    }
    return list(limits, sessionID)
  }
}

function native(shell: string, command: string) {
  if (process.platform === "win32" && Shell.ps(shell)) {
    return {
      cmd: [shell, "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
      shell: false,
    }
  }
  return {
    cmd: [command],
    shell,
  }
}

function stop(pid: number | undefined) {
  if (!pid) return "Stop it later from the OS process list if needed."
  if (process.platform === "win32") return `Stop it later with: taskkill /PID ${pid} /T /F`
  return `Stop it later with: kill ${pid}`
}

function registerCleanup() {
  if (cleanup) return
  cleanup = true
  process.once("exit", () => {
    for (const job of background.jobs.values()) {
      if (job.child.exitCode !== null || job.child.signalCode !== null) continue
      job.child.kill()
    }
    background.jobs.clear()
  })
}
// altrucoder_change end

const parse = Effect.fn("BashTool.parse")(function* (command: string, ps: boolean) {
  const tree = yield* Effect.promise(() => parser().then((p) => (ps ? p.ps : p.bash).parse(command)))
  if (!tree) throw new Error("Failed to parse command")
  return tree
})

const ask = Effect.fn("BashTool.ask")(function* (ctx: Tool.Context, scan: Scan, command: string) {
  // altrucoder_change
  if (scan.dirs.size > 0) {
    const globs = Array.from(scan.dirs).map((dir) => {
      if (process.platform === "win32") return AppFileSystem.normalizePathPattern(path.join(dir, "*"))
      return path.join(dir, "*")
    })
    yield* ctx.ask({
      permission: "external_directory",
      patterns: globs,
      always: globs,
      metadata: scan.access === "read" ? { command, access: "read" } : {}, // altrucoder_change
    })
  }

  if (scan.patterns.size === 0) return
  yield* ctx.ask({
    permission: "bash",
    patterns: Array.from(scan.patterns),
    always: Array.from(scan.always),
    metadata: { command }, // altrucoder_change
  })
})

function cmd(shell: string, command: string, cwd: string, env: NodeJS.ProcessEnv) {
  if (process.platform === "win32" && Shell.ps(shell)) {
    return ChildProcess.make(shell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command], {
      cwd,
      env,
      stdin: "ignore",
      detached: false,
    })
  }

  return ChildProcess.make(command, [], {
    shell,
    cwd,
    env,
    stdin: "ignore",
    detached: process.platform !== "win32",
  })
}
const parser = lazy(async () => {
  const { Parser } = await import("web-tree-sitter")
  const { default: treeWasm } = await import("web-tree-sitter/tree-sitter.wasm" as string, {
    with: { type: "wasm" },
  })
  const treePath = resolveWasm(treeWasm)
  await Parser.init({
    locateFile() {
      return treePath
    },
  })
  const { default: bashWasm } = await import("tree-sitter-bash/tree-sitter-bash.wasm" as string, {
    with: { type: "wasm" },
  })
  const { default: psWasm } = await import("tree-sitter-powershell/tree-sitter-powershell.wasm" as string, {
    with: { type: "wasm" },
  })
  const bashPath = resolveWasm(bashWasm)
  const psPath = resolveWasm(psWasm)
  const [bashLanguage, psLanguage] = await Promise.all([Language.load(bashPath), Language.load(psPath)])
  const bash = new Parser()
  bash.setLanguage(bashLanguage)
  const ps = new Parser()
  ps.setLanguage(psLanguage)
  return { bash, ps }
})

// TODO: we may wanna rename this tool so it works better on other shells
export const BashTool = Tool.define<
  typeof Parameters,
  Metadata,
  Config.Service | ChildProcessSpawner | AppFileSystem.Service | Truncate.Service | Plugin.Service
>(
  "bash",
  Effect.gen(function* () {
    const config = yield* Config.Service
    const spawner = yield* ChildProcessSpawner
    const fs = yield* AppFileSystem.Service
    const trunc = yield* Truncate.Service
    const plugin = yield* Plugin.Service
    registerCleanup() // altrucoder_change

    const cygpath = Effect.fn("BashTool.cygpath")(function* (shell: string, text: string) {
      const lines = yield* spawner
        .lines(ChildProcess.make(shell, ["-lc", 'cygpath -w -- "$1"', "_", text]))
        .pipe(Effect.catch(() => Effect.succeed([] as string[])))
      const file = lines[0]?.trim()
      if (!file) return
      return AppFileSystem.normalizePath(file)
    })

    const resolvePath = Effect.fn("BashTool.resolvePath")(function* (text: string, root: string, shell: string) {
      if (process.platform === "win32") {
        if (Shell.posix(shell) && text.startsWith("/") && AppFileSystem.windowsPath(text) === text) {
          const file = yield* cygpath(shell, text)
          if (file) return file
        }
        return AppFileSystem.normalizePath(path.resolve(root, AppFileSystem.windowsPath(text)))
      }
      return path.resolve(root, text)
    })

    const argPath = Effect.fn("BashTool.argPath")(function* (arg: string, cwd: string, ps: boolean, shell: string) {
      const text = ps ? expand(arg, cwd, shell) : home(unquote(arg))
      const file = text && prefix(text)
      if (!file || dynamic(file, ps)) return
      const next = ps ? provider(file) : file
      if (!next) return
      return yield* resolvePath(next, cwd, shell)
    })

    const collect = Effect.fn("BashTool.collect")(function* (
      root: Node,
      cwd: string,
      ps: boolean,
      shell: string,
      instance: InstanceContext,
    ) {
      const scan: Scan = {
        dirs: new Set<string>(),
        patterns: new Set<string>(),
        always: new Set<string>(),
        access: "read", // altrucoder_change
      }

      const nodes = commands(root) // altrucoder_change
      if (root.descendantsOfType("file_redirect").length > 0) scan.access = "unknown" // altrucoder_change
      // altrucoder_change start
      if (nodes.some((node) => !READ.has((ps ? parts(node)[0]?.text.toLowerCase() : parts(node)[0]?.text) ?? ""))) {
        scan.access = "unknown"
      }
      // altrucoder_change end

      for (const node of nodes) {
        // altrucoder_change
        const command = parts(node)
        const tokens = command.map((item) => item.text)
        const cmd = ps ? tokens[0]?.toLowerCase() : tokens[0]

        if (cmd && FILES.has(cmd)) {
          const kind = access(cmd, node) // altrucoder_change
          for (const arg of pathArgs(command, ps)) {
            const resolved = yield* argPath(arg, cwd, ps, shell)
            log.info("resolved path", { arg, resolved })
            if (!resolved || containsPath(resolved, instance)) continue
            const dir = (yield* fs.isDir(resolved)) ? resolved : path.dirname(resolved)
            scan.dirs.add(dir)
            if (kind !== "read") scan.access = "unknown" // altrucoder_change
          }
        }

        if (tokens.length && (!cmd || !CWD.has(cmd))) {
          scan.patterns.add(source(node))
          scan.always.add(BashArity.prefix(tokens).join(" ") + " *")
        }
      }

      return scan
    })

    const shellEnv = Effect.fn("BashTool.shellEnv")(function* (ctx: Tool.Context, cwd: string) {
      const extra = yield* plugin.trigger(
        "shell.env",
        { cwd, sessionID: ctx.sessionID, callID: ctx.callID },
        { env: {} },
      )
      return {
        ...process.env,
        ...extra.env,
      }
    })

    // altrucoder_change start
    const runBackground = Effect.fn("BashTool.runBackground")(function* (
      input: {
        shell: string
        command: string
        cwd: string
        env: NodeJS.ProcessEnv
        timeout: number
        description: string
      },
      ctx: Tool.Context,
    ) {
      const active = BashBackground.count()
      if (active >= MAX_BACKGROUND_JOBS) {
        throw new Error(
          `Too many background terminal jobs are running (${active}/${MAX_BACKGROUND_JOBS}). Use the terminal tool to list or stop jobs before starting another one.`,
        )
      }

      const limits = yield* trunc.limits()
      const keep = limits.maxBytes * 2
      const spec = native(input.shell, input.command)
      const child = Process.spawn(spec.cmd, {
        cwd: input.cwd,
        env: input.env,
        shell: spec.shell,
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      })
      const job: Job = {
        id: randomUUID(),
        child,
        command: input.command,
        cwd: input.cwd,
        sessionID: ctx.sessionID,
        messageID: ctx.messageID,
        callID: ctx.callID,
        started: Date.now(),
        updated: Date.now(),
        list: [],
        used: 0,
        base: 0,
        cut: false,
      }
      background.jobs.set(job.id, job)

      const snap = () => BashBackground.snapshot(job, limits)
      ProcessEvents.started(ProcessEvents.info(snap()))

      const ingest = InstanceState.bind((chunk: Buffer | string) => {
        const text = chunk.toString()
        const out = append(job, text, keep)
        processOutput(job, text, out.offset, out.nextOffset, out.truncated)
      })
      child.stdout?.on("data", ingest)
      child.stderr?.on("data", ingest)
      child.once(
        "error",
        InstanceState.bind((err) => {
          job.error = err instanceof Error ? err.message : String(err)
          job.updated = Date.now()
          ProcessEvents.exited(ProcessEvents.info(snap()))
        }),
      )
      void child.exited
        .then(
          InstanceState.bind((code) => {
            job.exit = code
            job.updated = Date.now()
            ProcessEvents.exited(ProcessEvents.info(snap()))
            prune()
          }),
        )
        .catch(
          InstanceState.bind((err) => {
            job.error = err instanceof Error ? err.message : String(err)
            job.updated = Date.now()
            ProcessEvents.exited(ProcessEvents.info(snap()))
            prune()
            log.warn("background bash job failed", { id: job.id, error: job.error })
          }),
        )

      const pid = child.pid
      const emit = (status: string) =>
        ctx.metadata({
          metadata: {
            output: preview(view(job, limits).output),
            description: input.description,
            background: true,
            jobID: job.id,
            pid,
            status,
          },
        })

      yield* emit("running")

      const abort = Effect.callback<void>((resume) => {
        if (ctx.abort.aborted) return resume(Effect.void)
        const handler = () => resume(Effect.void)
        ctx.abort.addEventListener("abort", handler, { once: true })
        return Effect.sync(() => ctx.abort.removeEventListener("abort", handler))
      })

      const deadline = Date.now() + input.timeout
      let reason: "ready" | "exit" | "timeout" | "abort" | "error" = "timeout"
      let code: number | null = null

      while (true) {
        if (job.error) {
          reason = "error"
          break
        }
        if (job.exit !== undefined) {
          reason = "exit"
          code = job.exit
          break
        }
        if (ready(raw(job))) {
          reason = "ready"
          break
        }

        const remaining = deadline - Date.now()
        if (remaining <= 0) {
          reason = "timeout"
          break
        }

        const event = yield* Effect.raceAll([
          Effect.promise(() =>
            child.exited.then(
              (exit) => ({ kind: "exit" as const, exit }),
              (err) => ({
                kind: "error" as const,
                error: err instanceof Error ? err.message : String(err),
              }),
            ),
          ),
          abort.pipe(Effect.map(() => ({ kind: "abort" as const }))),
          Effect.sleep(`${Math.min(BACKGROUND_POLL_MS, remaining)} millis`).pipe(
            Effect.map(() => ({ kind: "tick" as const })),
          ),
        ])

        if (event.kind === "tick") {
          yield* emit("running")
          continue
        }
        if (event.kind === "abort") {
          reason = "abort"
          yield* Effect.promise(() =>
            Process.stop(child).catch((err) => {
              log.warn("failed to stop aborted background bash job", {
                id: job.id,
                error: err instanceof Error ? err.message : String(err),
              })
            }),
          )
          job.stopped = true
          job.updated = Date.now()
          ProcessEvents.updated(ProcessEvents.info(snap()))
          break
        }
        if (event.kind === "error") {
          reason = "error"
          job.error = event.error
          job.updated = Date.now()
          break
        }
        reason = "exit"
        code = event.exit
        job.exit = event.exit
        job.updated = Date.now()
        break
      }

      const running = reason === "ready" || reason === "timeout"
      if (!running) prune()
      const end = view(job, limits)
      const meta: string[] = []
      if (reason === "ready") meta.push("background command is still running; ready output was detected")
      if (reason === "timeout") {
        meta.push(`background command is still running after monitor timeout ${input.timeout} ms`)
      }
      if (reason === "abort") meta.push("User aborted the command")
      if (reason === "error")
        meta.push(`background command failed to start or stream output: ${job.error ?? "unknown error"}`)
      if (running) meta.push(`Background job id: ${job.id}`)
      if (running && pid) meta.push(`Process id: ${pid}`)
      if (running) meta.push(stop(pid))

      const output =
        end.output + (meta.length > 0 ? "\n\n<bash_metadata>\n" + meta.join("\n") + "\n</bash_metadata>" : "")

      return {
        title: input.description,
        metadata: {
          output: preview(output),
          exit: code,
          description: input.description,
          truncated: end.cut,
          background: true,
          jobID: job.id,
          pid,
          running,
          ready: reason === "ready",
          status: reason,
        },
        output,
      }
    })
    // altrucoder_change end

    const run = Effect.fn("BashTool.run")(function* (
      input: {
        shell: string
        command: string
        cwd: string
        env: NodeJS.ProcessEnv
        timeout: number
        description: string
      },
      ctx: Tool.Context,
    ) {
      const limits = yield* trunc.limits()
      const keep = limits.maxBytes * 2
      let full = ""
      let last = ""
      const list: Chunk[] = []
      let used = 0
      let file = ""
      let sink: ReturnType<typeof createWriteStream> | undefined
      let cut = false
      let expired = false
      let aborted = false

      yield* ctx.metadata({
        metadata: {
          output: "",
          description: input.description,
        },
      })

      const code: number | null = yield* Effect.scoped(
        Effect.gen(function* () {
          const handle = yield* spawner.spawn(cmd(input.shell, input.command, input.cwd, input.env))

          yield* Effect.forkScoped(
            Stream.runForEach(Stream.decodeText(handle.all), (chunk) => {
              const size = Buffer.byteLength(chunk, "utf-8")
              list.push({ text: chunk, size })
              used += size
              while (used > keep && list.length > 1) {
                const item = list.shift()
                if (!item) break
                used -= item.size
                cut = true
              }

              last = preview(last + chunk)

              if (file) {
                sink?.write(chunk)
              } else {
                full += chunk
                if (Buffer.byteLength(full, "utf-8") > limits.maxBytes) {
                  return trunc.write(full).pipe(
                    Effect.andThen((next) =>
                      Effect.sync(() => {
                        file = next
                        cut = true
                        sink = createWriteStream(next, { flags: "a" })
                        full = ""
                      }),
                    ),
                    Effect.andThen(
                      ctx.metadata({
                        metadata: {
                          output: last,
                          description: input.description,
                        },
                      }),
                    ),
                  )
                }
              }

              return ctx.metadata({
                metadata: {
                  output: last,
                  description: input.description,
                },
              })
            }),
          )

          const abort = Effect.callback<void>((resume) => {
            if (ctx.abort.aborted) return resume(Effect.void)
            const handler = () => resume(Effect.void)
            ctx.abort.addEventListener("abort", handler, { once: true })
            return Effect.sync(() => ctx.abort.removeEventListener("abort", handler))
          })

          const timeout = Effect.sleep(`${input.timeout + 100} millis`)

          const exit = yield* Effect.raceAll([
            handle.exitCode.pipe(Effect.map((code) => ({ kind: "exit" as const, code }))),
            abort.pipe(Effect.map(() => ({ kind: "abort" as const, code: null }))),
            timeout.pipe(Effect.map(() => ({ kind: "timeout" as const, code: null }))),
          ])

          if (exit.kind === "abort") {
            aborted = true
            yield* handle.kill({ forceKillAfter: "3 seconds" }).pipe(Effect.orDie)
          }
          if (exit.kind === "timeout") {
            expired = true
            yield* handle.kill({ forceKillAfter: "3 seconds" }).pipe(Effect.orDie)
          }

          return exit.kind === "exit" ? exit.code : null
        }),
      ).pipe(Effect.orDie)

      const meta: string[] = []
      if (expired) {
        meta.push(
          `bash tool terminated command after exceeding timeout ${input.timeout} ms. If this command is expected to take longer and is not waiting for interactive input, retry with a larger timeout value in milliseconds.`,
        )
      }
      if (aborted) meta.push("User aborted the command")
      const raw = list.map((item) => item.text).join("")
      const end = tail(raw, limits.maxLines, limits.maxBytes)
      if (end.cut) cut = true
      if (!file && end.cut) {
        file = yield* trunc.write(raw)
      }

      let output = end.text
      if (!output) output = "(no output)"

      if (cut && file) {
        output = `...output truncated...\n\nFull output saved to: ${file}\n\n` + output
      }

      if (meta.length > 0) {
        output += "\n\n<bash_metadata>\n" + meta.join("\n") + "\n</bash_metadata>"
      }
      if (sink) {
        const stream = sink
        yield* Effect.promise(
          () =>
            new Promise<void>((resolve) => {
              stream.end(() => resolve())
              stream.on("error", () => resolve())
            }),
        )
      }

      return {
        title: input.description,
        metadata: {
          output: last || preview(output),
          exit: code,
          description: input.description,
          truncated: cut,
          ...(cut && file ? { outputPath: file } : {}),
        },
        output,
      }
    })

    return () =>
      Effect.gen(function* () {
        const cfg = yield* config.get()
        const shell = Shell.acceptable(cfg.shell)
        const name = Shell.name(shell)
        const chain =
          name === "powershell"
            ? "If the commands depend on each other and must run sequentially, avoid '&&' in this shell because Windows PowerShell 5.1 does not support it. Use PowerShell conditionals such as `cmd1; if ($?) { cmd2 }` when later commands must depend on earlier success."
            : "If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together (e.g., `git add . && git commit -m \"message\" && git push`). For instance, if one operation must complete before another starts (like mkdir before cp, Write before Bash for git operations, or git add before git commit), run these operations sequentially instead."
        log.info("bash tool using shell", { shell })

        const limits = yield* trunc.limits()
        const instance = yield* InstanceState.context

        return {
          description: DESCRIPTION.replaceAll("${directory}", instance.directory)
            .replaceAll("${tmp}", Global.Path.tmp)
            .replaceAll("${os}", process.platform)
            .replaceAll("${shell}", name)
            .replaceAll("${chaining}", chain)
            .replaceAll("${maxLines}", String(limits.maxLines))
            .replaceAll("${maxBytes}", String(limits.maxBytes)),
          parameters: Parameters,
          execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
            Effect.gen(function* () {
              const executeInstance = yield* InstanceState.context
              const cwd = params.workdir
                ? yield* resolvePath(params.workdir, executeInstance.directory, shell)
                : executeInstance.directory
              if (params.timeout !== undefined && params.timeout < 0) {
                throw new Error(`Invalid timeout value: ${params.timeout}. Timeout must be a positive number.`)
              }
              const timeout = params.timeout ?? DEFAULT_TIMEOUT
              const ps = Shell.ps(shell)
              yield* Effect.scoped(
                Effect.gen(function* () {
                  const tree = yield* Effect.acquireRelease(parse(params.command, ps), (tree) =>
                    Effect.sync(() => tree.delete()),
                  )
                  const scan = yield* collect(tree.rootNode, cwd, ps, shell, executeInstance)
                  // altrucoder_change start
                  if (!containsPath(cwd, executeInstance)) {
                    scan.dirs.add(cwd)
                    scan.access = "unknown"
                  }
                  // altrucoder_change end
                  yield* ask(ctx, scan, params.command) // altrucoder_change
                }),
              )

              const input = {
                shell,
                command: params.command,
                cwd,
                env: yield* shellEnv(ctx, cwd),
                timeout,
                description: params.description ?? params.command, // altrucoder_change
              }

              // altrucoder_change start
              if (params.background) {
                return yield* runBackground(input, ctx)
              }
              // altrucoder_change end

              return yield* run(
                {
                  ...input,
                },
                ctx,
              )
            }),
        }
      })
  }),
)
