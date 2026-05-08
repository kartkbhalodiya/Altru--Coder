/**
 * Architecture test: webview font-size token usage.
 *
 * Altru Coder's VS Code webviews use the `altru-coder.new.fontSize` setting, not
 * VS Code editor font-size or raw pixel declarations. This keeps the Altru Coder UI
 * independently scalable across sidebar, settings, Agent Manager, AltruCoderClaw,
 * diff viewers, code blocks, and shared altru-coder-ui controls.
 */

import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dir, "../..")
const REPO = path.resolve(ROOT, "../..")

const TARGETS = [
  path.join(ROOT, "webview-ui/src"),
  path.join(ROOT, "webview-ui/agent-manager"),
  path.join(ROOT, "webview-ui/altru-coder-claw"),
  path.join(ROOT, "webview-ui/diff-viewer"),
  path.join(ROOT, "webview-ui/diff-virtual"),
  path.join(REPO, "packages/altru-coder-ui/src/components"),
]

const WATCHED_PROVIDERS = [
  path.join(ROOT, "src/AltruCoderProvider.ts"),
  path.join(ROOT, "src/diff/DiffViewerProvider.ts"),
  path.join(ROOT, "src/DiffVirtualProvider.ts"),
  path.join(ROOT, "src/altru-coder-claw/AltruCoderClawProvider.ts"),
]

const ALLOWED_DIRS = new Set(["stories"])
const EXTENSIONS = new Set([".css", ".ts", ".tsx"])

const FORBIDDEN = [
  {
    name: "raw CSS font-size pixel value",
    pattern: /font-size\s*:\s*\d+(?:\.\d+)?px\b/g,
  },
  {
    name: "raw inline font-size pixel value",
    pattern: /["']font-size["']\s*:\s*["']\d+(?:\.\d+)?px["']/g,
  },
  {
    name: "numeric fontSize option",
    pattern: /\bfontSize\s*:\s*\d+(?:\.\d+)?\b/g,
  },
  {
    name: "direct VS Code font-size variable",
    pattern: /font-size\s*:\s*var\(--vscode-(?:editor-)?font-size\b[^)]*\)/g,
  },
  {
    name: "inline direct VS Code font-size variable",
    pattern: /["']font-size["']\s*:\s*["']var\(--vscode-(?:editor-)?font-size\b[^"']*["']/g,
  },
]

function collect(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ALLOWED_DIRS.has(entry.name)) continue
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collect(file))
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(file)
  }
  return files
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

function line(src: string, index: number): number {
  return src.slice(0, index).split("\n").length
}

function rel(file: string): string {
  return path.relative(REPO, file)
}

describe("webview font-size architecture", () => {
  it("does not use raw font-size pixels or VS Code editor font-size variables in runtime webview UI", () => {
    const violations: string[] = []

    for (const file of TARGETS.flatMap(collect)) {
      const src = stripComments(fs.readFileSync(file, "utf-8"))
      for (const rule of FORBIDDEN) {
        for (const match of src.matchAll(rule.pattern)) {
          violations.push(`${rel(file)}:${line(src, match.index ?? 0)} uses ${rule.name}: ${match[0]}`)
        }
      }
    }

    expect(
      violations,
      `Use the Altru Coder webview font-size tokens instead of raw pixels or VS Code editor font-size variables.\n` +
        `Preferred tokens: var(--font-size-base), var(--font-size-small), or var(--altru-coder-font-size-N).\n\n` +
        violations.map((v) => `  - ${v}`).join("\n"),
    ).toEqual([])
  })

  it("injects and live-broadcasts the webview font-size setting to all webview providers", () => {
    const util = fs.readFileSync(path.join(ROOT, "src/utils.ts"), "utf-8")
    expect(util, "buildWebviewHtml must seed webview font tokens before app code runs").toContain("getWebviewFontSize")
    expect(util, "buildWebviewHtml must define scaled Altru Coder font tokens").toContain("--altru-coder-font-size-")

    const missing = WATCHED_PROVIDERS.filter((file) => !fs.readFileSync(file, "utf-8").includes("watchFontSizeConfig"))
    expect(
      missing.map(rel),
      `Webview providers that stay open must broadcast fontSizeChanged when altru-coder.new.fontSize changes.\n` +
        missing.map((file) => `  - ${rel(file)}`).join("\n"),
    ).toEqual([])
  })
})
