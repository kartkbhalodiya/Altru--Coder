import type { ProviderPreset } from './types'

export const NovitaPreset: ProviderPreset = {
    id: "novita",
    name: "Novita AI",
    baseURL: "https://api.novita.ai/v3/openai",
    note: "Fetch Novita OpenAI-compatible models.",
    models: [
      { id: "deepseek-r1", name: "DeepSeek R1", reasoning: true },
      { id: "deepseek_v3", name: "DeepSeek V3" },
      { id: "llama3.1-405b", name: "Llama 3.1 405B" },
      { id: "llama3.3-70b", name: "Llama 3.3 70B" },
    ],
  }

