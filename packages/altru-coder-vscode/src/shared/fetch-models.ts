/**
 * Fetch available models from provider /models endpoints.
 * Runs in the extension host — no CLI backend dependency.
 */

import { ANTHROPIC_PROVIDER_PACKAGE } from "./provider-model"

type Options = {
  baseURL: string
  apiKey?: string
  headers?: Record<string, string>
  npm?: string
}

type ModelEntry = {
  id: string
  name: string
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
  const response = await fetch(endpoint(opts.baseURL), {
    method: "GET",
    headers: headers(opts),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new FetchModelsError(`HTTP ${response.status}: ${text.slice(0, 200)}`, response.status)
  }

  const body = (await response.json()) as { data?: Array<{ id?: string; name?: string; display_name?: string }> }
  const items = body?.data
  if (!Array.isArray(items)) return []

  const seen = new Set<string>()
  const result: ModelEntry[] = []
  for (const item of items) {
    const id = typeof item.id === "string" ? item.id.trim() : ""
    if (!id || seen.has(id)) continue
    seen.add(id)
    const name =
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : typeof item.display_name === "string" && item.display_name.trim()
          ? item.display_name.trim()
          : id
    result.push({ id, name })
  }
  result.sort((a, b) => a.id.localeCompare(b.id))
  return result
}
