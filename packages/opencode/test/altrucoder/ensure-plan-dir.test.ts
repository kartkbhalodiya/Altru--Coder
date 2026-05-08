import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { AltruCoderSessionPrompt } from "../../src/altrucoder/session/prompt"
import { tmpdir } from "../fixture/fixture"

describe("AltruCoderSessionPrompt.ensurePlanDir", () => {
  test("creates a missing plan directory", async () => {
    await using tmp = await tmpdir({})
    const dir = path.join(tmp.path, ".altru-coder", "plans")
    await AltruCoderSessionPrompt.ensurePlanDir(dir)
    const stat = await fs.stat(dir)
    expect(stat.isDirectory()).toBe(true)
  })

  test("is idempotent when the directory already exists", async () => {
    await using tmp = await tmpdir({})
    const dir = path.join(tmp.path, ".altru-coder", "plans")
    await fs.mkdir(dir, { recursive: true })
    await expect(AltruCoderSessionPrompt.ensurePlanDir(dir)).resolves.toBeUndefined()
    const stat = await fs.stat(dir)
    expect(stat.isDirectory()).toBe(true)
  })

  test("creates intermediate parent directories", async () => {
    await using tmp = await tmpdir({})
    const dir = path.join(tmp.path, "deep", "nested", ".altru-coder", "plans")
    await AltruCoderSessionPrompt.ensurePlanDir(dir)
    const stat = await fs.stat(dir)
    expect(stat.isDirectory()).toBe(true)
  })
})
