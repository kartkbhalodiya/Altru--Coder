import type { ProviderPreset } from './types'

export const TensorixPreset: ProviderPreset = {
    id: "tensorix",
    name: "Tensorix",
    baseURL: "https://api.tensorix.ai/v1",
    note: "Fetch Tensorix OpenAI-compatible models.",
    models: [
      { id: "z-ai/glm-5", name: "GLM-5", reasoning: true },
      { id: "z-ai/glm-4.7", name: "GLM-4.7", reasoning: true },
      { id: "minimax/minimax-m2.5", name: "MiniMax M2.5", reasoning: true },
      { id: "deepseek/deepseek-v3.1", name: "DeepSeek V3.1", reasoning: true },
    ],
  }

