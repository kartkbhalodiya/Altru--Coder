import type { ProviderPreset } from "./types"

export const LlamafilePreset: ProviderPreset = {
  id: "llamafile",
  name: "Llamafile",
  baseURL: "http://localhost:8080/v1",
  note: "Fetch models from a local llamafile server.",
  models: [
    { id: "llama3.1:8b", name: "Llama 3.1 8B" },
    { id: "codellama:7b-instruct", name: "CodeLlama 7B" },
  ],
  local: true,
}
