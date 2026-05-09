import type { ProviderPreset } from './types'

export const HuaweiCloudMaasPreset: ProviderPreset = {
  id: "huawei-cloud-maas",
  name: "Huawei Cloud MaaS",
  baseURL: "https://api.modelarts-maas.com/v1",
  note: "Select Huawei Cloud MaaS models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "DeepSeek-V3", name: "DeepSeek V3" },
    { id: "DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
    { id: "deepseek-r1-250528", name: "Deepseek R1 250528", reasoning: true },
    { id: "qwen3-235b-a22b", name: "Qwen3 235b A22b", reasoning: true },
    { id: "qwen3-32b", name: "Qwen3 32b", reasoning: true },
  ],
}
