import type { ProviderPreset } from './types'

export const MorphPreset: ProviderPreset = {
    id: "morph",
    name: "Morph",
    baseURL: "https://api.morphllm.com/v1",
    note: "Fetch Morph OpenAI-compatible apply models.",
    models: [
      { id: "auto", name: "Auto", reasoning: true },
      { id: "morph-v3-fast", name: "Morph V3 Fast" },
      { id: "morph-v3-large", name: "Morph V3 Large", reasoning: true },
    ],
  }

