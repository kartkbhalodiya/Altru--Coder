import type { ProviderPreset } from "./types"

export const FunctionNetworkPreset: ProviderPreset = {
  id: "function-network",
  name: "Function Network",
  baseURL: "https://api.function.network/v1",
  note: "Fetch Function Network OpenAI-compatible models.",
  models: [
    { id: "deepseek-r1", name: "DeepSeek R1", reasoning: true },
    { id: "qwen2.5-coder-32b", name: "Qwen2.5 Coder 32B" },
  ],
}
