import type { ProviderPreset } from './types'

export const OvhcloudPreset: ProviderPreset = {
    id: "ovhcloud",
    name: "OVHcloud",
    baseURL: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    note: "Fetch OVHcloud OpenAI-compatible models.",
    models: [
      { id: "Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
      { id: "Qwen3-Coder-30B-A3B-Instruct", name: "Qwen3 Coder 30B" },
      { id: "gpt-oss-120b", name: "GPT OSS 120B" },
      { id: "DeepSeek-R1-Distill-Llama-70B", name: "DeepSeek R1 Distill 70B", reasoning: true },
    ],
  }

