import type { ProviderPreset } from './types'

export const VenicePreset: ProviderPreset = {
    id: "venice",
    name: "Venice",
    baseURL: "https://api.venice.ai/api/v1",
    note: "Fetch Venice OpenAI-compatible models.",
    models: [
      { id: "llama-3.3-70b", name: "Llama 3.3 70B" },
      { id: "qwen-2.5-coder-32b", name: "Qwen2.5 Coder 32B" },
      { id: "deepseek-r1", name: "DeepSeek R1", reasoning: true },
    ],
  }

