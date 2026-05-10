import type { ProviderPreset } from "./types"

export const LlamacppPreset: ProviderPreset = {
  id: "llamacpp",
  name: "llama.cpp",
  baseURL: "http://localhost:8080/v1",
  note: "Fetch models from a local llama.cpp server.",
  models: [
    { id: "qwen2.5-coder:7b", name: "Qwen2.5 Coder 7B" },
    { id: "llama3.1:8b", name: "Llama 3.1 8B" },
  ],
  local: true,
}
