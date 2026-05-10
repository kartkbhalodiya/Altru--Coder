// altrucoder_change - new file
import { Effect, Schema } from "effect"
import { BashBackground } from "@/tool/bash"
import { Truncate } from "@/tool/truncate"
import * as Tool from "@/tool/tool"
import DESCRIPTION from "./terminal.txt"

const Params = Schema.Struct({
  mode: Schema.Literals(["list", "read", "write", "stop", "clean"]).annotate({
    description:
      "list shows background terminal jobs, read returns one job output, write sends stdin to one running job, stop terminates one job, clean stops and removes this session's jobs",
  }),
  jobID: Schema.optional(Schema.String).annotate({
    description: "Background terminal job id. Required for read, write, and stop.",
  }),
  input: Schema.optional(Schema.String).annotate({
    description: "Text to write to the background job stdin. Required for write.",
  }),
  newline: Schema.optional(Schema.Boolean).annotate({
    description: "Append a newline after input when writing. Defaults to false.",
  }),
})

type Meta = {
  count?: number
  jobID?: string
  status?: string
  running?: boolean
  exit?: number | null
  truncated?: boolean
  written?: number
}

const cause = (err: unknown) => (err instanceof Error ? err : new Error(String(err)))

function fail(title: string, output: string, metadata: Meta = {}): Tool.ExecuteResult<Meta> {
  return {
    title,
    output,
    metadata: { ...metadata, truncated: false },
  }
}

function head(job: BashBackground.Snapshot) {
  return [
    `job_id: ${job.id}`,
    `status: ${job.status}`,
    `running: ${job.running ? "yes" : "no"}`,
    `exit: ${job.exit === null ? "null" : job.exit}`,
    job.pid ? `pid: ${job.pid}` : undefined,
    `cwd: ${job.cwd}`,
    `command: ${job.command}`,
  ]
    .filter(Boolean)
    .join("\n")
}

function list(jobs: BashBackground.Snapshot[]) {
  if (jobs.length === 0) return "No background terminal jobs for this session."
  return jobs
    .map((job) =>
      [
        `job_id: ${job.id}`,
        `status: ${job.status}`,
        `pid: ${job.pid ?? "unknown"}`,
        `exit: ${job.exit === null ? "null" : job.exit}`,
        `cwd: ${job.cwd}`,
        `command: ${job.command}`,
      ].join("\n"),
    )
    .join("\n\n")
}

export const TerminalTool = Tool.define<typeof Params, Meta, Truncate.Service, "terminal">(
  "terminal",
  Effect.gen(function* () {
    const trunc = yield* Truncate.Service
    return {
      description: DESCRIPTION,
      parameters: Params,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          const pattern = params.jobID ?? params.mode
          yield* ctx.ask({
            permission: "terminal",
            patterns: [params.mode === "write" && params.jobID ? `write:${params.jobID}` : pattern],
            always: [params.mode],
            metadata: {
              mode: params.mode,
              jobID: params.jobID,
              ...(params.input !== undefined ? { inputLength: params.input.length } : {}),
            },
          })

          const limits = yield* trunc.limits()

          if (params.mode === "list") {
            const jobs = BashBackground.list(limits, ctx.sessionID)
            return {
              title: `Terminal jobs (${jobs.length})`,
              output: list(jobs),
              metadata: { count: jobs.length, truncated: jobs.some((job) => job.truncated) },
            }
          }

          if (params.mode === "clean") {
            const jobs = BashBackground.list(limits, ctx.sessionID)
            const cleaned = yield* Effect.tryPromise({
              try: () => BashBackground.clean(limits, ctx.sessionID),
              catch: cause,
            }).pipe(Effect.catch((err) => Effect.succeed(cause(err))))
            if (cleaned instanceof Error) {
              return fail("Clean terminal jobs failed", cleaned.message, { count: jobs.length })
            }
            return {
              title: "Cleaned terminal jobs",
              output: `Stopped and removed ${jobs.length} background terminal job${jobs.length === 1 ? "" : "s"}.`,
              metadata: { count: jobs.length, truncated: false },
            }
          }

          const id = params.jobID?.trim()
          if (!id) return fail("Terminal job id required", `jobID is required when terminal mode is ${params.mode}`)

          if (params.mode === "stop") {
            const job = yield* Effect.tryPromise({
              try: () => BashBackground.stop(id, limits, ctx.sessionID),
              catch: cause,
            }).pipe(Effect.catch((err) => Effect.succeed(cause(err))))
            if (job instanceof Error) return fail("Stop terminal job failed", job.message, { jobID: id })
            return {
              title: `Stopped terminal job ${job.id}`,
              output: [head(job), "", "Stop signal sent."].join("\n"),
              metadata: {
                jobID: job.id,
                status: job.status,
                running: job.running,
                exit: job.exit,
                truncated: job.truncated,
              },
            }
          }

          if (params.mode === "write") {
            if (params.input === undefined)
              return fail("Terminal input required", "input is required in write mode", { jobID: id })
            const text = params.newline ? `${params.input}\n` : params.input
            const job = yield* Effect.tryPromise({
              try: () => BashBackground.write(id, text, limits, ctx.sessionID),
              catch: cause,
            }).pipe(Effect.catch((err) => Effect.succeed(cause(err))))
            if (job instanceof Error) return fail("Write terminal input failed", job.message, { jobID: id })
            const bytes = Buffer.byteLength(text, "utf-8")
            return {
              title: `Wrote terminal input ${job.id}`,
              output: [head(job), "", `Wrote ${bytes} byte${bytes === 1 ? "" : "s"} to stdin.`].join("\n"),
              metadata: {
                jobID: job.id,
                status: job.status,
                running: job.running,
                exit: job.exit,
                truncated: job.truncated,
                written: bytes,
              },
            }
          }

          const job = yield* Effect.try({
            try: () => BashBackground.read(id, limits, ctx.sessionID),
            catch: cause,
          }).pipe(Effect.catch((err) => Effect.succeed(cause(err))))
          if (job instanceof Error) return fail("Read terminal job failed", job.message, { jobID: id })
          return {
            title: `Terminal job ${job.id}`,
            output: [head(job), "", "<output>", job.output, "</output>"].join("\n"),
            metadata: {
              jobID: job.id,
              status: job.status,
              running: job.running,
              exit: job.exit,
              truncated: job.truncated,
            },
          }
        }),
    }
  }),
)
