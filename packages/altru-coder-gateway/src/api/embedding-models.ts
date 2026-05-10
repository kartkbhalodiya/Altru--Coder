import { z } from "zod"
import { resolveAltruCoderGatewayBaseUrl } from "./url.js"

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

const model = z.object({
  id: z.string(),
  name: z.string(),
  dimension: z.number().int().positive(),
  scoreThreshold: z.number(),
  note: z.string().optional(),
})

const catalog = z.object({
  defaultModel: z.string(),
  models: z.array(model),
  aliases: z.record(z.string(), z.string()),
})

type Options = {
  baseURL?: string
  token?: string
  signal?: AbortSignal
}

export async function fetchAltruCoderEmbeddingModelCatalog(
  options: Options = {},
): Promise<AltruCoderEmbeddingModelCatalog> {
  const url = new URL(
    "embedding-models",
    resolveAltruCoderGatewayBaseUrl({ baseURL: options.baseURL, token: options.token }),
  )

  try {
    const response = await fetch(url, { signal: options.signal })
    if (!response.ok) {
      console.warn(`[Altru Coder Gateway] Failed to fetch embedding model catalog: ${response.status}`)
      return EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG
    }
    const parsed = catalog.safeParse(await response.json())
    if (!parsed.success) {
      console.warn("[Altru Coder Gateway] Embedding model catalog response validation failed:", parsed.error.format())
      return EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG
    }
    return parsed.data
  } catch (err) {
    console.warn("[Altru Coder Gateway] Error fetching embedding model catalog:", err)
    return EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG
  }
}
