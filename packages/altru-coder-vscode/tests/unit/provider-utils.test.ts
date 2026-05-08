import { describe, it, expect } from "bun:test"
import {
  flattenModels,
  findModel,
  isModelValid,
  localProviders,
  mergeLocalProviders,
} from "../../webview-ui/src/context/provider-utils"
import { ANTHROPIC_PROVIDER_PACKAGE, CUSTOM_PROVIDER_PACKAGE } from "../../src/shared/provider-model"
import type { Provider } from "../../webview-ui/src/types/messages"

function makeProvider(id: string, name: string, modelIds: string[]): Provider {
  const models: Provider["models"] = {}
  for (const mid of modelIds) {
    models[mid] = { id: mid, name: mid.toUpperCase() }
  }
  return { id, name, models }
}

describe("flattenModels", () => {
  it("returns empty array for empty providers", () => {
    expect(flattenModels({})).toEqual([])
  })

  it("enriches each model with providerID and providerName", () => {
    const providers = { openai: makeProvider("openai", "OpenAI", ["gpt-4"]) }
    const models = flattenModels(providers)
    expect(models).toHaveLength(1)
    expect(models[0]!.providerID).toBe("openai")
    expect(models[0]!.providerName).toBe("OpenAI")
    expect(models[0]!.id).toBe("gpt-4")
  })

  it("flattens multiple providers", () => {
    const providers = {
      openai: makeProvider("openai", "OpenAI", ["gpt-4", "gpt-3.5"]),
      anthropic: makeProvider("anthropic", "Anthropic", ["claude-3"]),
    }
    const models = flattenModels(providers)
    expect(models).toHaveLength(3)
    const ids = models.map((m) => m.id)
    expect(ids).toContain("gpt-4")
    expect(ids).toContain("gpt-3.5")
    expect(ids).toContain("claude-3")
  })

  it("handles provider with no models", () => {
    const providers = { empty: makeProvider("empty", "Empty", []) }
    expect(flattenModels(providers)).toEqual([])
  })
})

describe("findModel", () => {
  const providers = {
    openai: makeProvider("openai", "OpenAI", ["gpt-4", "gpt-3.5"]),
    anthropic: makeProvider("anthropic", "Anthropic", ["claude-3"]),
  }
  const models = flattenModels(providers)

  it("returns undefined for null selection", () => {
    expect(findModel(models, null)).toBeUndefined()
  })

  it("finds model by providerID and modelID", () => {
    const result = findModel(models, { providerID: "openai", modelID: "gpt-4" })
    expect(result).not.toBeUndefined()
    expect(result?.id).toBe("gpt-4")
    expect(result?.providerID).toBe("openai")
  })

  it("returns undefined when providerID does not match", () => {
    expect(findModel(models, { providerID: "unknown", modelID: "gpt-4" })).toBeUndefined()
  })

  it("returns undefined when modelID does not match", () => {
    expect(findModel(models, { providerID: "openai", modelID: "unknown-model" })).toBeUndefined()
  })

  it("finds model from second provider", () => {
    const result = findModel(models, { providerID: "anthropic", modelID: "claude-3" })
    expect(result?.providerName).toBe("Anthropic")
  })

  it("returns undefined for empty model list", () => {
    expect(findModel([], { providerID: "openai", modelID: "gpt-4" })).toBeUndefined()
  })
})

describe("isModelValid", () => {
  const providers = {
    "altru-coder": makeProvider("altru-coder", "Altru Coder Gateway", ["altru-coder-auto/free"]),
    openai: makeProvider("openai", "OpenAI", ["gpt-4o"]),
  }

  it("accepts a connected provider model", () => {
    expect(isModelValid(providers, ["openai"], { providerID: "openai", modelID: "gpt-4o" })).toBe(true)
  })

  it("rejects a disconnected non-altru-coder provider", () => {
    expect(isModelValid(providers, [], { providerID: "openai", modelID: "gpt-4o" })).toBe(false)
  })

  it("accepts altru-coder models when present in the catalog", () => {
    expect(isModelValid(providers, [], { providerID: "altru-coder", modelID: "altru-coder-auto/free" })).toBe(true)
  })

  it("rejects unknown models", () => {
    expect(isModelValid(providers, ["openai"], { providerID: "openai", modelID: "missing" })).toBe(false)
  })
})

describe("local custom providers", () => {
  it("builds provider models from local config", () => {
    const providers = localProviders({
      nvidia: {
        npm: CUSTOM_PROVIDER_PACKAGE,
        name: "NVIDIA NIM",
        models: {
          "qwen/qwen3-coder-480b-a35b-instruct": {
            name: "Qwen3 Coder",
            reasoning: true,
            variants: { fast: { reasoningEffort: "low" } },
          },
        },
      },
    })

    const model = providers.nvidia?.models["qwen/qwen3-coder-480b-a35b-instruct"]
    expect(providers.nvidia?.source).toBe("config")
    expect(model?.name).toBe("Qwen3 Coder")
    expect(model?.capabilities?.reasoning).toBe(true)
    expect(model?.variants?.fast?.reasoningEffort).toBe("low")
  })

  it("keeps locally saved models valid without a connected flag", () => {
    const providers = mergeLocalProviders(
      {},
      {
        nvidia: {
          npm: CUSTOM_PROVIDER_PACKAGE,
          name: "NVIDIA NIM",
          models: {
            "moonshotai/kimi-k2-instruct-0905": { name: "Kimi K2" },
          },
        },
      },
    )

    expect(
      isModelValid(providers, [], {
        providerID: "nvidia",
        modelID: "moonshotai/kimi-k2-instruct-0905",
      }),
    ).toBe(true)
  })

  it("builds provider models from Anthropic custom config", () => {
    const providers = localProviders({
      anthropic: {
        npm: ANTHROPIC_PROVIDER_PACKAGE,
        name: "Anthropic",
        models: {
          "claude-opus-4-7": { name: "Claude Opus 4.7", reasoning: true },
        },
      },
    })

    expect(providers.anthropic?.name).toBe("Anthropic")
    expect(providers.anthropic?.models["claude-opus-4-7"]?.name).toBe("Claude Opus 4.7")
    expect(providers.anthropic?.models["claude-opus-4-7"]?.capabilities?.reasoning).toBe(true)
  })
})
