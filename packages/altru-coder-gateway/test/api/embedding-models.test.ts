import { describe, expect, mock, test } from "bun:test"
import { EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG, fetchAltruCoderEmbeddingModelCatalog } from "../../src/api/embedding-models"

describe("fetchAltruCoderEmbeddingModelCatalog", () => {
  test("fetches catalog from Altru Coder Gateway", async () => {
    const prev = global.fetch
    const fn = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            defaultModel: "provider/model",
            models: [{ id: "provider/model", name: "Provider Model", dimension: 1024, scoreThreshold: 0.4 }],
            aliases: { model: "provider/model" },
          }),
        ),
      ),
    ) as unknown as typeof fetch
    global.fetch = fn

    try {
      const catalog = await fetchAltruCoderEmbeddingModelCatalog({ baseURL: "https://example.test" })

      expect(catalog.defaultModel).toBe("provider/model")
      expect((fn as unknown as { mock: { calls: Array<[URL]> } }).mock.calls[0]?.[0].toString()).toBe(
        "https://example.test/api/gateway/embedding-models",
      )
    } finally {
      global.fetch = prev
    }
  })

  test("falls back when the request fails", async () => {
    const prev = global.fetch
    global.fetch = mock(() => Promise.resolve(new Response("nope", { status: 500 }))) as unknown as typeof fetch

    try {
      await expect(fetchAltruCoderEmbeddingModelCatalog({ baseURL: "https://example.test" })).resolves.toEqual(
        EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG,
      )
    } finally {
      global.fetch = prev
    }
  })

  test("fallback catalog is empty so Cloud owns model metadata", () => {
    expect(EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG).toEqual({
      defaultModel: "",
      models: [],
      aliases: {},
    })
  })
})
