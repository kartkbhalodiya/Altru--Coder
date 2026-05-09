import type { ProviderPreset } from './types'

export const DoubaoPreset: ProviderPreset = {
  id: "doubao",
  name: "Doubao",
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  note: "Select Doubao and Volcano Ark models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "doubao-1-5-pro-256k-250115", name: "Doubao 1 5 Pro 256k 250115" },
    { id: "doubao-1-5-pro-32k-250115", name: "Doubao 1 5 Pro 32k 250115" },
    { id: "deepseek-v3-250324", name: "Deepseek V3 250324" },
    { id: "deepseek-r1-250120", name: "Deepseek R1 250120" },
  ],
}
