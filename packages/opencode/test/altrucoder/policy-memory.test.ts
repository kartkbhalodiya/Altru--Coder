import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { Effect } from "effect"
import { AltruCoderMemory } from "../../src/altrucoder/memory"
import { AltruCoderPolicy } from "../../src/altrucoder/policy"
import { AltruCoderToolHooks } from "../../src/altrucoder/tool/hooks"
import { MessageID, SessionID } from "../../src/session/schema"

const ctx = {
  sessionID: SessionID.descending(),
  messageID: MessageID.ascending(),
  callID: "call-1",
}

function quote(value: string) {
  if (process.platform === "win32") return `"${value.replace(/`/g, "``").replace(/"/g, '`"')}"`
  return `'${value.replace(/'/g, "'\\''")}'`
}

async function hook(script: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "altru-hook-"))
  const file = path.join(dir, "hook.js")
  const config = path.join(dir, "hooks.json")
  await fs.writeFile(file, script)
  return { dir, file, config, command: `${quote(process.execPath)} ${quote(file)}` }
}

describe("Altru Coder policy", () => {
  test("allows scoped read-only shell commands", async () => {
    await expect(
      Effect.runPromise(
        AltruCoderPolicy.validate({
          tool: "bash",
          args: { command: "git status --short" },
          ctx,
        }),
      ),
    ).resolves.toBeUndefined()
  })

  test("blocks destructive whole-workspace shell commands", async () => {
    await expect(
      Effect.runPromise(
        AltruCoderPolicy.validate({
          tool: "bash",
          args: { command: "git reset --hard" },
          ctx,
        }),
      ),
    ).rejects.toThrow("Altru Coder policy blocked bash")
  })
})

describe("Altru Coder memory", () => {
  test("formats memories with citations", () => {
    const text = AltruCoderMemory.format([
      {
        id: "abc",
        kind: "decision",
        text: "Use provider presets for model setup.",
        created: 1,
        updated: 1,
        citations: [{ sessionID: "session-1", messageID: "message-1" }],
      },
    ])

    expect(text).toContain("[decision] Use provider presets")
    expect(text).toContain("source=session:session-1/message:message-1")
  })

  test("redacts secrets before formatting and summarizing memory", () => {
    const record = {
      id: "abc",
      kind: "fact" as const,
      text: "NVIDIA key nvapi-redactme12 was pasted.",
      created: 1,
      updated: 1,
      citations: [{ sessionID: "session-1" }],
    }
    const formatted = AltruCoderMemory.format([record])
    const summary = AltruCoderMemory.summarize([record])

    expect(formatted).toContain("[redacted]")
    expect(summary).toContain("[redacted]")
    expect(formatted).not.toContain("nvapi-redactme")
    expect(summary).not.toContain("nvapi-redactme")
  })

  test("builds grouped consolidation summaries", () => {
    const text = AltruCoderMemory.summarize([
      {
        id: "decision-1",
        kind: "decision",
        text: "Use local model storage for user-added providers.",
        created: 1,
        updated: 3,
        citations: [{ sessionID: "session-1" }],
      },
      {
        id: "preference-1",
        kind: "preference",
        text: "Keep AI text responses unboxed.",
        created: 1,
        updated: 2,
        citations: [{ sessionID: "session-1" }],
      },
    ])

    expect(text).toContain("# Altru Coder Project Memory")
    expect(text).toContain("## Decisions")
    expect(text).toContain("Use local model storage")
    expect(text).toContain("## Preferences")
  })
})

describe("Altru Coder tool hooks", () => {
  test("records sanitized pre and post tool events", async () => {
    AltruCoderToolHooks.clear()

    await Effect.runPromise(
      AltruCoderToolHooks.before({
        tool: "bash",
        args: { command: "git status --short", apiKey: "sk-testsecret1234567890" },
        ctx,
      }),
    )
    const result = await Effect.runPromise(
      AltruCoderToolHooks.after({
        tool: "bash",
        args: { command: "git status --short", token: "ghp_testsecret1234567890" },
        ctx,
        result: { title: "Status", output: "clean", metadata: { token: "nvapi-testsecret1234567890" } },
      }),
    )
    const events = AltruCoderToolHooks.events()
    const data = JSON.stringify(events)

    expect(result.output).toBe("clean")
    expect(events).toHaveLength(2)
    expect(events[0].name).toBe("PreToolUse")
    expect(events[0].mutating).toBe(false)
    expect(events[1].name).toBe("PostToolUse")
    expect(data).toContain("[redacted]")
    expect(data).not.toContain("sk-testsecret")
    expect(data).not.toContain("ghp_testsecret")
    expect(data).not.toContain("nvapi-testsecret")
  })

  test("records failed tool events without leaking raw error objects", async () => {
    AltruCoderToolHooks.clear()

    await Effect.runPromise(
      AltruCoderToolHooks.failure({
        tool: "write",
        args: { filePath: "src/app.ts", password: "secret" },
        ctx,
        error: new Error("write failed"),
      }),
    )
    const events = AltruCoderToolHooks.events()

    expect(events).toHaveLength(1)
    expect(events[0].name).toBe("ToolError")
    expect(events[0].mutating).toBe(true)
    expect(events[0].error).toBe("write failed")
    expect(JSON.stringify(events)).not.toContain("secret")
  })

  test("runs opt-in PreToolUse hooks that can block a tool", async () => {
    const prev = process.env.ALTRU_CODER_HOOKS
    const data = await hook(`
let input = ""
process.stdin.on("data", (chunk) => input += chunk)
process.stdin.on("end", () => {
  const payload = JSON.parse(input)
  console.log(JSON.stringify({ decision: "deny", reason: "blocked " + payload.tool }))
})
`)
    try {
      await fs.writeFile(
        data.config,
        JSON.stringify({
          hooks: {
            PreToolUse: [{ matcher: "^bash$", command: data.command }],
          },
        }),
      )
      process.env.ALTRU_CODER_HOOKS = data.config
      AltruCoderToolHooks.clear()

      await expect(
        Effect.runPromise(
          AltruCoderToolHooks.before({
            tool: "bash",
            args: { command: "git status --short" },
            ctx,
          }),
        ),
      ).rejects.toThrow("blocked bash")
    } finally {
      if (prev === undefined) delete process.env.ALTRU_CODER_HOOKS
      else process.env.ALTRU_CODER_HOOKS = prev
      await fs.rm(data.dir, { recursive: true, force: true })
      AltruCoderToolHooks.clear()
    }
  })

  test("runs opt-in PostToolUse hooks that can adjust output", async () => {
    const prev = process.env.ALTRU_CODER_HOOKS
    const data = await hook(`
let input = ""
process.stdin.on("data", (chunk) => input += chunk)
process.stdin.on("end", () => {
  const payload = JSON.parse(input)
  console.log(JSON.stringify({ title: "Hooked", output: "checked: " + payload.extra.output }))
})
`)
    try {
      await fs.writeFile(
        data.config,
        JSON.stringify({
          hooks: {
            PostToolUse: [{ matcher: "^bash$", command: data.command }],
          },
        }),
      )
      process.env.ALTRU_CODER_HOOKS = data.config
      AltruCoderToolHooks.clear()

      const result = await Effect.runPromise(
        AltruCoderToolHooks.after({
          tool: "bash",
          args: { command: "git status --short" },
          ctx,
          result: { title: "Status", output: "clean", metadata: {} },
        }),
      )

      expect(result.title).toBe("Hooked")
      expect(result.output).toBe("checked: clean")
    } finally {
      if (prev === undefined) delete process.env.ALTRU_CODER_HOOKS
      else process.env.ALTRU_CODER_HOOKS = prev
      await fs.rm(data.dir, { recursive: true, force: true })
      AltruCoderToolHooks.clear()
    }
  })
})
