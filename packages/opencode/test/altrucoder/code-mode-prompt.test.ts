import { describe, expect, test } from "bun:test"
import { AltruCoderSessionPrompt } from "../../src/altrucoder/session/prompt"

describe("Code mode prompt", () => {
  test("adds implementation-first instructions for code mode", () => {
    const text = AltruCoderSessionPrompt.modeInstructions({ agent: { name: "code" } })

    expect(text).toContain("Code mode is active")
    expect(text).toContain("edit files directly with tools")
    expect(text).toContain("Only provide code in chat")
  })

  test("does not add code mode instructions to other modes", () => {
    expect(AltruCoderSessionPrompt.modeInstructions({ agent: { name: "ask" } })).toBeUndefined()
    expect(AltruCoderSessionPrompt.modeInstructions({ agent: { name: "debug" } })).toBeUndefined()
    expect(AltruCoderSessionPrompt.modeInstructions({ agent: { name: "orchestrator" } })).toBeUndefined()
    expect(AltruCoderSessionPrompt.modeInstructions({ agent: { name: "plan" } })).toBeUndefined()
  })
})
