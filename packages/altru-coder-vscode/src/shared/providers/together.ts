import type { ProviderPreset } from './types'

export const TogetherPreset: ProviderPreset = {
    id: "together",
    name: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    note: "Fetch Together hosted open models.",
    models: [
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B Turbo" },
      { id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", name: "Llama 3.1 70B Turbo" },
      { id: "codellama/CodeLlama-70b-Instruct-hf", name: "CodeLlama 70B" },
      { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", name: "Mixtral 8x7B" },
    ],
  }

