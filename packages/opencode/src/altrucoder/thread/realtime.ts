import { GlobalBus, type GlobalEvent } from "@/bus/global"
import { Effect, Queue, Stream } from "effect"
import { HttpServerResponse } from "effect/unstable/http"
import * as Sse from "effect/unstable/encoding/Sse"

type Json = Record<string, unknown>

export namespace ThreadRealtime {
  export type Event = {
    sessionID: string
    directory?: string
    project?: string
    workspace?: string
    payload: unknown
  }

  export const headers = {
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
  }

  export function json(input: unknown) {
    return JSON.parse(JSON.stringify(input)) as unknown
  }

  export function connected(sessionID: string): Event {
    return {
      sessionID,
      payload: {
        type: "thread.connected",
        properties: { sessionID },
      },
    }
  }

  export function heartbeat(sessionID: string): Event {
    return {
      sessionID,
      payload: {
        type: "thread.heartbeat",
        properties: { sessionID },
      },
    }
  }

  export function data(input: Event) {
    return JSON.stringify(json(input))
  }

  export function path(pathname: string) {
    const match = pathname.match(/\/experimental\/thread\/([^/]+)\/subscribe$/)
    return match ? decodeURIComponent(match[1]) : undefined
  }

  export function fromGlobal(sessionID: string, event: GlobalEvent): Event | undefined {
    if (owner(event) !== sessionID) return
    return json({
      sessionID,
      directory: event.directory,
      project: event.project,
      workspace: event.workspace,
      payload: event.payload,
    }) as Event
  }

  export function response(sessionID: string) {
    const events = Stream.callback<Event>((queue) => {
      const handler = (event: GlobalEvent) => {
        const next = fromGlobal(sessionID, event)
        if (next) Queue.offerUnsafe(queue, next)
      }
      return Effect.acquireRelease(
        Effect.sync(() => {
          GlobalBus.on("event", handler)
          Queue.offerUnsafe(queue, connected(sessionID))
        }),
        () => Effect.sync(() => GlobalBus.off("event", handler)),
      )
    })
    const pulse = Stream.tick("10 seconds").pipe(
      Stream.drop(1),
      Stream.map(() => heartbeat(sessionID)),
    )

    return HttpServerResponse.stream(
      events.pipe(
        Stream.merge(pulse, { haltStrategy: "left" }),
        Stream.map((event): Sse.Event => ({ _tag: "Event", event: "message", id: undefined, data: data(event) })),
        Stream.pipeThroughChannel(Sse.encode()),
        Stream.encodeText,
      ),
      {
        contentType: "text/event-stream",
        headers,
      },
    )
  }

  function owner(event: GlobalEvent) {
    const payload = object(event.payload)
    const props = object(payload?.properties)
    const direct = text(props, "sessionID") ?? text(payload, "sessionID")
    if (direct) return direct

    const info = object(props?.info)
    const type = text(payload, "type")
    const nested =
      text(info, "sessionID") ??
      (type === "session.created" || type === "session.updated" ? text(info, "id") : undefined)
    if (nested) return nested

    const part = object(props?.part)
    const partSession = text(part, "sessionID")
    if (partSession) return partSession

    const sync = object(payload?.syncEvent)
    const aggregate = text(sync, "aggregateID")
    if (aggregate) return aggregate

    const data = object(sync?.data)
    return text(data, "sessionID") ?? text(object(data?.info), "sessionID") ?? text(object(data?.info), "id")
  }

  function object(input: unknown): Json | undefined {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return
    return input as Json
  }

  function text(input: Json | undefined, key: string) {
    const value = input?.[key]
    return typeof value === "string" ? value : undefined
  }
}
