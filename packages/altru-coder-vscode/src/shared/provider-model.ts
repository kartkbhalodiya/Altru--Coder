export const ALTRU_CODER_PROVIDER_ID = "altru-coder"
export const ALTRU_CODER_AUTO = { providerID: ALTRU_CODER_PROVIDER_ID, modelID: "altru-coder-auto/free" } as const
export const CUSTOM_PROVIDER_PACKAGE = "@ai-sdk/openai-compatible"
export const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

export const PROVIDER_PRIORITY = [
  ALTRU_CODER_PROVIDER_ID,
  "anthropic",
  "github-copilot",
  "openai",
  "google",
  "openrouter",
  "vercel",
] as const

export function parseModelString(raw: string | undefined | null) {
  if (!raw) return null
  const slash = raw.indexOf("/")
  if (slash <= 0 || slash >= raw.length - 1) return null
  return { providerID: raw.slice(0, slash), modelID: raw.slice(slash + 1) }
}

export function providerOrderIndex(providerID: string, order = PROVIDER_PRIORITY) {
  const index = order.indexOf(providerID.toLowerCase() as (typeof PROVIDER_PRIORITY)[number])
  return index >= 0 ? index : order.length
}

export function createAltruCoderFallbackProvider() {
  return {
    id: ALTRU_CODER_PROVIDER_ID,
    name: "Altru Coder Gateway",
    source: "custom" as const,
    env: ["ALTRU_CODER_API_KEY"],
    models: {},
  }
}
