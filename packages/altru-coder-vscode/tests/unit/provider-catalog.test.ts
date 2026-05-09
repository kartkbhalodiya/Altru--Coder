import { describe, expect, it } from "bun:test"
import { providerLogoID } from "../../webview-ui/src/components/settings/provider-catalog"

describe("providerLogoID", () => {
  it("keeps the Altru Coder logo for built-in free models", () => {
    expect(providerLogoID("altru-coder", "altru-coder/minimax-m2.5-free", "Altru Coder MiniMax M2.5 Free")).toBe(
      "altru-coder",
    )
  })

  it("uses the sub-provider logo for Altru Coder Gateway model IDs", () => {
    expect(providerLogoID("altru-coder", "openai/gpt-5", "OpenAI: GPT-5")).toBe("openai")
    expect(providerLogoID("altru-coder", "anthropic/claude-sonnet-4.5", "Anthropic: Claude Sonnet 4.5")).toBe(
      "anthropic",
    )
    expect(providerLogoID("altru-coder", "google/gemini-2.5-pro", "Google: Gemini 2.5 Pro")).toBe("google")
  })

  it("uses the display-name prefix when a gateway model ID has no provider prefix", () => {
    expect(providerLogoID("altru-coder", "gpt-5", "OpenAI: GPT-5")).toBe("openai")
  })

  it("normalizes common provider aliases", () => {
    expect(providerLogoID("altru-coder", "x-ai/grok-4", "xAI: Grok 4")).toBe("xai")
    expect(providerLogoID("altru-coder", "z-ai/glm-4.6", "Z.AI: GLM 4.6")).toBe("zai")
  })

  it("keeps custom direct providers on their own provider ID", () => {
    expect(providerLogoID("openai", "gpt-5", "GPT-5")).toBe("openai")
  })
})
