import { describe, expect, test } from "bun:test"
import { resolveAltruCoderGatewayBaseUrl, resolveAltruCoderOpenRouterBaseUrl } from "../../src/api/url"

describe("Altru Coder API URL resolvers", () => {
  test("resolves production route bases", () => {
    expect(resolveAltruCoderGatewayBaseUrl()).toBe("https://api.altru-coder.ai/api/gateway/")
    expect(resolveAltruCoderOpenRouterBaseUrl()).toBe("https://api.altru-coder.ai/api/openrouter/")
  })

  test("normalizes root API base overrides", () => {
    expect(resolveAltruCoderGatewayBaseUrl({ baseURL: "https://example.test" })).toBe("https://example.test/api/gateway/")
    expect(resolveAltruCoderOpenRouterBaseUrl({ baseURL: "https://example.test/" })).toBe(
      "https://example.test/api/openrouter/",
    )
  })

  test("replaces existing Altru Coder API route paths", () => {
    expect(resolveAltruCoderGatewayBaseUrl({ baseURL: "https://example.test/api/openrouter/" })).toBe(
      "https://example.test/api/gateway/",
    )
    expect(resolveAltruCoderOpenRouterBaseUrl({ baseURL: "https://example.test/api/gateway/" })).toBe(
      "https://example.test/api/openrouter/",
    )
  })

  test("preserves path prefixes before api", () => {
    expect(resolveAltruCoderGatewayBaseUrl({ baseURL: "https://example.test/dev/api/openrouter/" })).toBe(
      "https://example.test/dev/api/gateway/",
    )
    expect(resolveAltruCoderOpenRouterBaseUrl({ baseURL: "https://example.test/dev" })).toBe(
      "https://example.test/dev/api/openrouter/",
    )
  })

  test("strips search and hash components", () => {
    expect(resolveAltruCoderGatewayBaseUrl({ baseURL: "https://example.test/api/openrouter/?x=1#frag" })).toBe(
      "https://example.test/api/gateway/",
    )
  })

  test("prefers token-derived URL when token contains one", () => {
    expect(resolveAltruCoderGatewayBaseUrl({ baseURL: "https://fallback.test", token: "https://token.test:opaque" })).toBe(
      "https://token.test/api/gateway/",
    )
  })

  test("resolves child endpoint URLs", () => {
    expect(new URL("embedding-models", resolveAltruCoderGatewayBaseUrl({ baseURL: "https://example.test" })).toString()).toBe(
      "https://example.test/api/gateway/embedding-models",
    )
  })
})
