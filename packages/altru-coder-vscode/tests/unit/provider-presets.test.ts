import { describe, expect, it } from "bun:test"
import { PROVIDER_PRESETS } from "../../webview-ui/src/components/settings/provider-presets"

describe("provider presets", () => {
  it("ships the OpenRouter endpoint catalog without save-time fetching", () => {
    const preset = PROVIDER_PRESETS.find((item) => item.id === "openrouter")
    const model = preset?.models?.find((item) => item.id === "moonshotai/kimi-k2.6")

    expect(preset?.fetch).toBe(false)
    expect((preset?.models?.length ?? 0) > 300).toBe(true)
    expect(preset?.models?.some((item) => item.id === "openai/gpt-5.3-codex")).toBe(true)
    expect(preset?.models?.some((item) => item.id === "openrouter/auto")).toBe(true)
    expect(model?.reasoning).toBe(true)
    expect(Object.keys(model?.variants ?? {})).toEqual(["low", "medium", "high", "xhigh"])
    expect(model?.variants?.xhigh).toEqual({ reasoning: { effort: "xhigh" } })
  })

  it("ships NVIDIA Kimi K2.6 with thinking variants", () => {
    const preset = PROVIDER_PRESETS.find((item) => item.id === "nvidia")
    const model = preset?.models?.find((item) => item.id === "moonshotai/kimi-k2.6")

    expect(preset?.fetch).toBe(false)
    expect((preset?.models?.length ?? 0) > 100).toBe(true)
    expect(preset?.models?.some((item) => item.id === "qwen/qwen3.5-397b-a17b")).toBe(true)
    expect(model?.reasoning).toBe(true)
    expect(Object.keys(model?.variants ?? {})).toEqual(["normal", "low", "medium", "high", "xhigh"])
    expect(model?.variants?.normal).toEqual({})
    expect(model?.variants?.xhigh?.chat_template_kwargs).toEqual({ thinking: true })
  })
})
