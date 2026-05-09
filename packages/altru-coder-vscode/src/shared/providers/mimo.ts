import type { ProviderPreset } from './types'

export const MimoPreset: ProviderPreset = {
    id: "mimo",
    name: "Mimo",
    baseURL: "https://api.xiaomimimo.com/v1",
    note: "Fetch Xiaomi Mimo OpenAI-compatible models.",
    models: [
      { id: "mimo-vl-7b-rl", name: "Mimo VL 7B" },
      { id: "mimo-embedding", name: "Mimo Embedding" },
    ],
  }

