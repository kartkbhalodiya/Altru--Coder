import type { ProviderPreset } from "./types"

export const LmstudioPreset: ProviderPreset = {
  id: "lmstudio",
  name: "LM Studio",
  baseURL: "http://localhost:1234/v1",
  note: "Fetch models from your local LM Studio server.",
  models: [
    { id: "qwen2.5-coder-32b-instruct", name: "Qwen2.5 Coder 32B" },
    { id: "llama-3.1-8b-instruct", name: "Llama 3.1 8B" },
  ],
  local: true,
}
