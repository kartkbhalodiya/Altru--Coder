import type { ProviderPreset } from './types'

export const InceptionPreset: ProviderPreset = {
    id: "inception",
    name: "Inception Labs",
    baseURL: "https://api.inceptionlabs.ai/v1",
    note: "Fetch Inception OpenAI-compatible models.",
    models: [
      { id: "mercury-2", name: "Mercury 2", reasoning: true },
      { id: "mercury-edit-2", name: "Mercury Edit 2" },
      { id: "mercury-coder-small", name: "Mercury Coder Small" },
    ],
  }

