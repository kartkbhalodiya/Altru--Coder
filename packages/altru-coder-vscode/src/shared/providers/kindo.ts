import type { ProviderPreset } from "./types"

export const KindoPreset: ProviderPreset = {
  id: "kindo",
  name: "Kindo",
  baseURL: "https://llm.kindo.ai/v1",
  note: "Fetch Kindo OpenAI-compatible models.",
  models: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "gemini-pro", name: "Gemini Pro" },
  ],
}
