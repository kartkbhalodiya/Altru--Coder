import type { ProviderPreset } from "./types"
import { ANTHROPIC_PROVIDER_PACKAGE } from "../provider-model"

export const AnthropicPreset: ProviderPreset = {
  id: "anthropic",
  name: "Anthropic",
  baseURL: "https://api.anthropic.com/v1",
  note: "Select Claude models from the built-in Cline registry.",
  npm: ANTHROPIC_PROVIDER_PACKAGE,
  fetch: false,
  models: [
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4 6", reasoning: true },
    { id: "claude-sonnet-4-6:1m", name: "Claude Sonnet 4 6:1m", reasoning: true },
    { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4 5 20250929", reasoning: true },
    { id: "claude-sonnet-4-5-20250929:1m", name: "Claude Sonnet 4 5 20250929:1m", reasoning: true },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4 5 20251001", reasoning: true },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 20250514", reasoning: true },
    { id: "claude-sonnet-4-20250514:1m", name: "Claude Sonnet 4 20250514:1m", reasoning: true },
    { id: "claude-opus-4-6", name: "Claude Opus 4 6", reasoning: true },
    { id: "claude-opus-4-6:fast", name: "Claude Opus 4 6:Fast", reasoning: true },
    { id: "claude-opus-4-6:1m", name: "Claude Opus 4 6:1m", reasoning: true },
    { id: "claude-opus-4-6:1m:fast", name: "Claude Opus 4 6:1m:Fast", reasoning: true },
    { id: "claude-opus-4-7", name: "Claude Opus 4 7", reasoning: true },
    { id: "claude-opus-4-7:1m", name: "Claude Opus 4 7:1m", reasoning: true },
    { id: "claude-opus-4-5-20251101", name: "Claude Opus 4 5 20251101", reasoning: true },
    { id: "claude-opus-4-1-20250805", name: "Claude Opus 4 1 20250805", reasoning: true },
    { id: "claude-opus-4-20250514", name: "Claude Opus 4 20250514", reasoning: true },
    { id: "claude-3-7-sonnet-20250219", name: "Claude 3 7 Sonnet 20250219", reasoning: true },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3 5 Sonnet 20241022" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3 5 Haiku 20241022" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus 20240229" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku 20240307" },
  ],
}
