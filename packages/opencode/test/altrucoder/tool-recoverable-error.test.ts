import { describe, expect, test } from "bun:test"
import { recoverToolError } from "../../src/session/prompt"

describe("altrucoder recoverable tool errors", () => {
  test("converts wrong-tool file/path mistakes into tool output", () => {
    const cases = [
      ["glob", "glob path must be a directory: /repo/src/file.ts"],
      ["edit", "File /repo/missing.ts not found"],
      ["edit", "Path is a directory, not a file: /repo/src"],
      ["edit", "Could not find oldString in the file."],
      ["edit", "Found multiple matches for oldString."],
      ["apply_patch", "apply_patch verification failed: missing context"],
      ["apply_patch", "patch rejected: empty patch"],
      ["lsp", "File not found: /repo/missing.ts"],
      ["view_image", "Unsupported image type for /repo/a.txt: text/plain"],
      ["skill", 'Skill "unknown" not found. Available skills: none'],
    ] as const

    for (const item of cases) {
      const result = recoverToolError(item[0], { probe: true }, new Error(item[1]))
      expect(result?.metadata.recoverable).toBe(true)
      expect(result?.metadata.truncated).toBe(false)
      expect(result?.output).toContain("This is recoverable")
    }
  })

  test("does not recover policy, permission, or unknown failures", () => {
    const cases = [
      ["bash", "Altru Coder policy blocked bash: command denied"],
      ["edit", "Permission rejected by user"],
      ["read", "Cannot read binary file: /repo/app.bin"],
      ["webfetch", "Request timed out"],
    ] as const

    for (const item of cases) {
      expect(recoverToolError(item[0], {}, new Error(item[1]))).toBeUndefined()
    }
  })
})
