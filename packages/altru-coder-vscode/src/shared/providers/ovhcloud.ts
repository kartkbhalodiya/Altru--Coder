import type { ProviderPreset, ProviderPresetModel } from "./types"

const variants = Object.fromEntries(
  ["low", "medium", "high", "xhigh"].map((reasoningEffort) => [reasoningEffort, { reasoningEffort }]),
)

function model(id: string, name: string, reasoning = false): ProviderPresetModel {
  if (!reasoning) return { id, name }
  return { id, name, reasoning, variants }
}

export const OvhcloudPreset: ProviderPreset = {
  id: "ovhcloud",
  name: "OVHcloud",
  baseURL: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
  note: "Seeded from OVHcloud official /models catalog (21 models). Use Refresh after entering an API key if the provider changes it.",
  fetch: true,
  models: [
    model("bge-m3", "bge-m3", false),
    model("bge-multilingual-gemma2", "bge-multilingual-gemma2", false),
    model("gpt-oss-120b", "gpt-oss-120b", true),
    model("gpt-oss-20b", "gpt-oss-20b", true),
    model("Llama-3.1-8B-Instruct", "Llama-3.1-8B-Instruct", false),
    model("Meta-Llama-3_3-70B-Instruct", "Meta-Llama-3_3-70B-Instruct", false),
    model("Mistral-7B-Instruct-v0.3", "Mistral-7B-Instruct-v0.3", false),
    model("Mistral-Nemo-Instruct-2407", "Mistral-Nemo-Instruct-2407", false),
    model("Mistral-Small-3.2-24B-Instruct-2506", "Mistral-Small-3.2-24B-Instruct-2506", false),
    model("ppl", "ppl", false),
    model("Qwen2.5-VL-72B-Instruct", "Qwen2.5-VL-72B-Instruct", false),
    model("Qwen3-32B", "Qwen3-32B", false),
    model("Qwen3-Coder-30B-A3B-Instruct", "Qwen3-Coder-30B-A3B-Instruct", false),
    model("Qwen3-Embedding-8B", "Qwen3-Embedding-8B", false),
    model("Qwen3.5-9B", "Qwen3.5-9B", true),
    model("Qwen3Guard-Gen-0.6B", "Qwen3Guard-Gen-0.6B", false),
    model("Qwen3Guard-Gen-8B", "Qwen3Guard-Gen-8B", false),
    model("stabilityai/stable-diffusion-xl-base-1.0", "stabilityai/stable-diffusion-xl-base-1.0", false),
    model("stable-diffusion-xl-base-v10", "stable-diffusion-xl-base-v10", false),
    model("whisper-large-v3", "whisper-large-v3", false),
    model("whisper-large-v3-turbo", "whisper-large-v3-turbo", false),
  ],
}
