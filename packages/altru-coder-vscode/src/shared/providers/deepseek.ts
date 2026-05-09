import type { ProviderPreset } from './types'

export const DeepseekPreset: ProviderPreset = {
  id: "deepseek",
  name: "DeepSeek",
  baseURL: "https://api.deepseek.com/v1",
  note: "Select DeepSeek chat and reasoner models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "deepseek-chat", name: "Deepseek Chat" },
    { id: "deepseek-reasoner", name: "Deepseek Reasoner" },
  ],
}
