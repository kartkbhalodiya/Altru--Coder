/**
 * Fetch available models from provider /models endpoints.
 * Runs in the extension host — no CLI backend dependency.
 */

import { ANTHROPIC_PROVIDER_PACKAGE } from "./provider-model"
import { nvidiaNimModels } from "./nvidia-nim"

const EFFORTS = ["low", "medium", "high", "xhigh"] as const

type Options = {
  baseURL: string
  apiKey?: string
  headers?: Record<string, string>
  npm?: string
}

type ModelEntry = {
  id: string
  name: string
  reasoning?: boolean
  variants?: Record<string, Record<string, unknown>>
}

type RawModel = {
  id?: unknown
  name?: unknown
  display_name?: unknown
  displayName?: unknown
}

export class FetchModelsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = "FetchModelsError"
  }

  get auth() {
    return this.status === 401 || this.status === 403
  }
}

function endpoint(baseURL: string) {
  const base = baseURL.replace(/\/+$/, "")
  return /\/models$/i.test(base) ? base : `${base}/models`
}

function anthropic(opts: Options) {
  return opts.npm === ANTHROPIC_PROVIDER_PACKAGE || /^https:\/\/api\.anthropic\.com(?:\/|$)/i.test(opts.baseURL.trim())
}

function nvidia(opts: Options) {
  return /^https:\/\/integrate\.api\.nvidia\.com(?:\/|$)/i.test(opts.baseURL.trim())
}

function openrouter(opts: Options) {
  return /(^|\.)openrouter\.ai$/i.test(new URL(opts.baseURL.trim()).hostname)
}

function zai(opts: Options) {
  const host = new URL(opts.baseURL.trim()).hostname.toLowerCase()
  return host === "api.z.ai" || host.endsWith(".z.ai") || host.includes("zhipu") || host.includes("bigmodel")
}

function dashscope(opts: Options) {
  const host = new URL(opts.baseURL.trim()).hostname.toLowerCase()
  return host.includes("dashscope") || host.includes("alibaba")
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function knownReasoningModel(id: string, name: string) {
  const value = `${id} ${name}`.toLowerCase()
  if (/\b(non[-_ ]?reasoning|nonreasoning|no[-_ ]?think|nothink)\b/.test(value)) return false
  if (
    /\bgpt[-_:]?oss\b/.test(value) ||
    /\bgpt-5(?![-_\s]?chat)\b/.test(value) ||
    /\bo[1-9](?:[-_\s]|$)/.test(value) ||
    /\bclaude[-_\s].*(3[-_.]?7|4[-_.]?[0-9]?|opus[-_.]?4|sonnet[-_.]?4|haiku[-_.]?4)/.test(value) ||
    /\bgemini[-_\s](2\.5|3)/.test(value) ||
    /\bgrok.*reasoning/.test(value) ||
    /\bqwen3\.5\b/.test(value) ||
    /\bqwen3[-_\s].*thinking/.test(value) ||
    /\bqwq\b/.test(value) ||
    /\bkimi-k2\.(5|6)\b/.test(value) ||
    /\bkimi-k2[-_\s]?thinking\b/.test(value) ||
    /\bglm-(4\.5|4\.6|4\.7|5)/.test(value) ||
    /\bdeepseek.*(reasoner|r1|thinking|v3\.1|v3\.2)/.test(value) ||
    /\bminimax-m2\.(1|5|7)\b/.test(value) ||
    /\bnemotron-3\b/.test(value) ||
    /\bsonar-(reasoning|deep-research)/.test(value) ||
    /\bmagistral\b/.test(value)
  )
    return true
  return undefined
}

function supportsReasoning(id: string, name: string) {
  return knownReasoningModel(id, name) === true
}

function effortVariants(base: Record<string, unknown>) {
  return Object.fromEntries(EFFORTS.map((item) => [item, { ...base, reasoningEffort: item }]))
}

function namedVariants(base: Record<string, unknown>) {
  return Object.fromEntries(EFFORTS.map((item) => [item, { ...base }]))
}

function modelVariants(opts: Options, id: string, name: string) {
  const value = `${id} ${name}`.toLowerCase()
  if (anthropic(opts)) {
    return Object.fromEntries(
      EFFORTS.map((effort) => [effort, { thinking: { type: "adaptive" }, effort }]),
    )
  }
  if (openrouter(opts)) {
    return Object.fromEntries(EFFORTS.map((effort) => [effort, { reasoning: { effort } }]))
  }
  if (dashscope(opts)) {
    return namedVariants({ enable_thinking: true })
  }
  if (zai(opts) && value.includes("glm")) {
    return namedVariants({ thinking: { type: "enabled", clear_thinking: false } })
  }
  return effortVariants({})
}

function headers(opts: Options): Record<string, string> {
  const result: Record<string, string> = {
    "Content-Type": "application/json",
    ...opts.headers,
  }

  if (anthropic(opts)) {
    if (!result["anthropic-version"]) result["anthropic-version"] = "2023-06-01"
    if (opts.apiKey) result["x-api-key"] = opts.apiKey
    return result
  }

  if (opts.apiKey) result["Authorization"] = `Bearer ${opts.apiKey}`
  return result
}

export async function fetchOpenAIModels(opts: Options): Promise<ModelEntry[]> {
  if (nvidia(opts)) return nvidiaNimModels()

  const response = await fetch(endpoint(opts.baseURL), {
    method: "GET",
    headers: headers(opts),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new FetchModelsError(`HTTP ${response.status}: ${text.slice(0, 200)}`, response.status)
  }

  const body = (await response.json()) as { data?: RawModel[] } | RawModel[]
  const items = Array.isArray(body) ? body : body?.data
  if (!Array.isArray(items)) return []

  const seen = new Set<string>()
  const result: ModelEntry[] = []
  for (const item of items) {
    const id = text(item.id) ?? ""
    if (!id || seen.has(id)) continue
    seen.add(id)
    const name = text(item.name) ?? text(item.display_name) ?? text(item.displayName) ?? id
    const reasoning = supportsReasoning(id, name)
    result.push({
      id,
      name,
      ...(reasoning ? { reasoning, variants: modelVariants(opts, id, name) } : {}),
    })
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}
