import type { ProviderPreset } from './types'

export const TextGenWebuiPreset: ProviderPreset = {
    id: "text-gen-webui",
    name: "Text Generation WebUI",
    baseURL: "http://localhost:5000/v1",
    note: "Fetch models from a local text-generation-webui server.",
    models: [
      { id: "mistral-7b", name: "Mistral 7B" },
      { id: "codellama-34b", name: "CodeLlama 34B" },
    ],
    local: true,
  }

