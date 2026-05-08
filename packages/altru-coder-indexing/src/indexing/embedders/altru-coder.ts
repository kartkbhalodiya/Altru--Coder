import { resolveAltruCoderGatewayBaseUrl } from "@altru-coder/altru-coder-gateway"
import { HEADER_FEATURE, HEADER_ORGANIZATIONID } from "@altru-coder/altru-coder-gateway"
import { MAX_ITEM_TOKENS } from "../constants"
import type { EmbedderInfo, EmbeddingResponse, IEmbedder } from "../interfaces/embedder"
import { Log } from "../../util/log"
import { OpenAICompatibleEmbedder } from "./openai-compatible"

const log = Log.create({ service: "embedder-altru-coder" })

export const ALTRU_CODER_INDEXING_FEATURE = "managed-indexing"

export class AltruCoderEmbedder implements IEmbedder {
  private readonly embedder: OpenAICompatibleEmbedder
  private readonly model: string

  constructor(input: {
    apiKey: string
    baseUrl?: string
    organizationId?: string
    modelId?: string
  }) {
    if (!input.apiKey) throw new Error("Altru Coder API key is required for embedding.")

    if (!input.modelId) throw new Error("Altru Coder embedding model is required.")
    this.model = input.modelId
    const headers: Record<string, string> = {
      [HEADER_FEATURE]: ALTRU_CODER_INDEXING_FEATURE,
      ...(input.organizationId ? { [HEADER_ORGANIZATIONID]: input.organizationId } : {}),
    }

    this.embedder = new OpenAICompatibleEmbedder(
      resolveAltruCoderGatewayBaseUrl({ baseURL: input.baseUrl, token: input.apiKey }),
      input.apiKey,
      this.model,
      MAX_ITEM_TOKENS,
      { headers },
    )
  }

  async createEmbeddings(texts: string[], model?: string): Promise<EmbeddingResponse> {
    try {
      return await this.embedder.createEmbeddings(texts, model || this.model)
    } catch (err) {
      log.error("Altru Coder embedder error", {
        err: err instanceof Error ? err.message : String(err),
        location: "AltruCoderEmbedder:createEmbeddings",
      })
      throw err
    }
  }

  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      return await this.embedder.validateConfiguration()
    } catch (err) {
      log.error("Altru Coder embedder validation error", {
        err: err instanceof Error ? err.message : String(err),
        location: "AltruCoderEmbedder:validateConfiguration",
      })
      throw err
    }
  }

  get embedderInfo(): EmbedderInfo {
    return { name: "altru-coder" }
  }
}
