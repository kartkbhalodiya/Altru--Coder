import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { hasIndexingPlugin, isIndexingPlugin, normalizePluginName } from "../../../src/detect"

describe("indexing plugin detection", () => {
  test("bundles detect module for browser targets", async () => {
    const dir = await mkdtemp(`${tmpdir()}/altru-coder-indexing-detect-`)
    const result = await Bun.build({
      entrypoints: [new URL("../../../src/detect.ts", import.meta.url).pathname],
      minify: true,
      outdir: dir,
      target: "browser",
    })

    expect(result.success).toBe(true)
  })

  test("normalizes supported plugin forms", () => {
    expect(normalizePluginName("altru-coder-indexing")).toBe("altru-coder-indexing")
    expect(normalizePluginName("altru-coder-indexing@1.2.3")).toBe("altru-coder-indexing")
    expect(normalizePluginName("@altru-coder/altru-coder-indexing")).toBe("@altru-coder/altru-coder-indexing")
    expect(normalizePluginName("@altru-coder/altru-coder-indexing@1.2.3")).toBe("@altru-coder/altru-coder-indexing")
    expect(normalizePluginName("../../packages/altru-coder-indexing")).toBe("@altru-coder/altru-coder-indexing")
    expect(normalizePluginName("file:///tmp/.opencode/plugin/altru-coder-indexing.js")).toBe("altru-coder-indexing")
    expect(normalizePluginName("file:///tmp/node_modules/@altru-coder/altru-coder-indexing/index.js")).toBe(
      "@altru-coder/altru-coder-indexing",
    )
    expect(normalizePluginName("file:///tmp/repo/packages/altru-coder-indexing/src/index.ts")).toBe(
      "@altru-coder/altru-coder-indexing",
    )
  })

  test("detects supported indexing plugin specifiers", () => {
    const values = [
      "altru-coder-indexing",
      "altru-coder-indexing@1.2.3",
      "@altru-coder/altru-coder-indexing",
      "@altru-coder/altru-coder-indexing@1.2.3",
      "../../packages/altru-coder-indexing",
      "file:///tmp/.opencode/plugin/altru-coder-indexing.js",
      "file:///tmp/node_modules/@altru-coder/altru-coder-indexing/index.js",
      "file:///tmp/repo/packages/altru-coder-indexing/src/index.ts",
    ]

    for (const value of values) {
      expect(isIndexingPlugin(value)).toBe(true)
    }
  })

  test("ignores unrelated plugin specifiers", () => {
    expect(isIndexingPlugin("@altru-coder/altru-coder-gateway")).toBe(false)
    expect(isIndexingPlugin("file:///tmp/.opencode/plugin/index.js")).toBe(false)
    expect(hasIndexingPlugin(["@altru-coder/altru-coder-gateway", "foo@1.0.0"])).toBe(false)
  })

  test("detects indexing plugin in merged plugin lists", () => {
    expect(
      hasIndexingPlugin([
        "@altru-coder/altru-coder-gateway",
        "file:///tmp/node_modules/@altru-coder/altru-coder-indexing/index.js",
      ]),
    ).toBe(true)
  })
})
