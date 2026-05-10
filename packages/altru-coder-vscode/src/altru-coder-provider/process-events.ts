import type { Event } from "@altru-coder/sdk/v2/client"
import type { PartUpdate } from "../shared/stream-messages"

export type ProcessEvent = Extract<
  Event,
  { type: "process.started" | "process.output" | "process.exited" | "process.updated" }
>

type View = {
  output: string
  command?: string
  cwd?: string
  started?: number
  updated?: number
  pid?: number
  status?: string
  running?: boolean
  exit?: number | null
  error?: string
  truncated?: boolean
  sessionID: string
  messageID: string
  callID: string
}

export class ProcessEventBridge {
  private readonly parts = new Map<string, string>()
  private readonly views = new Map<string, View>()

  record(event: Event): void {
    if (event.type !== "message.part.updated") return
    const part = event.properties.part as {
      id?: string
      type?: string
      callID?: string
      messageID?: string
    }
    if (part.type !== "tool" || !part.id || !part.messageID || !part.callID) return
    this.parts.set(key(part.messageID, part.callID), part.id)
  }

  message(event: ProcessEvent): PartUpdate | undefined {
    const props = event.properties
    if (!props.callID) return

    const id = props.processID || props.id
    const prev = this.views.get(id)
    const view = build(event, props.callID, prev)
    this.views.set(id, view)

    const partID = this.parts.get(key(props.messageID, props.callID))
    if (!partID) return

    return {
      type: "partUpdated",
      sessionID: props.sessionID,
      messageID: props.messageID,
      part: part(partID, id, view),
    }
  }

  clear(): void {
    this.parts.clear()
    this.views.clear()
  }

  clearSession(sessionID: string): void {
    for (const [id, view] of this.views) {
      if (view.sessionID === sessionID) this.views.delete(id)
    }
  }
}

function key(messageID: string, callID: string): string {
  return `${messageID}\u0000${callID}`
}

function build(event: ProcessEvent, callID: string, prev: View | undefined): View {
  const props = event.properties
  return {
    output:
      event.type === "process.output"
        ? merge(prev?.output ?? "", event.properties.offset, event.properties.output, event.properties.truncated)
        : props.output,
    command: "command" in props ? props.command : prev?.command,
    cwd: "cwd" in props ? props.cwd : prev?.cwd,
    started: "started" in props ? props.started : prev?.started,
    updated: "updated" in props ? props.updated : prev?.updated,
    pid: "pid" in props ? props.pid : prev?.pid,
    status: props.status,
    running: props.running,
    exit: props.exit,
    error: props.error,
    truncated: props.truncated,
    sessionID: props.sessionID,
    messageID: props.messageID,
    callID,
  }
}

function part(partID: string, id: string, view: View) {
  const status = view.error ? "error" : view.running ? "running" : "completed"
  const input = {
    command: view.command ?? "",
    description: view.command ?? "Background shell",
  }
  const metadata = {
    output: view.output,
    background: true,
    processID: id,
    jobID: id,
    pid: view.pid,
    cwd: view.cwd,
    status: view.status,
    truncated: view.truncated,
    exit: view.exit,
  }
  const time =
    status === "running"
      ? { start: view.started ?? Date.now() }
      : { start: view.started ?? Date.now(), end: view.updated ?? Date.now() }

  return {
    id: partID,
    sessionID: view.sessionID,
    messageID: view.messageID,
    type: "tool",
    callID: view.callID,
    tool: "bash",
    metadata,
    state:
      status === "error"
        ? { status, input, error: view.error ?? "Process failed", metadata, time }
        : { status, input, output: view.output, title: input.description, metadata, time },
  }
}

function merge(current: string, offset: number, chunk: string, truncated: boolean): string {
  if (offset <= current.length) return current.slice(0, offset) + chunk
  const prefix = truncated ? "...output truncated...\n\n" : current
  return prefix + chunk
}
