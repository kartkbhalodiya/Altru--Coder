import type { ProviderPreset } from "./types"

export const WandbPreset: ProviderPreset = {
  id: "wandb",
  name: "W&B Inference",
  baseURL: "https://api.inference.wandb.ai/v1",
  note: "Select W&B Inference models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "deepseek-ai/DeepSeek-V3.1", name: "DeepSeek V3.1" },
    { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", name: "Llama 4 Scout 17B 16E Instruct" },
    { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct" },
    { id: "meta-llama/Llama-3.1-70B-Instruct", name: "Llama 3.1 70B Instruct" },
    { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct" },
    { id: "microsoft/Phi-4-mini-instruct", name: "Phi 4 Mini Instruct" },
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" },
    { id: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8", name: "NVIDIA Nemotron 3 Super 120B A12B FP8" },
    { id: "openai/gpt-oss-120b", name: "Gpt Oss 120b" },
    { id: "openai/gpt-oss-20b", name: "Gpt Oss 20b" },
    { id: "OpenPipe/Qwen3-14B-Instruct", name: "Qwen3 14B Instruct" },
    { id: "Qwen/Qwen3-235B-A22B-Thinking-2507", name: "Qwen3 235B A22B Thinking 2507" },
    { id: "Qwen/Qwen3-235B-A22B-Instruct-2507", name: "Qwen3 235B A22B Instruct 2507" },
    { id: "Qwen/Qwen3-30B-A3B-Instruct-2507", name: "Qwen3 30B A3B Instruct 2507" },
    { id: "Qwen/Qwen3-Coder-480B-A35B-Instruct", name: "Qwen3 Coder 480B A35B Instruct" },
    { id: "zai-org/GLM-5-FP8", name: "GLM 5 FP8" },
  ],
}
