import type { ProviderPreset, ProviderPresetModel } from "./types"

const variants = Object.fromEntries(
  ["low", "medium", "high", "xhigh"].map((reasoningEffort) => [reasoningEffort, { reasoningEffort }]),
)

function model(id: string, name: string, reasoning = false): ProviderPresetModel {
  if (!reasoning) return { id, name }
  return { id, name, reasoning, variants }
}

export const SambanovaPreset: ProviderPreset = {
  id: "sambanova",
  name: "SambaNova",
  baseURL: "https://api.sambanova.ai/v1",
  note: "Seeded from SambaNova official /models catalog (8 models). Use Refresh after entering an API key if the provider changes it.",
  fetch: true,
  models: [
    model("DeepSeek-V3.1", "DeepSeek-V3.1", true),
    model("DeepSeek-V3.2", "DeepSeek-V3.2", true),
    model("gemma-3-12b-it", "gemma-3-12b-it", false),
    model("gpt-oss-120b", "gpt-oss-120b", true),
    model("Llama-4-Maverick-17B-128E-Instruct", "Llama-4-Maverick-17B-128E-Instruct", false),
    model("Meta-Llama-3.3-70B-Instruct", "Meta-Llama-3.3-70B-Instruct", false),
    model("MiniMax-M2.5", "MiniMax-M2.5", true),
    model("MiniMax-M2.7", "MiniMax-M2.7", true),
  ],
}
