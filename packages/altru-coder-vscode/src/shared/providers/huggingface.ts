import type { ProviderPreset } from './types'

export const HuggingfacePreset: ProviderPreset = {
  id: "huggingface",
  name: "Hugging Face Router",
  baseURL: "https://router.huggingface.co/v1",
  note: "Select Hugging Face router models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "openai/gpt-oss-120b", name: "Gpt Oss 120b" },
    { id: "openai/gpt-oss-20b", name: "Gpt Oss 20b" },
    { id: "moonshotai/Kimi-K2-Instruct", name: "Kimi K2 Instruct" },
    { id: "deepseek-ai/DeepSeek-V3-0324", name: "DeepSeek V3 0324" },
    { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1" },
    { id: "deepseek-ai/DeepSeek-R1-0528", name: "DeepSeek R1 0528" },
    { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct" },
  ],
}
