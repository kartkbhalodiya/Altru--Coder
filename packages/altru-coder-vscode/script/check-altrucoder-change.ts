import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const roots = [".", "../altru-coder-ui"]
const skip = new Set([".turbo", ".vscode-test", "bin", "coverage", "dist", "node_modules", "out", "storybook-static"])
const mark = "altrucoder" + "_change"
const quoted = "`" + mark + "`"
const hits: string[] = []

function scan(dir: string) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) {
      if (skip.has(item.name)) continue
      scan(file)
      continue
    }
    if (!item.isFile()) continue
    if (item.name === "package.json" || item.name.endsWith(".md")) continue

    const text = readFileSync(file, "utf8")
    const lines = text.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (!line.includes(mark)) return
      if (line.includes(quoted)) return
      hits.push(`${file}:${index + 1}:${line}`)
    })
  }
}

roots.forEach(scan)

if (hits.length === 0) process.exit(0)

console.error(hits.join("\n"))
process.exit(1)
