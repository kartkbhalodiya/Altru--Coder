import type { ProviderPreset } from './types'

export const OllamaPreset: ProviderPreset = {
    id: "ollama",
    name: "Ollama",
    baseURL: "http://localhost:11434/v1",
    note: "Fetch models from your local Ollama server.",
    models: [
      { id: "llama3.1:8b", name: "Llama 3.1 8B" },
      { id: "qwen2.5-coder:7b", name: "Qwen2.5 Coder 7B" },
      { id: "qwen2.5-coder:32b", name: "Qwen2.5 Coder 32B" },
    ],
    local: true,
  }

