#!/usr/bin/env bun
import { $ } from "bun"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { Script } from "@opencode-ai/script"

const prerelease = process.env.ALTRU_CODER_PRE_RELEASE === "true"
const packageJson = await Bun.file(join(import.meta.dir, "..", "package.json")).json()
const version = process.env.ALTRU_CODER_VERSION ? process.env.ALTRU_CODER_VERSION : packageJson.version
const display = packageJson.displayName || "Altru Coder"

console.log(`Publishing VSCode extension for ${prerelease ? "pre-release" : "release"}: v${version}`)

const outDir = process.env.VSIX_DIR || join(import.meta.dir, "..", "out")
const openvsx = process.env.OPENVSX_TOKEN

console.log(`Using VSIX directory: ${outDir}`)

if (!existsSync(outDir)) {
  throw new Error(`VSIX directory not found: ${outDir}`)
}

const all = [
  "linux-x64",
  "linux-arm64",
  "alpine-x64",
  "alpine-arm64",
  "darwin-x64",
  "darwin-arm64",
  "win32-x64",
  "win32-arm64",
]

const names = process.env.VSIX_TARGETS?.split(",").map((item) => item.trim()).filter(Boolean)
const targets = names ? all.filter((target) => names.includes(target)) : all

if (targets.length === 0) {
  throw new Error(`No VSIX targets matched VSIX_TARGETS=${process.env.VSIX_TARGETS}`)
}

function vsix(target: string) {
  return `${display} ${version} ${target}.vsix`
}

const vsixFiles: string[] = []
for (const target of targets) {
  const vsixPath = join(outDir, vsix(target))
  if (!existsSync(vsixPath)) {
    throw new Error(`VSIX file not found: ${vsixPath}`)
  }
  vsixFiles.push(vsixPath)
}

console.log(`\nFound ${vsixFiles.length} VSIX files`)

const flag = prerelease ? ["--pre-release"] : []

for (const target of targets) {
  const vsixPath = join(outDir, vsix(target))
  console.log(`\n🚀 Publishing ${target} to VS Code Marketplace${prerelease ? " (pre-release)" : ""}...`)
  await $`vsce publish ${flag} --packagePath ${vsixPath}`
  console.log(`  ✅ Published ${target} to VS Code Marketplace`)

  if (!openvsx) {
    console.log(`  Skipping Open VSX for ${target}; OPENVSX_TOKEN is not set`)
    continue
  }

  console.log(`\n📤 Publishing ${target} to Open VSX${prerelease ? " (pre-release)" : ""}...`)
  await retry(() => $`npx ovsx publish ${flag} --pat ${openvsx} --packagePath ${vsixPath}`, {
    attempts: 3,
    delay: 10_000,
    label: `ovsx publish ${target}`,
  })
  console.log(`  ✅ Published ${target} to Open VSX`)
}

if (Script.release) {
  console.log(`\n📤 Uploading VSIX files to GitHub release v${version}...`)
  await $`gh release upload v${version} ${vsixFiles} --clobber`
  console.log(`  ✅ Uploaded all VSIX files to GitHub release`)
}

console.log("\n✨ All targets published successfully!")

async function retry<T>(fn: () => Promise<T>, opts: { attempts: number; delay: number; label: string }): Promise<T> {
  for (let i = 1; i <= opts.attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === opts.attempts) throw err
      console.warn(`  ⚠️  ${opts.label} failed (attempt ${i}/${opts.attempts}), retrying in ${opts.delay / 1000}s...`)
      await new Promise((r) => setTimeout(r, opts.delay))
    }
  }
  throw new Error("unreachable")
}
