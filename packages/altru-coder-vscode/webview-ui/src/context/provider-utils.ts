import { createAltruCoderBuiltinProvider, isCustomProviderPackage } from "../../../src/shared/provider-model"
import type { Provider, ProviderConfig, ProviderModel, ModelSelection } from "../types/messages"

export type EnrichedModel = ProviderModel & { providerID: string; providerName: string }

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function variants(value: unknown): Record<string, Record<string, unknown>> | undefined {
  if (!record(value)) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, Record<string, unknown>] =>
    record(entry[1]),
  )
  if (entries.length === 0) return undefined
  return Object.fromEntries(entries)
}

function model(id: string, raw: unknown): ProviderModel | undefined {
  if (!record(raw)) return undefined
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : id
  const item: ProviderModel = { id, name }
  const vars = variants(raw.variants)
  if (vars) item.variants = vars
  if (raw.reasoning === true) item.capabilities = { reasoning: true }
  return item
}

export function localProviders(config: Record<string, ProviderConfig> | undefined): Record<string, Provider> {
  const builtin = createAltruCoderBuiltinProvider()
  const result: Record<string, Provider> = {
    [builtin.id]: builtin,
  }

  for (const [id, cfg] of Object.entries(config ?? {})) {
    if (!isCustomProviderPackage(cfg?.npm)) continue
    const models = Object.fromEntries(
      Object.entries(cfg.models ?? {})
        .map(([mid, raw]) => [mid, model(mid, raw)] as const)
        .filter((entry): entry is [string, ProviderModel] => !!entry[1]),
    )
    if (Object.keys(models).length === 0) continue
    const provider: Provider = {
      id,
      name: typeof cfg.name === "string" && cfg.name.trim() ? cfg.name.trim() : id,
      source: "config",
      env: cfg.env,
      models,
    }
    result[id] = result[id]
      ? { ...provider, models: { ...result[id]!.models, ...provider.models } }
      : provider
  }

  return result
}

export function mergeLocalProviders(
  providers: Record<string, Provider>,
  config: Record<string, ProviderConfig> | undefined,
): Record<string, Provider> {
  const local = localProviders(config)
  if (Object.keys(local).length === 0) return providers

  const result = { ...providers }
  for (const [id, item] of Object.entries(local)) {
    const current = result[id]
    if (!current) {
      result[id] = item
      continue
    }
    result[id] = {
      ...item,
      ...current,
      source: current.source ?? item.source,
      models: { ...item.models, ...current.models },
    }
  }
  return result
}

export function isLocalProvider(provider: Provider | undefined): boolean {
  return provider?.source === "config" || provider?.source === "custom"
}

/**
 * Flatten a provider map into a list of models enriched with provider info.
 */
export function flattenModels(providers: Record<string, Provider>): EnrichedModel[] {
  const result: EnrichedModel[] = []
  for (const providerID of Object.keys(providers)) {
    const provider = providers[providerID]!
    for (const modelID of Object.keys(provider.models)) {
      result.push({
        ...provider.models[modelID]!,
        id: modelID,
        providerID,
        providerName: provider.name,
      })
    }
  }
  return result
}

/**
 * Find an enriched model from a flat model list by provider ID and model ID.
 */
export function findModel(models: EnrichedModel[], selection: ModelSelection | null): EnrichedModel | undefined {
  if (!selection) return undefined
  return models.find((m) => m.providerID === selection.providerID && m.id === selection.modelID)
}

/**
 * True when the selection points to an existing model in a connected provider.
 * Altru Coder gateway models remain usable whenever the provider catalog exposes them.
 */
export function isModelValid(
  providers: Record<string, Provider>,
  connected: string[],
  selection: ModelSelection | null,
): boolean {
  if (!selection) return false
  const provider = providers[selection.providerID]
  if (!provider) return false
  if (selection.providerID !== "altru-coder" && !connected.includes(selection.providerID) && !isLocalProvider(provider))
    return false
  return !!provider.models[selection.modelID]
}
