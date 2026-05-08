import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  tool: Schema.String,
  error: Schema.String,
})

// altrucoder_change start - distinguish unavailable tools from schema errors for OSS model recovery
export function format(params: { error: string }) {
  if (params.error.includes("Model tried to call unavailable tool")) return params.error
  return `The arguments provided to the tool are invalid: ${params.error}`
}
// altrucoder_change end

export const InvalidTool = Tool.define(
  "invalid",
  Effect.succeed({
    description: "Do not use",
    parameters: Parameters,
    execute: (params: { tool: string; error: string }) =>
      Effect.succeed({
        title: params.error.includes("Model tried to call unavailable tool") ? "Unavailable Tool" : "Invalid Tool", // altrucoder_change
        output: format(params), // altrucoder_change
        metadata: {},
      }),
  }),
)
