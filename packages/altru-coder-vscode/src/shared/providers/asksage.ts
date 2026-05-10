import type { ProviderPreset } from "./types"

export const AsksagePreset: ProviderPreset = {
  id: "asksage",
  name: "AskSage",
  baseURL: "https://api.asksage.ai/server",
  note: "Select AskSage models copied from Cline local model data.",
  fetch: false,
  models: [
    { id: "gpt-4o", name: "Gpt 4o" },
    { id: "gpt-4o-gov", name: "Gpt 4o Gov" },
    { id: "gpt-4.1", name: "Gpt 4.1" },
    { id: "claude-35-sonnet", name: "Claude 35 Sonnet" },
    { id: "aws-bedrock-claude-35-sonnet-gov", name: "Aws Bedrock Claude 35 Sonnet Gov" },
    { id: "claude-37-sonnet", name: "Claude 37 Sonnet" },
    { id: "claude-4.6-sonnet", name: "Claude 4.6 Sonnet" },
    { id: "claude-4-sonnet", name: "Claude 4 Sonnet" },
    { id: "claude-4-opus", name: "Claude 4 Opus" },
    { id: "google-gemini-2.5-pro", name: "Google Gemini 2.5 Pro" },
    { id: "google-claude-45-sonnet", name: "Google Claude 45 Sonnet" },
    { id: "google-claude-4-opus", name: "Google Claude 4 Opus" },
    { id: "gpt-5", name: "Gpt 5" },
    { id: "gpt-5-mini", name: "Gpt 5 Mini" },
    { id: "gpt-5-nano", name: "Gpt 5 Nano" },
  ],
}
