import type { ProviderPreset } from "./types"

export const NcompassPreset: ProviderPreset = {
  id: "ncompass",
  name: "NCompass",
  baseURL: "https://api.ncompass.tech/v1",
  note: "Fetch NCompass OpenAI-compatible models.",
  models: [
    { id: "qwen2.5-coder-32b", name: "Qwen2.5 Coder 32B" },
    { id: "qwen2.5-72b", name: "Qwen2.5 72B" },
    { id: "llama3.3-70b", name: "Llama 3.3 70B" },
  ],
}
