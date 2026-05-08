// altrucoder_change - new file
//
// Tests that the altru-coder custom loader keeps paid models visible without authentication.
// Mocks fetchAltruCoderModels from @altru-coder/altru-coder-gateway to avoid real network
// calls (which fail on Windows CI).

import { test, expect, mock } from "bun:test"
import path from "path"
import { unlink } from "fs/promises"

// Bun's mock.module() is process-wide and permanent — it replaces the module
// for ALL test files in the same runner process. To avoid breaking other tests
// that import @altru-coder/altru-coder-gateway, we spread the real exports and only
// override fetchAltruCoderModels with a stub that returns both free and paid models.
const real = await import("@altru-coder/altru-coder-gateway")

mock.module("@altru-coder/altru-coder-gateway", () => ({
  ...real,
  fetchAltruCoderModels: async () => ({
    "free-model": {
      id: "free-model",
      name: "Free Model",
      cost: { input: 0, output: 0 },
      limit: { context: 128000, output: 4096 },
    },
    "paid-model": {
      id: "paid-model",
      name: "Paid Model",
      cost: { input: 1.0, output: 2.0 },
      limit: { context: 128000, output: 4096 },
    },
  }),
}))

import { tmpdir } from "../fixture/fixture"
import { Global } from "@opencode-ai/core/global"
import { Instance } from "../../src/project/instance"
import { Provider } from "../../src/provider/provider"
import { ProviderID } from "../../src/provider/schema"
import { Filesystem } from "../../src/util/filesystem"
import { ModelCache } from "../../src/provider/model-cache"
import { Auth } from "../../src/auth"

function paid(providers: Awaited<ReturnType<typeof Provider.list>>) {
  const item = providers[ProviderID["altru-coder"]]
  expect(item).toBeDefined()
  return Object.values(item.models).filter((model) => model.cost.input > 0).length
}

test("altru-coder loader keeps paid models without auth and when config apiKey is present", async () => {
  // Reset state that may be stale from other test files sharing this process.
  // Auth.set from other tests persists in the shared auth.json,
  // and ModelCache keeps fetched models in a TTL map.
  // ModelsDev.Data was removed in v1.14.33 — instance-store disposal handles cache invalidation.
  await Auth.remove("altru-coder")
  ModelCache.clear("altru-coder")

  await using base = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "altru-coder.json"),
        JSON.stringify({
          $schema: "https://app.altru-coder.ai/config.json",
        }),
      )
    },
  })

  const none = await Instance.provide({
    directory: base.path,
    fn: async () => paid(await Provider.list()),
  })

  await using keyed = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "altru-coder.json"),
        JSON.stringify({
          $schema: "https://app.altru-coder.ai/config.json",
          provider: {
            "altru-coder": {
              options: {
                apiKey: "test-key",
              },
            },
          },
        }),
      )
    },
  })

  const count = await Instance.provide({
    directory: keyed.path,
    fn: async () => paid(await Provider.list()),
  })

  expect(none).toBeGreaterThan(0)
  expect(count).toBeGreaterThan(0)
})

test("altru-coder loader keeps paid models without auth and when auth exists", async () => {
  await Auth.remove("altru-coder")
  ModelCache.clear("altru-coder")

  await using base = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "altru-coder.json"),
        JSON.stringify({
          $schema: "https://app.altru-coder.ai/config.json",
        }),
      )
    },
  })

  const none = await Instance.provide({
    directory: base.path,
    fn: async () => paid(await Provider.list()),
  })

  await using keyed = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "altru-coder.json"),
        JSON.stringify({
          $schema: "https://app.altru-coder.ai/config.json",
        }),
      )
    },
  })

  const authPath = path.join(Global.Path.data, "auth.json")
  let prev: string | undefined

  try {
    prev = await Filesystem.readText(authPath)
  } catch {}

  try {
    await Filesystem.write(
      authPath,
      JSON.stringify({
        "altru-coder": {
          type: "api",
          key: "test-key",
        },
      }),
    )

    const count = await Instance.provide({
      directory: keyed.path,
      fn: async () => paid(await Provider.list()),
    })

    expect(none).toBeGreaterThan(0)
    expect(count).toBeGreaterThan(0)
  } finally {
    if (prev !== undefined) {
      await Filesystem.write(authPath, prev)
    }
    if (prev === undefined) {
      try {
        await unlink(authPath)
      } catch {}
    }
  }
})
