import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { Effect, Layer, Schema } from "effect"
import * as Log from "@opencode-ai/core/util/log"
import { AltruCoderIndexing } from "../../src/altrucoder/indexing"
import { AltruCoderBootstrap } from "../../src/altrucoder/bootstrap"
import { AltruCoderSessions } from "../../src/altru-coder-sessions/altru-coder-sessions"
import { AltruCoderToolRegistry } from "../../src/altrucoder/tool/registry"
import { ToolRegistry } from "../../src/tool/registry"
import type * as Tool from "../../src/tool/tool"
import { Instance } from "../../src/project/instance"
import { disposeAllInstances, provideTmpdirInstance } from "../fixture/fixture"
import * as CrossSpawnSpawner from "@opencode-ai/core/cross-spawn-spawner"
import { testEffect } from "../lib/effect"

const node = CrossSpawnSpawner.defaultLayer
const it = testEffect(Layer.mergeAll(ToolRegistry.defaultLayer, node))

afterEach(async () => {
  await disposeAllInstances()
})

describe("altrucoder tool registry indexing", () => {
  const logger = Log.create({ service: "altrucoder-tool-registry" })

  it.live("omits semantic_search without waiting for slow indexing startup", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const avail = spyOn(AltruCoderIndexing, "available").mockImplementation(() => new Promise<boolean>(() => {}))

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).not.toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(avail).not.toHaveBeenCalled()
          } finally {
            avail.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("keeps non-indexing tools when indexing readiness throws", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const err = new Error("ready failed")
          const ready = spyOn(AltruCoderIndexing, "ready").mockImplementation(() => {
            throw err
          })
          const warn = spyOn(logger, "warn").mockImplementation(() => {})

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).not.toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(warn.mock.calls[0]?.[0]).toBe("semantic search unavailable")
            expect(warn.mock.calls[0]?.[1]?.err).toBeDefined()
          } finally {
            ready.mockRestore()
            warn.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("keeps non-indexing tools when indexing readiness rejects", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const err = new Error("ready rejected")
          const ready = spyOn(AltruCoderIndexing, "ready").mockImplementation(() => Promise.reject(err) as unknown as boolean)
          const warn = spyOn(logger, "warn").mockImplementation(() => {})

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).not.toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(warn.mock.calls[0]?.[0]).toBe("semantic search unavailable")
            expect(warn.mock.calls[0]?.[1]?.err).toBeDefined()
          } finally {
            ready.mockRestore()
            warn.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("registers semantic_search when indexing is ready", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(AltruCoderIndexing, "ready").mockReturnValue(true)

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  test("conditionally includes Altru Coder registry extras", () => {
    const prev = process.env["ALTRU_CODER_CLIENT"]
    const def = (id: string): Tool.Def => ({
      id,
      description: id,
      parameters: Schema.String,
      execute: () => Effect.succeed({ title: id, output: id, metadata: {} }),
    })
    const tools = {
      codebase: def("codebase_search"),
      semantic: def("semantic_search"),
      recall: def("recall"),
      manager: def("agent_manager"),
    }

    try {
      process.env["ALTRU_CODER_CLIENT"] = "cli"
      expect(AltruCoderToolRegistry.extra(tools, {}).map((tool) => tool.id)).toEqual(["semantic_search", "recall"])
      expect(
        AltruCoderToolRegistry.extra(tools, { experimental: { codebase_search: true, agent_manager_tool: true } }).map(
          (tool) => tool.id,
        ),
      ).toEqual(["codebase_search", "semantic_search", "recall"])

      process.env["ALTRU_CODER_CLIENT"] = "vscode"
      expect(
        AltruCoderToolRegistry.extra(tools, { experimental: { codebase_search: true, agent_manager_tool: true } }).map(
          (tool) => tool.id,
        ),
      ).toEqual(["codebase_search", "semantic_search", "recall", "agent_manager"])
      expect(AltruCoderToolRegistry.extra({ ...tools, semantic: undefined }, {}).map((tool) => tool.id)).toEqual(["recall"])
    } finally {
      if (prev === undefined) delete process.env["ALTRU_CODER_CLIENT"]
      if (prev !== undefined) process.env["ALTRU_CODER_CLIENT"] = prev
    }
  })

  test("logs indexing bootstrap failures without blocking session bootstrap", async () => {
    const logger = Log.create({ service: "altrucoder-bootstrap" })
    const err = new Error("indexing init failed")
    const sessions = spyOn(AltruCoderSessions, "init").mockResolvedValue(undefined)
    const indexing = spyOn(AltruCoderIndexing, "init").mockRejectedValue(err)
    const warn = spyOn(logger, "warn").mockImplementation(() => {})

    try {
      await AltruCoderBootstrap.init()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(sessions).toHaveBeenCalledTimes(1)
      expect(indexing).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith("indexing bootstrap failed", { err })
    } finally {
      sessions.mockRestore()
      indexing.mockRestore()
      warn.mockRestore()
    }
  })
})
