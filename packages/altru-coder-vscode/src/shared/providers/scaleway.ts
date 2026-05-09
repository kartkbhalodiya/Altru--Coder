import type { ProviderPreset } from './types'

export const ScalewayPreset: ProviderPreset = {
    id: "scaleway",
    name: "Scaleway",
    baseURL: "https://api.scaleway.ai/v1",
    note: "Fetch Scaleway generative APIs models.",
    models: [
      { id: "qwen3-coder-30b-a3b-instruct", name: "Qwen3 Coder 30B" },
      { id: "qwen2.5-coder-32b-instruct", name: "Qwen2.5 Coder 32B" },
      { id: "gpt-oss-120b", name: "GPT OSS 120B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B", reasoning: true },
    ],
  }

