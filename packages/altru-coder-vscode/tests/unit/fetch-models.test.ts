import { afterEach, describe, expect, it, mock } from "bun:test"
import { fetchOpenAIModels } from "../../src/shared/fetch-models"
import { ANTHROPIC_PROVIDER_PACKAGE } from "../../src/shared/provider-model"

const original = globalThis.fetch

afterEach(() => {
  globalThis.fetch = original
})

function install(fn: typeof fetch) {
  globalThis.fetch = fn
}

describe("fetchOpenAIModels", () => {
  it("uses Anthropic model-list headers for the Anthropic package", async () => {
    const calls: Array<{ url: string; headers: Headers }> = []
    install(
      mock(async (url, init) => {
        calls.push({ url: String(url), headers: new Headers(init?.headers) })
        return new Response(
          JSON.stringify({
            data: [{ id: "claude-opus-4-7", display_name: "Claude Opus 4.7" }],
          }),
        )
      }) as typeof fetch,
    )

    const models = await fetchOpenAIModels({
      baseURL: "https://api.anthropic.com/v1",
      apiKey: "sk-ant",
      npm: ANTHROPIC_PROVIDER_PACKAGE,
    })

    expect(models).toEqual([{ id: "claude-opus-4-7", name: "Claude Opus 4.7" }])
    expect(calls[0]?.url).toBe("https://api.anthropic.com/v1/models")
    expect(calls[0]?.headers.get("x-api-key")).toBe("sk-ant")
    expect(calls[0]?.headers.get("anthropic-version")).toBe("2023-06-01")
    expect(calls[0]?.headers.get("authorization")).toBeNull()
  })

  it("keeps bearer auth for OpenAI-compatible providers", async () => {
    const calls: Array<{ headers: Headers }> = []
    install(
      mock(async (_url, init) => {
        calls.push({ headers: new Headers(init?.headers) })
        return new Response(JSON.stringify({ data: [{ id: "model-1", name: "Model One" }] }))
      }) as typeof fetch,
    )

    await fetchOpenAIModels({ baseURL: "https://example.com/v1", apiKey: "sk-test" })

    expect(calls[0]?.headers.get("authorization")).toBe("Bearer sk-test")
    expect(calls[0]?.headers.get("x-api-key")).toBeNull()
  })
})
