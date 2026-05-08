import { describe, expect, test } from "bun:test"
import { AltruCoderSessionPrompt } from "../../src/altrucoder/session/prompt"

describe("Code mode prompt", () => {
  test("adds implementation-first instructions for code mode", () => {
    const text = AltruCoderSessionPrompt.modeInstructions({ agent: { name: "code" } })

    expect(text).toContain("Altru Coder Collaboration Mode")
    expect(text).toContain("Code mode is active")
    expect(text).toContain("edit files directly with tools")
    expect(text).toContain("Only provide code in chat")
  })

  test("adds bounded collaboration instructions to every user-facing mode", () => {
    expect(AltruCoderSessionPrompt.modeInstructions({ agent: { name: "ask" } })).toContain(
      "Do not modify files unless the user explicitly asks",
    )
    expect(AltruCoderSessionPrompt.modeInstructions({ agent: { name: "debug" } })).toContain(
      "isolating the root cause",
    )
    expect(AltruCoderSessionPrompt.modeInstructions({ agent: { name: "orchestrator" } })).toContain(
      "Delegate only separable work",
    )
    expect(AltruCoderSessionPrompt.modeInstructions({ agent: { name: "plan" } })).toContain(
      "decision-ready implementation plan",
    )
  })
})
