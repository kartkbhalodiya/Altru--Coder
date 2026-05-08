type Auth = unknown

type Env = {
  ALTRU_CODER_API_KEY?: string
  ALTRU_CODER_ORG_ID?: string
}

type Provider = {
  key?: unknown
  options?: Record<string, unknown>
}

export type AltruCoderIndexingAuth = {
  apiKey?: string
  baseUrl?: string
  organizationId?: string
}

const providers = [
  "openai",
  "ollama",
  "openai-compatible",
  "gemini",
  "mistral",
  "vercel-ai-gateway",
  "bedrock",
  "openrouter",
  "voyage",
]

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return
  const trimmed = value.trim()
  return trimmed || undefined
}

function token(auth: Auth): string | undefined {
  const data = record(auth)
  if (data.type === "api") return text(data.key)
  if (data.type === "oauth") return text(data.access)
  return
}

function org(auth: Auth): string | undefined {
  const data = record(auth)
  if (data.type === "oauth") return text(data.accountId)
  return
}

function value(input: unknown): boolean {
  if (input === undefined || input === null) return false
  if (typeof input === "string") return input.trim().length > 0
  if (typeof input === "object") return Object.values(input).some(value)
  return true
}

function hasOtherProvider(indexing: unknown): boolean {
  const cfg = record(indexing)
  return providers.some((provider) => value(cfg[provider]))
}

export function resolveAltruCoderIndexingAuth(input: {
  config?: unknown
  provider?: Provider
  auth?: Auth
  env?: Env
}): AltruCoderIndexingAuth {
  const config = record(input.config)
  const options = record(record(config.provider)["altru-coder"])
  const provider = input.provider ?? record(input.provider)
  const providerOptions = record(provider.options)
  const providerConfig = record(options.options)
  const altru = record(record(config.indexing)["altru-coder"])
  const env = input.env ?? process.env

  return {
    apiKey:
      text(altru.apiKey) ??
      text(providerConfig.apiKey) ??
      token(input.auth) ??
      text(provider.key) ??
      text(providerOptions.altrucoderToken) ??
      text(env.ALTRU_CODER_API_KEY),
    baseUrl: text(altru.baseUrl) ?? text(providerConfig.baseURL) ?? text(providerConfig.baseUrl),
    organizationId:
      text(altru.organizationId) ??
      text(providerConfig.altrucoderOrganizationId) ??
      org(input.auth) ??
      text(providerOptions.altrucoderOrganizationId) ??
      text(env.ALTRU_CODER_ORG_ID),
  }
}

export function hasAltruCoderIndexingAuth(input: Parameters<typeof resolveAltruCoderIndexingAuth>[0]): boolean {
  return !!resolveAltruCoderIndexingAuth(input).apiKey
}

export function shouldDefaultIndexingToAltruCoder(indexing: unknown, auth: AltruCoderIndexingAuth): boolean {
  const cfg = record(indexing)
  if (cfg.provider !== undefined || !auth.apiKey) return false
  return !hasOtherProvider(cfg)
}

export function indexingWithAltruCoderDefault(config: unknown, auth: AltruCoderIndexingAuth) {
  const cfg = record(config)
  const indexing = cfg.indexing
  if (!shouldDefaultIndexingToAltruCoder(indexing, auth)) return indexing
  return { ...record(indexing), provider: "altru-coder" }
}
