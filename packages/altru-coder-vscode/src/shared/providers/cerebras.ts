import type { ProviderPreset } from "./types"

export const CerebrasPreset: ProviderPreset = {
  id: "cerebras",
  name: "Cerebras",
  baseURL: "https://api.cerebras.ai/v1",
  note: "Select Cerebras hosted inference models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "zai-glm-4.7", name: "Zai Glm 4.7" },
    { id: "gpt-oss-120b", name: "Gpt Oss 120b" },
    { id: "qwen-3-235b-a22b-instruct-2507", name: "Qwen 3 235b A22b Instruct 2507" },
  ],
}
