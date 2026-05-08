import { expect, test } from "bun:test"
import { shouldKeepOurs } from "./keep-ours"

test("keeps files in Altru Coder-specific directories", () => {
  expect(shouldKeepOurs("packages/altru-coder-vscode/.prettierignore", [])).toBe(true)
  expect(shouldKeepOurs("packages/altru-coder-vscode/webview-ui/tsconfig.json", [])).toBe(true)
  expect(shouldKeepOurs("packages/altru-coder-i18n/tsconfig.json", [])).toBe(true)
  expect(shouldKeepOurs("script/upstream/tsconfig.json", [])).toBe(true)
})

test("keeps explicitly configured files", () => {
  expect(shouldKeepOurs("README.md", ["README.md"])).toBe(true)
})

test("does not keep unrelated files", () => {
  expect(shouldKeepOurs("packages/opencode/src/index.ts", [])).toBe(false)
})
