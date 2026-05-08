import { afterEach, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import type { Config } from "../../src/config/config"
import { getBootstrapRunEffect } from "../../src/effect/app-runtime"
import { AltruCoderIndexing } from "../../src/altrucoder/indexing"
import { Instance } from "../../src/project/instance"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"

const cfg: Partial<Config.Info> = {
  plugin: ["@altru-coder/altru-coder-indexing"],
  experimental: {
    semantic_indexing: true,
  },
  indexing: {
    enabled: true,
    provider: "ollama",
    vectorStore: "qdrant",
    ollama: {
      baseUrl: "http://127.0.0.1:1",
    },
  },
}

const configDir = process.env["ALTRU_CODER_CONFIG_DIR"]

afterEach(async () => {
  if (configDir === undefined) delete process.env["ALTRU_CODER_CONFIG_DIR"]
  else process.env["ALTRU_CODER_CONFIG_DIR"] = configDir
  await disposeAllInstances()
})

describe("indexing worktree disable", () => {
  test("returns disabled status in .altru-coder/worktrees paths", async () => {
    await using tmp = await tmpdir({ git: true, config: cfg })
    process.env["ALTRU_CODER_CONFIG_DIR"] = tmp.path
    const dir = `${tmp.path}/.altru-coder/worktrees/feature`
    await mkdir(dir, { recursive: true })

    await Instance.provide({
      directory: dir,
      init: await getBootstrapRunEffect(),
      fn: async () => {
        const status = await AltruCoderIndexing.current()

        expect(status.state).toBe("Disabled")
        expect(status.message).toBe("Indexing is disabled in worktree sessions. Use the main workspace for indexing.")
        expect(await AltruCoderIndexing.available()).toBe(false)
        expect(AltruCoderIndexing.ready()).toBe(false)
        expect(await AltruCoderIndexing.search("worktree")).toEqual([])
      },
    })
  })

  test("returns disabled status in legacy .altrucoder/worktrees paths", async () => {
    await using tmp = await tmpdir({ git: true, config: cfg })
    process.env["ALTRU_CODER_CONFIG_DIR"] = tmp.path
    const dir = `${tmp.path}/.altrucoder/worktrees/feature`
    await mkdir(dir, { recursive: true })

    await Instance.provide({
      directory: dir,
      init: await getBootstrapRunEffect(),
      fn: async () => {
        const status = await AltruCoderIndexing.current()

        expect(status.state).toBe("Disabled")
        expect(status.message).toBe("Indexing is disabled in worktree sessions. Use the main workspace for indexing.")
        expect(await AltruCoderIndexing.available()).toBe(false)
        expect(AltruCoderIndexing.ready()).toBe(false)
      },
    })
  })
})
