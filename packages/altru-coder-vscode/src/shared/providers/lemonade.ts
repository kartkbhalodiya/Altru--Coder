import type { ProviderPreset } from "./types"

export const LemonadePreset: ProviderPreset = {
  id: "lemonade",
  name: "Lemonade",
  baseURL: "http://localhost:8000/api/v1",
  note: "Fetch models from a local Lemonade server.",
  models: [
    { id: "llama3.1:8b", name: "Llama 3.1 8B" },
    { id: "qwen2.5-coder:7b", name: "Qwen2.5 Coder 7B" },
  ],
  local: true,
}
