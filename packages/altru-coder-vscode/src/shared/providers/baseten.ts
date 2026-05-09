import type { ProviderPreset } from './types'

export const BasetenPreset: ProviderPreset = {
  id: "baseten",
  name: "Baseten",
  baseURL: "https://inference.baseten.co/v1",
  note: "Select Baseten inference models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "moonshotai/Kimi-K2-Thinking", name: "Kimi K2 Thinking", reasoning: true },
    { id: "zai-org/GLM-4.6", name: "GLM 4.6", reasoning: true },
    { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
    { id: "deepseek-ai/DeepSeek-R1-0528", name: "DeepSeek R1 0528", reasoning: true },
    { id: "deepseek-ai/DeepSeek-V3-0324", name: "DeepSeek V3 0324", reasoning: true },
    { id: "deepseek-ai/DeepSeek-V3.1", name: "DeepSeek V3.1", reasoning: true },
    { id: "deepseek-ai/DeepSeek-V3.2", name: "DeepSeek V3.2", reasoning: true },
    { id: "Qwen/Qwen3-235B-A22B-Instruct-2507", name: "Qwen3 235B A22B Instruct 2507" },
    { id: "Qwen/Qwen3-Coder-480B-A35B-Instruct", name: "Qwen3 Coder 480B A35B Instruct" },
    { id: "openai/gpt-oss-120b", name: "Gpt Oss 120b", reasoning: true },
    { id: "moonshotai/Kimi-K2-Instruct-0905", name: "Kimi K2 Instruct 0905" },
  ],
}
