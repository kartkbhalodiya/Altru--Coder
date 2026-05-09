import type { ProviderPreset } from './types'

export const NousPreset: ProviderPreset = {
  id: "nous",
  name: "Nous Research",
  baseURL: "https://inference-api.nousresearch.com/v1",
  note: "Select Nous Research inference models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "Hermes-4-405B", name: "Hermes 4 405B" },
    { id: "Hermes-4-70B", name: "Hermes 4 70B" },
  ],
}
