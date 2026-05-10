import type { ProviderPreset } from "./types"

export const FireworksPreset: ProviderPreset = {
  id: "fireworks",
  name: "Fireworks AI",
  baseURL: "https://api.fireworks.ai/inference/v1",
  note: "Select Fireworks serverless models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "accounts/fireworks/models/kimi-k2p5", name: "Kimi K2p5" },
    { id: "accounts/fireworks/models/qwen3-vl-30b-a3b-thinking", name: "Qwen3 Vl 30b A3b Thinking" },
    { id: "accounts/fireworks/models/qwen3-vl-30b-a3b-instruct", name: "Qwen3 Vl 30b A3b Instruct" },
    { id: "accounts/fireworks/models/deepseek-v3p2", name: "Deepseek V3p2" },
    { id: "accounts/fireworks/models/glm-4p7", name: "Glm 4p7" },
    { id: "accounts/fireworks/models/glm-5", name: "Glm 5" },
    { id: "accounts/fireworks/models/minimax-m2p5", name: "Minimax M2p5" },
    { id: "accounts/fireworks/models/minimax-m2p1", name: "Minimax M2p1" },
    { id: "accounts/fireworks/models/gpt-oss-120b", name: "Gpt Oss 120b" },
  ],
}
