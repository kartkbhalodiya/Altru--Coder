import type { ProviderPreset } from "./types"

export const SiliconflowPreset: ProviderPreset = {
  id: "siliconflow",
  name: "SiliconFlow",
  baseURL: "https://api.siliconflow.cn/v1",
  note: "Fetch SiliconFlow models.",
  models: [
    { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
    { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
    { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
    { id: "nvidia/Llama-3.1-Nemotron-70B-Instruct", name: "Nemotron 70B" },
  ],
}
