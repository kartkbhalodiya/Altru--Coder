import type { ProviderPreset } from "./types"

const variants = {
  normal: { thinking: { type: "disabled" } },
  low: { thinking: { type: "enabled" }, reasoningEffort: "low" },
  medium: { thinking: { type: "enabled" }, reasoningEffort: "medium" },
  high: { thinking: { type: "enabled" }, reasoningEffort: "high" },
  xhigh: { thinking: { type: "enabled" }, reasoningEffort: "xhigh" },
}

export const DeepseekPreset: ProviderPreset = {
  id: "deepseek",
  name: "DeepSeek",
  baseURL: "https://api.deepseek.com/v1",
  note: "Select DeepSeek chat and reasoner models from the built-in Cline registry.",
  fetch: true,
  models: [
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", reasoning: true, variants },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", reasoning: true, variants },
    { id: "deepseek-chat", name: "Deepseek Chat" },
    { id: "deepseek-reasoner", name: "Deepseek Reasoner" },
  ],
}
