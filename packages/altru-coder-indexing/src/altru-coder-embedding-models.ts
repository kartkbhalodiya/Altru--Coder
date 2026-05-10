export type AltruCoderEmbeddingModel = {
  id: string
  name: string
  dimension: number
  scoreThreshold: number
  note?: string
}

export type AltruCoderEmbeddingModelCatalog = {
  defaultModel: string
  models: AltruCoderEmbeddingModel[]
  aliases: Record<string, string>
}

export const EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG: AltruCoderEmbeddingModelCatalog = {
  defaultModel: "",
  models: [],
  aliases: {},
}

export function normalizeAltruCoderEmbeddingModelId(
  model: string | undefined,
  catalog = EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG,
) {
  if (!model) return undefined
  return catalog.aliases[model] ?? model
}

export function getAltruCoderEmbeddingModel(
  model: string | undefined,
  catalog = EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG,
) {
  const id = normalizeAltruCoderEmbeddingModelId(model, catalog)
  return catalog.models.find((item) => item.id === id)
}

export function formatAltruCoderEmbeddingModelLabel(model: AltruCoderEmbeddingModel): string {
  const note = model.note ? `${model.note}, ` : ""
  return `${model.name} (${note}${model.dimension}d)`
}
