import type { ProviderPreset, ProviderPresetModel } from "./types"

const variants = Object.fromEntries(
  ["low", "medium", "high", "xhigh"].map((reasoningEffort) => [reasoningEffort, { reasoningEffort }]),
)

function model(id: string, name: string, reasoning = false): ProviderPresetModel {
  if (!reasoning) return { id, name }
  return { id, name, reasoning, variants }
}

export const InceptionPreset: ProviderPreset = {
  id: "inception",
  name: "Inception Labs",
  baseURL: "https://api.inceptionlabs.ai/v1",
  note: "Seeded from Inception Labs official /models catalog (5 models). Use Refresh after entering an API key if the provider changes it.",
  fetch: true,
  models: [
    model("mercury", "Inception: Mercury", false),
    model("mercury-2", "Inception: Mercury 2", false),
    model("mercury-coder", "Inception: Mercury Coder", false),
    model("mercury-edit", "Inception: Mercury Edit", false),
    model("mercury-edit-2", "Inception: Mercury Edit 2", false),
  ],
}
