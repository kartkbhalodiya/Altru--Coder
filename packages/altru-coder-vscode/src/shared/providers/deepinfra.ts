import type { ProviderPreset } from './types'

export const DeepinfraPreset: ProviderPreset = {
    id: "deepinfra",
    name: "DeepInfra",
    baseURL: "https://api.deepinfra.com/v1/openai",
    note: "Fetch DeepInfra OpenAI-compatible models.",
    models: [
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct", name: "Llama 3.1 405B" },
    ],
  }

