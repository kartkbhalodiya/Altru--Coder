import { Bus } from "@/bus"
import { BusEvent } from "@/bus/bus-event"
import { MessageID, SessionID } from "@/session/schema"
import * as Log from "@opencode-ai/core/util/log"
import { Schema } from "effect"

const log = Log.create({ service: "process-events" })

const Info = Schema.Struct({
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
})

const Output = Schema.Struct({
  processID: Schema.String,
  id: Schema.String,
  sessionID: SessionID,
  messageID: MessageID,
  callID: Schema.optional(Schema.String),
  offset: Schema.Number,
  nextOffset: Schema.Number,
  output: Schema.String,
  truncated: Schema.Boolean,
  running: Schema.Boolean,
  exit: Schema.NullOr(Schema.Number),
  status: Schema.String,
  error: Schema.optional(Schema.String),
})

export namespace ProcessEvents {
  export type Info = typeof Info.Type
  export type Output = typeof Output.Type
  export type Snapshot = Omit<Info, "processID">

  export const Event = {
    Started: BusEvent.define("process.started", Info),
    Output: BusEvent.define("process.output", Output),
    Exited: BusEvent.define("process.exited", Info),
    Updated: BusEvent.define("process.updated", Info),
  }

  export function info(input: Snapshot): Info {
    return {
      processID: input.id,
      ...input,
    }
  }

  export function started(input: Info) {
    publish(Event.Started, input)
  }

  export function output(input: Output) {
    publish(Event.Output, input)
  }

  export function exited(input: Info) {
    publish(Event.Exited, input)
  }

  export function updated(input: Info) {
    publish(Event.Updated, input)
  }

  function publish(def: BusEvent.Definition, props: Info | Output) {
    void Bus.publish(def, props).catch((err) => {
      log.warn("failed to publish process event", {
        type: def.type,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
}
