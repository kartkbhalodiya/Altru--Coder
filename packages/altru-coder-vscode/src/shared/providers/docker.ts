import type { ProviderPreset } from './types'

export const DockerPreset: ProviderPreset = {
    id: "docker",
    name: "Docker Model Runner",
    baseURL: "http://localhost:12434/engines/v1",
    note: "Fetch local Docker model runner models.",
    models: [
      { id: "ai/llama3.1", name: "Llama 3.1" },
      { id: "ai/qwen2.5-coder", name: "Qwen2.5 Coder" },
    ],
    local: true,
  }

