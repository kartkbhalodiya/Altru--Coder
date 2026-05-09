// altrucoder_change - new file
//
// Regression tests for https://github.com/Altru-Coder/altrucoder/issues/9186
//
// When the user removes a model or a variant from a custom provider and saves,
// the removed entry must disappear from the config on disk. The save path
// relies on `null` sentinels being allowed in the Provider models record and
// in the Model variants record so that `mergeConfig` (merge + stripNulls) can
// delete them cleanly.

import { describe, expect, it } from "bun:test"
import * as Config from "../../src/config/config"
import { AltruCoderConfig } from "../../src/altrucoder/config/config"
import { Global } from "@opencode-ai/core/global"
import path from "path"
import fs from "fs/promises"
import { tmpdir } from "../fixture/fixture"

describe("Config.Info — null sentinels for custom provider deletes", () => {
  it("accepts a null model value inside a provider", () => {
    const parsed = Config.Info.zod.safeParse({
      provider: {
        myprovider: {
          name: "My Provider",
          models: {
            "model-gone": null,
          },
        },
      },
    })
    expect(parsed.success).toBe(true)
  })

  it("accepts a null provider value", () => {
    const parsed = Config.Info.zod.safeParse({
      provider: {
        myprovider: null,
      },
    })
    expect(parsed.success).toBe(true)
  })

  it("accepts a null variant value inside a model", () => {
    const parsed = Config.Info.zod.safeParse({
      provider: {
        myprovider: {
          name: "My Provider",
          models: {
            "model-1": {
              variants: {
                low: null,
              },
            },
          },
        },
      },
    })
    expect(parsed.success).toBe(true)
  })

  it("accepts NVIDIA chat template kwargs variants", () => {
    const parsed = Config.Info.zod.safeParse({
      provider: {
        nvidia: {
          name: "NVIDIA NIM",
          npm: "@ai-sdk/openai-compatible",
          options: { baseURL: "https://integrate.api.nvidia.com/v1" },
          models: {
            "moonshotai/kimi-k2.6": {
              name: "Kimi K2.6",
              reasoning: true,
              variants: {
                xhigh: { chat_template_kwargs: { thinking: true } },
              },
            },
          },
        },
      },
    })
    expect(parsed.success).toBe(true)
  })
})

describe("AltruCoderConfig.mergeConfig — custom provider model/variant deletion", () => {
  it("drops a model from an existing provider when the patch sets it to null", () => {
    const existing: Config.Info = {
      provider: {
        myprovider: {
          name: "My Provider",
          models: {
            "model-keep": { name: "Keep" },
            "model-gone": { name: "Gone" },
          },
        },
      },
    }
    const patch: Config.Info = {
      provider: {
        myprovider: {
          models: {
            "model-keep": { name: "Keep" },
            "model-gone": null,
          },
        },
      },
    }

    const merged = AltruCoderConfig.mergeConfig(existing, patch)
    const provider = merged.provider?.myprovider
    if (!provider) throw new Error("missing merged provider")
    const models = provider.models ?? {}
    expect(models["model-keep"]).toBeDefined()
    expect("model-gone" in models).toBe(false)
  })

  it("drops a provider when the patch sets it to null", () => {
    const existing: Config.Info = {
      provider: {
        myprovider: {
          name: "My Provider",
          models: { keep: { name: "Keep" } },
        },
        openai: {
          name: "OpenAI",
        },
      },
    }
    const patch: Config.Info = {
      provider: {
        myprovider: null,
      },
    }

    const merged = AltruCoderConfig.mergeConfig(existing, patch)
    expect(merged.provider?.openai).toBeDefined()
    expect("myprovider" in (merged.provider ?? {})).toBe(false)
  })

  it("drops a variant from an existing model when the patch sets it to null", () => {
    const existing: Config.Info = {
      provider: {
        myprovider: {
          name: "My Provider",
          models: {
            "model-1": {
              name: "Model One",
              variants: {
                high: { reasoningEffort: "high" },
                low: { reasoningEffort: "low" },
              },
            },
          },
        },
      },
    }
    const patch: Config.Info = {
      provider: {
        myprovider: {
          models: {
            "model-1": {
              variants: {
                high: { reasoningEffort: "high" },
                low: null,
              },
            },
          },
        },
      },
    }

    const merged = AltruCoderConfig.mergeConfig(existing, patch)
    const provider = merged.provider?.myprovider
    if (!provider) throw new Error("missing merged provider")
    const model = provider.models?.["model-1"]
    if (!model) throw new Error("missing merged model")
    const variants = model.variants ?? {}
    expect(variants.high).toBeDefined()
    expect("low" in variants).toBe(false)
  })
})

describe("Config.updateGlobal — custom provider save without instance context", () => {
  it("updates global config with dispose disabled outside an instance", async () => {
    await using tmp = await tmpdir()
    const prev = Global.Path.config
    ;(Global.Path as { config: string }).config = tmp.path

    try {
      const config: Config.Info = {
        provider: {
          myprovider: {
            npm: "@ai-sdk/openai-compatible",
            name: "My Provider",
            options: { baseURL: "https://example.com/v1" },
            models: { keep: { name: "Keep" }, gone: null },
          },
        },
      }
      const result = await Config.updateGlobal(
        config,
        { dispose: false, invalidate: false },
      )

      expect(result.provider?.myprovider).toBeDefined()
      const text = await fs.readFile(path.join(tmp.path, "altru-coder.jsonc"), "utf8")
      expect(text).toContain('"keep"')
      expect(text).not.toContain('"gone"')
    } finally {
      ;(Global.Path as { config: string }).config = prev
      await Config.invalidate(true)
    }
  })
})
