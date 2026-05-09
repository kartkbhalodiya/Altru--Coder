import type { ProviderPreset } from './types'

export const CoherePreset: ProviderPreset = {
    id: "cohere",
    name: "Cohere",
    baseURL: "https://api.cohere.com/compatibility/v1",
    note: "Use Cohere through the compatibility endpoint.",
    models: [
      { id: "command-a-reasoning-08-2025", name: "Command A Reasoning", reasoning: true },
      { id: "command-a-03-2025", name: "Command A" },
      { id: "command-a-vision-07-2025", name: "Command A Vision" },
    ],
  }

