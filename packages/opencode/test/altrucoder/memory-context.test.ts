import { afterEach, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Global } from "@opencode-ai/core/global"
import { AltruCoderMemory } from "../../src/altrucoder/memory"
import { tmpdir } from "../fixture/fixture"

const ids: string[] = []

function project() {
  const id = `memory-context-${crypto.randomUUID()}`
  ids.push(id)
  return id
}

async function clean(id: string) {
  await fs.rm(path.join(Global.Path.data, "memory", encodeURIComponent(id)), { recursive: true, force: true })
}

afterEach(async () => {
  await Promise.all(ids.splice(0).map(clean))
})

test("system memory includes a bounded repo context snapshot", async () => {
  const id = project()
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "package.json"),
        JSON.stringify(
          {
            name: "root-app",
            packageManager: "bun@1.3.13",
            workspaces: ["packages/*"],
            scripts: { dev: "bun dev", typecheck: "bun turbo typecheck" },
            dependencies: { hono: "latest" },
          },
          null,
          2,
        ),
      )
      await Bun.write(path.join(dir, "AGENTS.md"), "Project rule: use worktrees.\napi_key=secret-value\n")
      await fs.mkdir(path.join(dir, "packages", "cli"), { recursive: true })
      await Bun.write(
        path.join(dir, "packages", "cli", "package.json"),
        JSON.stringify(
          {
            name: "@demo/cli",
            scripts: { test: "bun test" },
            dependencies: { effect: "latest" },
          },
          null,
          2,
        ),
      )
    },
  })

  const out = await AltruCoderMemory.system(id, 12, tmp.path, "worktree")

  expect(out).toContain("<altru_repo_context>")
  expect(out).toContain("root-app")
  expect(out).toContain("@demo/cli")
  expect(out).toContain("Project rule: use worktrees.")
  expect(out).toContain("api_key=[redacted]")
  expect(out).not.toContain("secret-value")
})

test("system memory ranks request-relevant memories ahead of recent unrelated memories", async () => {
  const id = project()
  await using tmp = await tmpdir()

  await AltruCoderMemory.remember({
    projectID: id,
    kind: "decision",
    text: "Agent Manager sessions must preserve git worktree isolation.",
    citation: { sessionID: "ses_memory", messageID: "msg_relevant" },
  })
  await AltruCoderMemory.remember({
    projectID: id,
    kind: "preference",
    text: "Use compact buttons in settings dialogs.",
    citation: { sessionID: "ses_memory", messageID: "msg_unrelated" },
  })

  const out = await AltruCoderMemory.system(id, 1, tmp.path, "agent manager worktree")

  expect(out).toContain("Agent Manager sessions must preserve git worktree isolation.")
  expect(out).not.toContain("Use compact buttons in settings dialogs.")
})

test("system memory keeps decisions above noisy summaries when no query is present", async () => {
  const id = project()
  await using tmp = await tmpdir()

  for (let i = 0; i < 8; i++) {
    await AltruCoderMemory.remember({
      projectID: id,
      kind: "summary",
      text: `Routine implementation summary ${i}`,
      citation: { sessionID: "ses_rank", messageID: `msg_summary_${i}` },
    })
  }
  await AltruCoderMemory.remember({
    projectID: id,
    kind: "decision",
    text: "Use Agent Manager worktrees for parallel session isolation.",
    citation: { sessionID: "ses_rank", messageID: "msg_decision" },
  })

  const out = await AltruCoderMemory.system(id, 4, tmp.path)

  expect(out).toContain("Use Agent Manager worktrees")
  expect(out).not.toContain("Routine implementation summary 0")
})

test("memory search matches related coding terms without exact wording", async () => {
  const id = project()

  await AltruCoderMemory.remember({
    projectID: id,
    kind: "decision",
    text: "Custom provider save crash was fixed by tolerating LocalContext.NotFound during Config.updateGlobal dispose:false.",
    citation: { sessionID: "ses_semantic", messageID: "msg_fix" },
  })
  await AltruCoderMemory.remember({
    projectID: id,
    kind: "summary",
    text: "Settings dialog buttons were resized for visual balance.",
    citation: { sessionID: "ses_semantic", messageID: "msg_ui" },
  })

  const records = await AltruCoderMemory.search(id, "api key saving context error", 1)

  expect(records).toHaveLength(1)
  expect(records[0]!.text).toContain("provider save crash")
})

test("memory search understands path and camel-case identifiers", async () => {
  const id = project()

  await AltruCoderMemory.remember({
    projectID: id,
    kind: "summary",
    text: "Changed packages/opencode/src/session/prompt.ts and AltruCoderSessionPromptQueue to hide queued follow-up prompts.",
    citation: { sessionID: "ses_path", messageID: "msg_prompt" },
  })
  await AltruCoderMemory.remember({
    projectID: id,
    kind: "summary",
    text: "Changed webview settings styles for provider cards.",
    citation: { sessionID: "ses_path", messageID: "msg_settings" },
  })

  const records = await AltruCoderMemory.search(id, "Session Prompt Queue followup", 1)

  expect(records).toHaveLength(1)
  expect(records[0]!.text).toContain("AltruCoderSessionPromptQueue")
})

test("completed turns consolidate changed files into durable memory", async () => {
  const id = project()

  const records = await AltruCoderMemory.consolidateTurn({
    projectID: id,
    sessionID: "ses_auto_memory",
    messageID: "msg_user",
    messages: [
      {
        info: { id: "msg_user", role: "user" },
        parts: [{ type: "text", text: "Add persistent project memory to Altru." }],
      },
      {
        info: { id: "msg_assistant", role: "assistant" },
        parts: [{ type: "text", text: "Implemented." }],
      },
    ],
    diffs: [
      { file: "packages/opencode/src/altrucoder/memory/index.ts", additions: 12, deletions: 2 },
      { file: "packages/opencode/src/session/prompt.ts", additions: 4, deletions: 1 },
    ],
  })

  const out = AltruCoderMemory.format(records)

  expect(out).toContain("Completed request: Add persistent project memory to Altru.")
  expect(out).toContain("packages/opencode/src/session/prompt.ts")
  expect(out).toContain("Net diff: +16/-3")
})

test("completed-turn summaries ignore lockfile-only noise", async () => {
  const id = project()

  const records = await AltruCoderMemory.consolidateTurn({
    projectID: id,
    sessionID: "ses_lock_noise",
    messageID: "msg_user",
    messages: [
      {
        info: { id: "msg_user", role: "user" },
        parts: [{ type: "text", text: "Update dependency metadata." }],
      },
    ],
    diffs: [{ file: "bun.lock", additions: 40, deletions: 20 }],
  })

  expect(records).toHaveLength(0)
})

test("explicit user memory cues are stored as preferences", async () => {
  const id = project()

  const records = await AltruCoderMemory.consolidateTurn({
    projectID: id,
    sessionID: "ses_auto_preference",
    messageID: "msg_user",
    messages: [
      {
        info: { id: "msg_user", role: "user" },
        parts: [{ type: "text", text: "From now on prefer concise tables for comparisons." }],
      },
    ],
    diffs: [],
  })

  const out = AltruCoderMemory.format(records)

  expect(out).toContain("[preference]")
  expect(out).toContain("From now on prefer concise tables")
})
