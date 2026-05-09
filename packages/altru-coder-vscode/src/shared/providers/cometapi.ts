import type { ProviderPreset } from './types'

export const CometapiPreset: ProviderPreset = {
    id: "cometapi",
    name: "CometAPI",
    baseURL: "https://api.cometapi.com/v1",
    note: "Fetch routed models from CometAPI.",
    models: [
      { id: "gpt-5-chat-latest", name: "GPT-5 Chat Latest", reasoning: true },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", reasoning: true },
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", reasoning: true },
      { id: "deepseek-v3.1", name: "DeepSeek V3.1", reasoning: true },
      { id: "qwen3-coder-plus-2025-07-22", name: "Qwen3 Coder Plus" },
    ],
  }

