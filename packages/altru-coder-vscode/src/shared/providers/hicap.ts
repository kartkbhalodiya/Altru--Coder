import type { ProviderPreset, ProviderPresetModel } from "./types"

const variants = Object.fromEntries(
  ["low", "medium", "high", "xhigh"].map((reasoningEffort) => [reasoningEffort, { reasoningEffort }]),
)

function model(id: string, name: string, reasoning = false): ProviderPresetModel {
  if (!reasoning) return { id, name }
  return { id, name, reasoning, variants }
}

export const HicapPreset: ProviderPreset = {
  id: "hicap",
  name: "Hicap",
  baseURL: "https://api.hicap.ai/v2/openai",
  note: "Seeded from Hicap official /models catalog (41 models). Use Refresh after entering an API key if the provider changes it.",
  fetch: true,
  models: [
    model("claude-3.5-haiku", "claude-3.5-haiku", false),
    model("claude-3.5-sonnet", "claude-3.5-sonnet", false),
    model("claude-3.7-sonnet", "claude-3.7-sonnet", true),
    model("claude-haiku-4.5", "claude-haiku-4.5", true),
    model("claude-opus-4", "claude-opus-4", true),
    model("claude-opus-4.1", "claude-opus-4.1", true),
    model("claude-opus-4.5", "claude-opus-4.5", true),
    model("claude-opus-4.6", "claude-opus-4.6", true),
    model("claude-opus-4.7", "claude-opus-4.7", true),
    model("claude-sonnet-4", "claude-sonnet-4", true),
    model("claude-sonnet-4.5", "claude-sonnet-4.5", true),
    model("claude-sonnet-4.6", "claude-sonnet-4.6", true),
    model("gemini-2.0-flash", "gemini-2.0-flash", false),
    model("gemini-2.0-flash-lite", "gemini-2.0-flash-lite", false),
    model("gemini-2.5-flash", "gemini-2.5-flash", true),
    model("gemini-2.5-flash-lite", "gemini-2.5-flash-lite", true),
    model("gemini-2.5-pro", "gemini-2.5-pro", true),
    model("gemini-3-flash-preview", "gemini-3-flash-preview", true),
    model("gemini-3-pro-preview", "gemini-3-pro-preview", true),
    model("gemini-3.1-flash-lite-preview", "gemini-3.1-flash-lite-preview", true),
    model("gemini-3.1-pro-preview", "gemini-3.1-pro-preview", true),
    model("glm-5", "glm-5", true),
    model("gpt-4.1", "gpt-4.1", false),
    model("gpt-4.1-mini", "gpt-4.1-mini", false),
    model("gpt-4.1-nano", "gpt-4.1-nano", false),
    model("gpt-4o", "gpt-4o", false),
    model("gpt-4o-mini", "gpt-4o-mini", false),
    model("gpt-5", "gpt-5", true),
    model("gpt-5-chat", "gpt-5-chat", false),
    model("gpt-5-mini", "gpt-5-mini", true),
    model("gpt-5-nano", "gpt-5-nano", true),
    model("gpt-5.1", "gpt-5.1", true),
    model("gpt-5.1-chat-latest", "gpt-5.1-chat-latest", true),
    model("gpt-5.2", "gpt-5.2", true),
    model("gpt-5.2-chat-latest", "gpt-5.2-chat-latest", true),
    model("gpt-5.4", "gpt-5.4", true),
    model("gpt-5.5", "gpt-5.5", true),
    model("gpt-5.5-pro", "gpt-5.5-pro", true),
    model("kimi-k2.5", "kimi-k2.5", true),
    model("kimi-k2.6", "kimi-k2.6", true),
    model("minimax-m2.5", "minimax-m2.5", true),
  ],
}
