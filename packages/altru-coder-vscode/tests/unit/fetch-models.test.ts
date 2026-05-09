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

    expect(models[0]?.id).toBe("claude-opus-4-7")
    expect(models[0]?.name).toBe("Claude Opus 4.7")
    expect(models[0]?.reasoning).toBe(true)
    expect(Object.keys(models[0]?.variants ?? {})).toEqual(["low", "medium", "high", "xhigh"])
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

  it("detects reasoning models and adds low through xhigh variants", async () => {
    install(
      mock(async () => {
        return new Response(
          JSON.stringify({
            data: [
              { id: "openai/gpt-oss-120b", name: "GPT OSS 120B" },
              { id: "grok-4-fast-non-reasoning", name: "Grok 4 Fast Non Reasoning" },
            ],
          }),
        )
      }) as typeof fetch,
    )

    const models = await fetchOpenAIModels({ baseURL: "https://example.com/v1", apiKey: "sk-test" })
    const gpt = models.find((model) => model.id === "openai/gpt-oss-120b")
    const grok = models.find((model) => model.id === "grok-4-fast-non-reasoning")

    expect(gpt?.reasoning).toBe(true)
    expect(Object.keys(gpt?.variants ?? {})).toEqual(["low", "medium", "high", "xhigh"])
    expect(gpt?.variants?.xhigh?.reasoningEffort).toBe("xhigh")
    expect(grok?.reasoning).toBeUndefined()
    expect(grok?.variants).toBeUndefined()
  })

  it("uses NVIDIA chat template kwargs for Qwen, GLM, and Kimi reasoning models", async () => {
    install(
      mock(async () => {
        return new Response(
          JSON.stringify({
            data: [
              { id: "qwen/qwen3.5-397b-a17b" },
              { id: "z-ai/glm-5.1" },
              { id: "moonshotai/kimi-k2.6" },
            ],
          }),
        )
      }) as typeof fetch,
    )

    const models = await fetchOpenAIModels({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: "nv-test",
    })
    const qwen = models.find((model) => model.id === "qwen/qwen3.5-397b-a17b")
    const glm = models.find((model) => model.id === "z-ai/glm-5.1")
    const kimi = models.find((model) => model.id === "moonshotai/kimi-k2.6")

    expect(qwen?.reasoning).toBe(true)
    expect(glm?.reasoning).toBe(true)
    expect(kimi?.reasoning).toBe(true)
    expect(qwen?.variants?.high?.chat_template_kwargs).toEqual({ enable_thinking: true })
    expect(glm?.variants?.high?.chat_template_kwargs).toEqual({ enable_thinking: true })
    expect(kimi?.variants?.high?.chat_template_kwargs).toEqual({ thinking: true })
    expect(qwen?.variants?.high?.reasoningEffort).toBeUndefined()
  })
})
