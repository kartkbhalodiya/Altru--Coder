import type { ProviderPreset } from "./types"

export const PerplexityPreset: ProviderPreset = {
  id: "perplexity",
  name: "Perplexity",
  baseURL: "https://api.perplexity.ai",
  note: "Fetch Perplexity online models.",
  models: [
    { id: "sonar-deep-research", name: "Sonar Deep Research", reasoning: true },
    { id: "sonar-reasoning-pro", name: "Sonar Reasoning Pro", reasoning: true },
    { id: "sonar-pro", name: "Sonar Pro" },
    { id: "sonar", name: "Sonar" },
  ],
}
