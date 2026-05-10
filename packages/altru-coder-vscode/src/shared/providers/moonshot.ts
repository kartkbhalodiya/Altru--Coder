import type { ProviderPreset } from "./types"

export const MoonshotPreset: ProviderPreset = {
  id: "moonshot",
  name: "Moonshot AI",
  baseURL: "https://api.moonshot.ai/v1",
  note: "Select Kimi and Moonshot models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "kimi-k2.5", name: "Kimi K2.5" },
    { id: "kimi-k2-0905-preview", name: "Kimi K2 0905 Preview" },
    { id: "kimi-k2-0711-preview", name: "Kimi K2 0711 Preview" },
    { id: "kimi-k2-turbo-preview", name: "Kimi K2 Turbo Preview" },
    { id: "kimi-k2-thinking", name: "Kimi K2 Thinking" },
    { id: "kimi-k2-thinking-turbo", name: "Kimi K2 Thinking Turbo" },
  ],
}
