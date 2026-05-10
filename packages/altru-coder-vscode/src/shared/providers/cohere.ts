import type { ProviderPreset } from "./types"

export const CoherePreset: ProviderPreset = {
  id: "cohere",
  name: "Cohere",
  baseURL: "https://api.cohere.com/compatibility/v1",
  note: "Use Cohere through the compatibility endpoint.",
  models: [
    { id: "command-a-reasoning-08-2025", name: "Command A Reasoning", reasoning: true },
    { id: "command-a-translate-08-2025", name: "Command A Translate" },
    { id: "command-a-vision-07-2025", name: "Command A Vision" },
    { id: "command-a-03-2025", name: "Command A" },
    { id: "command-r-plus-08-2024", name: "Command R Plus 08 2024" },
    { id: "command-r-plus-04-2024", name: "Command R Plus 04 2024" },
    { id: "command-r-08-2024", name: "Command R 08 2024" },
    { id: "command-r-03-2024", name: "Command R 03 2024" },
    { id: "command-r7b-12-2024", name: "Command R7B 12 2024" },
    { id: "aya-expanse-32b", name: "Aya Expanse 32B" },
    { id: "aya-expanse-8b", name: "Aya Expanse 8B" },
    { id: "aya-vision-32b", name: "Aya Vision 32B" },
    { id: "aya-vision-8b", name: "Aya Vision 8B" },
  ],
}
