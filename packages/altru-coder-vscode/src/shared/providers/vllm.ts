import type { ProviderPreset } from './types'

export const VllmPreset: ProviderPreset = {
    id: "vllm",
    name: "vLLM",
    baseURL: "http://localhost:8000/v1",
    note: "Fetch models from a local vLLM OpenAI server.",
    models: [
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
      { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B" },
    ],
    local: true,
  }

