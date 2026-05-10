import type { AltruCoderClient, Event, ThreadRealtimeEvent } from "@altru-coder/sdk/v2/client"

export type ThreadSSEEventHandler = (event: Event, directory?: string) => void
export type ThreadSSEErrorHandler = (error: Error) => void
export type ThreadSSEState = "connecting" | "connected" | "disconnected"
export type ThreadSSEStateHandler = (state: ThreadSSEState) => void

export class ThreadSSEAdapter {
  private readonly events = new Set<ThreadSSEEventHandler>()
  private readonly errors = new Set<ThreadSSEErrorHandler>()
  private readonly states = new Set<ThreadSSEStateHandler>()
  private abort: AbortController | null = null
  private attempt: AbortController | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  private static readonly HEARTBEAT_MS = 15_000
  private static readonly RETRY_MS = 250

  constructor(
    private readonly client: AltruCoderClient,
    readonly sessionID: string,
    readonly directory: string,
  ) {}

  connect(): void {
    if (this.abort) return
    this.abort = new AbortController()
    this.state("connecting")
    void this.consume(this.abort.signal).catch((err) => {
      const error = err instanceof Error ? err : new Error(String(err))
      this.error(error)
    })
  }

  disconnect(): void {
    this.abort?.abort()
    this.abort = null
    this.attempt = null
    this.clear()
  }

  dispose(): void {
    this.disconnect()
    this.events.clear()
    this.errors.clear()
    this.states.clear()
  }

  onEvent(handler: ThreadSSEEventHandler): () => void {
    this.events.add(handler)
    return () => this.events.delete(handler)
  }

  onError(handler: ThreadSSEErrorHandler): () => void {
    this.errors.add(handler)
    return () => this.errors.delete(handler)
  }

  onStateChange(handler: ThreadSSEStateHandler): () => void {
    this.states.add(handler)
    return () => this.states.delete(handler)
  }

  private async consume(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      const ctrl = new AbortController()
      const abort = () => ctrl.abort()
      signal.addEventListener("abort", abort)
      this.attempt = ctrl

      try {
        const stream = await this.client.experimental.thread.subscribe(
          { sessionID: this.sessionID, directory: this.directory },
          {
            signal: ctrl.signal,
            sseMaxRetryAttempts: 1,
            onSseError: (err) => {
              if (signal.aborted) return
              if (err instanceof DOMException && err.name === "AbortError") return
              this.error(err instanceof Error ? err : new Error(String(err)))
            },
          },
        )

        this.state("connected")
        this.pulse(ctrl)

        for await (const item of stream.stream) {
          if (signal.aborted) break
          this.pulse(ctrl)
          const event = item as ThreadRealtimeEvent
          const payload = event.payload as { type?: string } | undefined
          if (!payload?.type || payload.type === "thread.connected" || payload.type === "thread.heartbeat") continue
          this.emit(payload as Event, event.directory ?? this.directory)
        }
      } catch (err) {
        const aborted = signal.aborted || (err instanceof DOMException && err.name === "AbortError")
        if (!aborted) this.error(err instanceof Error ? err : new Error(String(err)))
      } finally {
        signal.removeEventListener("abort", abort)
        this.attempt = null
        this.clear()
      }

      if (signal.aborted) break
      this.state("connecting")
      await new Promise((resolve) => setTimeout(resolve, ThreadSSEAdapter.RETRY_MS))
    }

    this.state("disconnected")
  }

  private pulse(ctrl: AbortController): void {
    this.clear()
    this.timer = setTimeout(() => ctrl.abort(), ThreadSSEAdapter.HEARTBEAT_MS)
  }

  private clear(): void {
    if (!this.timer) return
    clearTimeout(this.timer)
    this.timer = null
  }

  private emit(event: Event, directory?: string): void {
    for (const handler of this.events) {
      try {
        handler(event, directory)
      } catch (err) {
        console.error("[Altru Coder New] ThreadSSE: event handler failed", err)
      }
    }
  }

  private error(error: Error): void {
    for (const handler of this.errors) {
      try {
        handler(error)
      } catch (err) {
        console.error("[Altru Coder New] ThreadSSE: error handler failed", err)
      }
    }
  }

  private state(state: ThreadSSEState): void {
    for (const handler of this.states) {
      try {
        handler(state)
      } catch (err) {
        console.error("[Altru Coder New] ThreadSSE: state handler failed", err)
      }
    }
  }
}
