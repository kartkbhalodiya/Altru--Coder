import type { ProviderPreset } from './types'

export const MistralPreset: ProviderPreset = {
  id: "mistral",
  name: "Mistral AI",
  baseURL: "https://api.mistral.ai/v1",
  note: "Select Mistral and Codestral models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "devstral-2512", name: "Devstral 2512" },
    { id: "labs-devstral-small-2512", name: "Labs Devstral Small 2512" },
    { id: "mistral-large-2512", name: "Mistral Large 2512" },
    { id: "ministral-14b-2512", name: "Ministral 14b 2512" },
    { id: "mistral-large-2411", name: "Mistral Large 2411" },
    { id: "pixtral-large-2411", name: "Pixtral Large 2411" },
    { id: "ministral-3b-2410", name: "Ministral 3b 2410" },
    { id: "ministral-8b-2410", name: "Ministral 8b 2410" },
    { id: "mistral-small-latest", name: "Mistral Small Latest" },
    { id: "mistral-medium-latest", name: "Mistral Medium Latest" },
    { id: "mistral-small-2501", name: "Mistral Small 2501" },
    { id: "pixtral-12b-2409", name: "Pixtral 12b 2409" },
    { id: "open-mistral-nemo-2407", name: "Open Mistral Nemo 2407" },
    { id: "open-codestral-mamba", name: "Open Codestral Mamba" },
    { id: "codestral-2501", name: "Codestral 2501" },
    { id: "devstral-small-2505", name: "Devstral Small 2505" },
    { id: "devstral-medium-latest", name: "Devstral Medium Latest" },
  ],
}
