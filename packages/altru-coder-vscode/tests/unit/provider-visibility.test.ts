import { describe, expect, it } from "bun:test"

import {
  disabledProviderOptions,
  providersWithAltruCoderFallback,
  visibleConnectedIds,
} from "../../webview-ui/src/components/settings/provider-visibility"

describe("visibleConnectedIds", () => {
  it("hides Altru Coder from the connected list when auth is missing", () => {
    const ids = visibleConnectedIds(["altru-coder", "openrouter"], { openrouter: "api" })

    expect(ids).toEqual(["openrouter"])
  })

  it("keeps Altru Coder in the connected list when auth exists", () => {
    const ids = visibleConnectedIds(["altru-coder", "openrouter"], { "altru-coder": "oauth", openrouter: "api" })

    expect(ids).toEqual(["altru-coder", "openrouter"])
  })

  it("leaves non-Altru Coder providers untouched", () => {
    const ids = visibleConnectedIds(["anthropic"], {})

    expect(ids).toEqual(["anthropic"])
  })
})

describe("disabledProviderOptions", () => {
  it("includes Altru Coder and excludes already disabled providers", () => {
    const options = disabledProviderOptions(
      {
        "altru-coder": { id: "altru-coder", name: "Altru Coder Gateway", env: [], models: {} },
        openai: { id: "openai", name: "OpenAI", env: [], models: {} },
        anthropic: { id: "anthropic", name: "Anthropic", env: [], models: {} },
      },
      ["openai"],
    )

    expect(options).toEqual([
      { value: "altru-coder", label: "Altru Coder Gateway" },
      { value: "anthropic", label: "Anthropic" },
    ])
  })

  it("sorts options by provider name", () => {
    const options = disabledProviderOptions(
      {
        zed: { id: "zed", name: "Zed", env: [], models: {} },
        alpha: { id: "alpha", name: "Alpha", env: [], models: {} },
      },
      [],
    )

    expect(options).toEqual([
      { value: "alpha", label: "Alpha" },
      { value: "zed", label: "Zed" },
    ])
  })
})

describe("providersWithAltruCoderFallback", () => {
  it("adds Altru Coder when backend providers omit it", () => {
    const providers = providersWithAltruCoderFallback({
      anthropic: { id: "anthropic", name: "Anthropic", env: [], models: {} },
    })

    expect(providers["altru-coder"]?.name).toBe("Altru Coder Gateway")
    expect(providers.anthropic?.name).toBe("Anthropic")
  })

  it("keeps the backend Altru Coder provider when present", () => {
    const providers = providersWithAltruCoderFallback({
      "altru-coder": { id: "altru-coder", name: "Custom Altru Coder Name", env: [], models: {} },
    })

    expect(providers["altru-coder"]?.name).toBe("Custom Altru Coder Name")
  })
})
