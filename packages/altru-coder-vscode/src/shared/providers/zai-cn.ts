import type { ProviderPreset } from './types'

export const ZaiCnPreset: ProviderPreset = {
  id: "zai-cn",
  name: "Zhipu GLM China",
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  note: "Select mainland GLM models from the built-in Cline registry.",
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
