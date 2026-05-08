import { describe, expect, test } from "bun:test"
import {
  hasAltruCoderIndexingAuth,
  resolveAltruCoderIndexingAuth,
  shouldDefaultIndexingToAltruCoder,
} from "../../src/altrucoder/indexing-auth"

describe("Altru Coder indexing auth resolution", () => {
  test("detects auth from explicit indexing Altru Coder config", () => {
    const auth = resolveAltruCoderIndexingAuth({
      config: { indexing: { "altru-coder": { apiKey: "idx-token", baseUrl: "https://idx.test", organizationId: "org_idx" } } },
    })

    expect(auth).toEqual({ apiKey: "idx-token", baseUrl: "https://idx.test", organizationId: "org_idx" })
    expect(hasAltruCoderIndexingAuth({ config: { indexing: { "altru-coder": { apiKey: "idx-token" } } } })).toBe(true)
  })

  test("detects auth from provider config, provider state, auth storage, and env", () => {
    expect(
      resolveAltruCoderIndexingAuth({ config: { provider: { "altru-coder": { options: { apiKey: "cfg-token" } } } } }).apiKey,
    ).toBe("cfg-token")
    expect(resolveAltruCoderIndexingAuth({ provider: { options: { altrucoderToken: "provider-token" } } }).apiKey).toBe(
      "provider-token",
    )
    expect(resolveAltruCoderIndexingAuth({ auth: { type: "oauth", access: "oauth-token", accountId: "org_oauth" } })).toEqual({
      apiKey: "oauth-token",
      organizationId: "org_oauth",
    })
    expect(resolveAltruCoderIndexingAuth({ env: { ALTRU_CODER_API_KEY: "env-token", ALTRU_CODER_ORG_ID: "org_env" } })).toEqual({
      apiKey: "env-token",
      organizationId: "org_env",
    })
  })

  test("defaults to Altru Coder only when no provider or other embedder config is present", () => {
    const auth = { apiKey: "altru-coder-token" }

    expect(shouldDefaultIndexingToAltruCoder({}, auth)).toBe(true)
    expect(shouldDefaultIndexingToAltruCoder({ provider: "openai" }, auth)).toBe(false)
    expect(shouldDefaultIndexingToAltruCoder({ openai: { apiKey: "openai-key" } }, auth)).toBe(false)
    expect(shouldDefaultIndexingToAltruCoder({ ollama: { baseUrl: "http://localhost:11434" } }, auth)).toBe(false)
  })
})
