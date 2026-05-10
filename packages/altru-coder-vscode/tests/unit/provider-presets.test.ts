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

  it("ships DeepSeek V4 Flash and Pro with optional live fetch", () => {
    const preset = PROVIDER_PRESETS.find((item) => item.id === "deepseek")
    const flash = preset?.models?.find((item) => item.id === "deepseek-v4-flash")
    const pro = preset?.models?.find((item) => item.id === "deepseek-v4-pro")

    expect(preset?.fetch).toBe(true)
    expect(flash?.name).toBe("DeepSeek V4 Flash")
    expect(pro?.name).toBe("DeepSeek V4 Pro")
    expect(flash?.reasoning).toBe(true)
    expect(pro?.reasoning).toBe(true)
    expect(Object.keys(flash?.variants ?? {})).toEqual(["normal", "low", "medium", "high", "xhigh"])
    expect(flash?.variants?.normal).toEqual({ thinking: { type: "disabled" } })
    expect(flash?.variants?.xhigh).toEqual({ thinking: { type: "enabled" }, reasoningEffort: "xhigh" })
  })

  it("ships expanded public provider catalogs from their model endpoints", () => {
    const requesty = PROVIDER_PRESETS.find((item) => item.id === "requesty")
    const vercel = PROVIDER_PRESETS.find((item) => item.id === "vercel-ai-gateway")
    const deepinfra = PROVIDER_PRESETS.find((item) => item.id === "deepinfra")
    const huggingface = PROVIDER_PRESETS.find((item) => item.id === "huggingface")
    const venice = PROVIDER_PRESETS.find((item) => item.id === "venice")
    const samba = PROVIDER_PRESETS.find((item) => item.id === "sambanova")

    expect((requesty?.models?.length ?? 0) > 450).toBe(true)
    expect((vercel?.models?.length ?? 0) > 250).toBe(true)
    expect((deepinfra?.models?.length ?? 0) > 140).toBe(true)
    expect((huggingface?.models?.length ?? 0) > 100).toBe(true)
    expect((venice?.models?.length ?? 0) > 70).toBe(true)
    expect(samba?.fetch).toBe(true)
    expect(samba?.models?.some((item) => item.id === "DeepSeek-V3.2")).toBe(true)
    expect(samba?.models?.some((item) => item.id === "Qwen3-235B")).toBe(false)
  })
})
