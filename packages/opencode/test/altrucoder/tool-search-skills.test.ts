import { describe, expect, test } from "bun:test"
import { Effect, Schema } from "effect"
import { BUILTIN_SKILLS } from "../../src/altrucoder/skills/builtin"
import * as ToolSearch from "../../src/tool/tool-search"
import type * as Tool from "../../src/tool/tool"

const Params = Schema.Struct({})

function def(id: string, description: string): Tool.Def<typeof Params> {
  return {
    id,
    description,
    parameters: Params,
    execute: () => Effect.succeed({ title: id, output: "", metadata: {} }),
  }
}

describe("Altru Coder built-in skills", () => {
  test("includes review, workflow, and skill-management skills", () => {
    const names = new Set(BUILTIN_SKILLS.map((skill) => skill.name))

    expect(names.has("code-review")).toBe(true)
    expect(names.has("code-review-testing")).toBe(true)
    expect(names.has("code-review-breaking-changes")).toBe(true)
    expect(names.has("feature-dev")).toBe(true)
    expect(names.has("frontend-design")).toBe(true)
    expect(names.has("pr-review-toolkit")).toBe(true)
    expect(names.has("plugin-dev")).toBe(true)
    expect(names.has("security-guidance")).toBe(true)
    expect(names.has("skill-creator")).toBe(true)
    expect(names.has("skill-installer")).toBe(true)
  })
})

describe("tool_search", () => {
  test("searches available tools by name and description", async () => {
    const tool = ToolSearch.create([
      def("read", "Read files from the workspace"),
      def("view_image", "Load image files for visual inspection"),
      def("bash", "Run shell commands"),
    ])

    const result = await Effect.runPromise(tool.execute({ query: "image", limit: 10 }, {} as Tool.Context))

    expect(result.metadata.count).toBe(1)
    expect(result.output).toContain("view_image")
    expect(result.output).not.toContain("bash")
  })
})
