import type { ProviderPreset } from './types'

export const ZaiPreset: ProviderPreset = {
  id: "zai",
  name: "Z.ai",
  baseURL: "https://api.z.ai/api/paas/v4",
  note: "Select international GLM models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "glm-5.1", name: "Glm 5.1" },
    { id: "glm-5", name: "Glm 5" },
    { id: "glm-4.7", name: "Glm 4.7" },
    { id: "glm-4.6", name: "Glm 4.6" },
    { id: "glm-4.5", name: "Glm 4.5" },
    { id: "glm-4.5-air", name: "Glm 4.5 Air" },
  ],
}
