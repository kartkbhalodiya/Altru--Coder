import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import { Agent } from "../../src/agent/agent"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { LSP } from "@/lsp/lsp"
import { MessageID, SessionID } from "../../src/session/schema"
import { Instruction } from "../../src/session/instruction"
import { ReadTool } from "../../src/tool/read"
import { Truncate } from "@/tool/truncate"
import { disposeAllInstances, provideInstance, tmpdirScoped } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

afterEach(async () => {
  await disposeAllInstances()
})

const ctx = {
  sessionID: SessionID.make("ses_read_missing"),
  messageID: MessageID.make(""),
  callID: "",
  agent: "code",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

const it = testEffect(
  Layer.mergeAll(
    Agent.defaultLayer,
    AppFileSystem.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Instruction.defaultLayer,
    LSP.defaultLayer,
    Truncate.defaultLayer,
  ),
)

const put = Effect.fn("ReadMissingTest.put")(function* (file: string, text: string) {
  const fs = yield* AppFileSystem.Service
  yield* fs.writeWithDirs(file, text)
})

const exec = Effect.fn("ReadMissingTest.exec")(function* (dir: string, filePath: string) {
  const info = yield* ReadTool
  const tool = yield* info.init()
  return yield* provideInstance(dir)(tool.execute({ filePath }, ctx))
})

describe("altrucoder read missing path", () => {
  it.live("returns a non-fatal missing result with sibling suggestions", () =>
    Effect.gen(function* () {
      const dir = yield* tmpdirScoped()
      const root = path.join(dir, "packages", "opencode", "src", "altrucoder")
      yield* put(path.join(root, "workflows-migrator.ts"), "export const workflows = true\n")

      const result = yield* exec(dir, path.join(root, "workflows"))
      const meta = result.metadata as typeof result.metadata & { missing?: boolean; suggestions?: string[] }

      expect(result.output).toContain("<type>missing</type>")
      expect(result.output).toContain("File not found:")
      expect(result.output).toContain(path.join(root, "workflows-migrator.ts"))
      expect(result.metadata.truncated).toBe(false)
      expect(meta.missing).toBe(true)
      expect(meta.suggestions).toContain(path.join(root, "workflows-migrator.ts"))
    }),
  )
})
