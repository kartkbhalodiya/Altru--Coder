import { describe, expect, test } from "bun:test"
import { tool, type Tool } from "ai"
import z from "zod"
import { LLM } from "../../src/session/llm"
import { format as formatInvalid } from "../../src/tool/invalid"

const stub = tool({
  description: "test",
  inputSchema: z.object({}),
  execute: async () => ({ output: "" }),
})

describe("Altru Coder tool call repair", () => {
  test("repairs unsafe Playwright aliases only when the real tool is registered", () => {
    const tools: Record<string, Tool> = {
      "altru-coder-playwright_browser_run_code": stub,
    }

    expect(
      LLM.repairToolName({
        name: "altru-coder-playwright_browser_run_code_unsafe",
        tools,
      }),
    ).toBe("altru-coder-playwright_browser_run_code")
  })

  test("does not repair unavailable Playwright tools when browser automation is disconnected", () => {
    const tools: Record<string, Tool> = {
      bash: stub,
      read: stub,
    }

    expect(
      LLM.repairToolName({
        name: "altru-coder-playwright_browser_run_code_unsafe",
        tools,
      }),
    ).toBeUndefined()
  })

  test("adds explicit browser automation guidance to unavailable MCP tool calls", () => {
    const input = JSON.parse(
      LLM.invalidToolInput({
        name: "altru-coder-playwright_browser_run_code_unsafe",
        error: {
          message:
            "Model tried to call unavailable tool 'altru-coder-playwright_browser_run_code_unsafe'. Available tools: bash, read.",
        },
        tools: {
          invalid: stub,
          bash: stub,
          read: stub,
        },
      }),
    ) as { error: string; tool: string }

    expect(input.tool).toBe("altru-coder-playwright_browser_run_code_unsafe")
    expect(input.error).toContain("Browser automation tools are not currently available")
    expect(input.error).toContain("Do not retry this Playwright MCP tool")
    expect(formatInvalid(input)).not.toContain("arguments provided to the tool are invalid")
  })
})
