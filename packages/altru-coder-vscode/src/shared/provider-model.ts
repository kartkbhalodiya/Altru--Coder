export const ALTRU_CODER_PROVIDER_ID = "altru-coder"
export const ALTRU_CODER_AUTO = { providerID: ALTRU_CODER_PROVIDER_ID, modelID: "altru-coder-auto/free" } as const
export const ALTRU_CODER_BUILTIN_TOKEN_LIMIT = Number.MAX_SAFE_INTEGER
export const ALTRU_CODER_BUILTIN_TOKEN_WINDOW_MS = 48 * 60 * 60 * 1000
const context = 1_000_000
const reasoning = Object.fromEntries(
  ["low", "medium", "high", "xhigh"].map((effort) => [effort, { reasoning: { effort } }]),
)

export const ALTRU_CODER_BUILTIN_MODELS = [
  {
    providerID: ALTRU_CODER_PROVIDER_ID,
    modelID: "altru-coder-auto/free",
    name: "Altru Coder Auto Free",
    context,
    output: 128_000,
    reasoning: false,
    recommendedIndex: 1,
  },
  {
    providerID: ALTRU_CODER_PROVIDER_ID,
    modelID: "altru-coder/big-pickle-free",
    name: "Altru Coder Big Pickle Free",
    context,
    output: 128_000,
    reasoning: false,
    recommendedIndex: 2,
  },
  {
    providerID: ALTRU_CODER_PROVIDER_ID,
    modelID: "altru-coder/hy3-preview-free",
    name: "Altru Coder Hy3 Preview Free",
    context,
    output: 64_000,
    reasoning: false,
    recommendedIndex: 3,
  },
  {
    providerID: ALTRU_CODER_PROVIDER_ID,
    modelID: "altru-coder/minimax-m2.5-free",
    name: "Altru Coder MiniMax M2.5 Free",
    context,
    output: 131_072,
    reasoning: true,
    variants: reasoning,
    recommendedIndex: 4,
  },
  {
    providerID: ALTRU_CODER_PROVIDER_ID,
    modelID: "altru-coder/nemotron-3-super-free",
    name: "Altru Coder Nemotron 3 Super Free",
    context,
    output: 128_000,
    reasoning: true,
    variants: reasoning,
    recommendedIndex: 5,
  },
  {
    providerID: ALTRU_CODER_PROVIDER_ID,
    modelID: "openai/gpt-oss-120b",
    name: "Altru Coder GPT OSS 120B",
    context: 131_072,
    output: 26_215,
    reasoning: true,
    variants: reasoning,
    recommendedIndex: 6,
  },
] as const
export const CUSTOM_PROVIDER_PACKAGE = "@ai-sdk/openai-compatible"
export const ANTHROPIC_PROVIDER_PACKAGE = "@ai-sdk/anthropic"
export const CUSTOM_PROVIDER_PACKAGES = [CUSTOM_PROVIDER_PACKAGE, ANTHROPIC_PROVIDER_PACKAGE] as const
export const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

export type CustomProviderPackage = (typeof CUSTOM_PROVIDER_PACKAGES)[number]

const CUSTOM_PROVIDER_SET = new Set<string>(CUSTOM_PROVIDER_PACKAGES)

export function isCustomProviderPackage(pkg: unknown): pkg is CustomProviderPackage {
  return typeof pkg === "string" && CUSTOM_PROVIDER_SET.has(pkg)
}

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

export function isAltruCoderBuiltinModel(providerID: string | undefined, modelID: string | undefined) {
  if (providerID !== ALTRU_CODER_PROVIDER_ID || !modelID) return false
  return ALTRU_CODER_BUILTIN_MODELS.some((model) => model.modelID === modelID)
}

export function createAltruCoderBuiltinProvider() {
  return {
    id: ALTRU_CODER_PROVIDER_ID,
    name: "Altru Coder",
    source: "custom" as const,
    env: ["ALTRU_CODER_API_KEY"],
    models: Object.fromEntries(
      ALTRU_CODER_BUILTIN_MODELS.map((model) => [
        model.modelID,
        {
          id: model.modelID,
          name: model.name,
          isFree: true,
          recommendedIndex: model.recommendedIndex,
          limit: { context: model.context, output: model.output },
          capabilities: { reasoning: model.reasoning },
          ...(model.reasoning ? { variants: model.variants } : {}),
        },
      ]),
    ),
  }
}
