import type { ProviderPreset } from "./types"

export const LlamastackPreset: ProviderPreset = {
  id: "llamastack",
  name: "Llama Stack",
  baseURL: "http://localhost:8321/v1/openai/v1",
  note: "Fetch models from a local Llama Stack server.",
  models: [
    { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama 3.1 8B" },
    { id: "meta-llama/Llama-3.1-70B-Instruct", name: "Llama 3.1 70B" },
  ],
  local: true,
}
