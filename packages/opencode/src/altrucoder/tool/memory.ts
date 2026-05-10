// altrucoder_change - new file
import { Effect, Schema } from "effect"
import { InstanceState } from "@/effect/instance-state"
import * as Tool from "@/tool/tool"
import { AltruCoderMemory } from "@/altrucoder/memory"
import DESCRIPTION from "./memory.txt"

const Parameters = Schema.Struct({
  mode: Schema.Literals(["remember", "consolidate", "search", "list"]).annotate({
    description:
      "remember stores a durable memory, consolidate writes a project memory summary, search finds memories, list returns recent memories",
  }),
  text: Schema.optional(Schema.String).annotate({
    description: "Memory text to store when mode is remember",
  }),
  query: Schema.optional(Schema.String).annotate({
    description: "Search query when mode is search",
  }),
  kind: Schema.optional(Schema.Literals(["project", "preference", "decision", "fact", "summary"])).annotate({
    description: "Memory kind when storing a memory",
  }),
  limit: Schema.optional(Schema.Number).annotate({
    description: "Maximum records to return for search/list",
  }),
})

interface MemoryMetadata {
  count?: number
  id?: string
  kind?: AltruCoderMemory.Kind
  rawPath?: string
  summaryPath?: string
}

export const MemoryTool = Tool.define<typeof Parameters, MemoryMetadata, never>(
  "altru_coder_memory",
  Effect.gen(function* () {
    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const state = yield* InstanceState.context
          const limit = Math.min(Math.max(params.limit ?? 12, 1), 50)
          const pattern = params.text ?? params.query ?? params.mode

          yield* ctx.ask({
            permission: "memory",
            patterns: [pattern],
            always: [params.mode],
            metadata: {
              mode: params.mode,
              kind: params.kind,
              query: params.query,
            },
          })

          if (params.mode === "search") {
            const records = yield* Effect.promise(() =>
              AltruCoderMemory.search(state.project.id, params.query ?? "", limit),
            )
            return {
              title: `Memory search: ${params.query ?? ""}`,
              output: AltruCoderMemory.format(records),
              metadata: { count: records.length },
            }
          }

          if (params.mode === "list") {
            const records = yield* Effect.promise(() => AltruCoderMemory.all(state.project.id))
            const sliced = records.slice(0, limit)
            return {
              title: "Project memory",
              output: AltruCoderMemory.format(sliced),
              metadata: { count: sliced.length },
            }
          }

          if (params.mode === "consolidate") {
            const result = yield* Effect.promise(() => AltruCoderMemory.consolidate(state.project.id, limit))
            return {
              title: "Memory consolidated",
              output: [result.summary, "", `Summary: ${result.summaryPath}`, `Raw memories: ${result.rawPath}`].join(
                "\n",
              ),
              metadata: {
                count: result.count,
                rawPath: result.rawPath,
                summaryPath: result.summaryPath,
              },
            }
          }

          if (!params.text?.trim()) throw new Error("text is required when storing memory")

          const record = yield* Effect.promise(() =>
            AltruCoderMemory.remember({
              projectID: state.project.id,
              text: params.text ?? "",
              kind: params.kind,
              citation: {
                sessionID: ctx.sessionID,
                messageID: ctx.messageID,
                callID: ctx.callID,
              },
            }),
          )
          return {
            title: "Stored project memory",
            output: AltruCoderMemory.format([record]),
            metadata: { id: record.id, kind: record.kind },
          }
        }).pipe(Effect.orDie),
    }
  }),
)
