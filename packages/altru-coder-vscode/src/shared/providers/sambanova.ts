import type { ProviderPreset } from './types'

export const SambanovaPreset: ProviderPreset = {
  id: "sambanova",
  name: "SambaNova",
  baseURL: "https://api.sambanova.ai/v1",
  note: "Select SambaNova cloud models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "DeepSeek-R1-0528", name: "DeepSeek R1 0528" },
    { id: "DeepSeek-R1-Distill-Llama-70B", name: "DeepSeek R1 Distill Llama 70B" },
    { id: "DeepSeek-V3-0324", name: "DeepSeek V3 0324" },
    { id: "DeepSeek-V3.1", name: "DeepSeek V3.1" },
    { id: "DeepSeek-V3.1-Terminus", name: "DeepSeek V3.1 Terminus" },
    { id: "Llama-4-Maverick-17B-128E-Instruct", name: "Llama 4 Maverick 17B 128E Instruct" },
    { id: "Meta-Llama-3.1-8B-Instruct", name: "Meta Llama 3.1 8B Instruct" },
    { id: "Meta-Llama-3.3-70B-Instruct", name: "Meta Llama 3.3 70B Instruct" },
    { id: "MiniMax-M2.5", name: "MiniMax M2.5" },
    { id: "Qwen3-235B", name: "Qwen3 235B" },
    { id: "Qwen3-32B", name: "Qwen3 32B" },
  ],
}
