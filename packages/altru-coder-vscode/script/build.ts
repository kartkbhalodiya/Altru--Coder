#!/usr/bin/env bun
import { $ } from "bun"
import { join } from "node:path"
import { existsSync, mkdirSync, rmSync, chmodSync } from "node:fs"

const packageJsonPath = join(import.meta.dir, "..", "package.json")
const packageJson = await Bun.file(packageJsonPath).json()
const version = process.env.ALTRU_CODER_VERSION ? process.env.ALTRU_CODER_VERSION : packageJson.version
const display = packageJson.displayName || "Altru Coder"
const prerelease = process.env.ALTRU_CODER_PRE_RELEASE === "true"

console.log(`Building VSCode extension version: ${version}${prerelease ? " (pre-release)" : ""}`)

if (packageJson.version !== version) {
  console.log(`Updating package.json version from ${packageJson.version} to ${version}`)
  packageJson.version = version
  await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")
}

const cliDistDir = process.env.CLI_DIST_DIR || join(import.meta.dir, "..", "..", "opencode", "dist")
console.log(`Using CLI dist directory: ${cliDistDir}`)

if (!existsSync(cliDistDir)) {
  throw new Error(`CLI dist directory not found: ${cliDistDir}`)
}

const all = [
  { target: "linux-x64", cliDir: "@altru-coder/cli-linux-x64", binary: "altru-coder" },
  { target: "linux-arm64", cliDir: "@altru-coder/cli-linux-arm64", binary: "altru-coder" },
  { target: "alpine-x64", cliDir: "@altru-coder/cli-linux-x64-musl", binary: "altru-coder" },
  { target: "alpine-arm64", cliDir: "@altru-coder/cli-linux-arm64-musl", binary: "altru-coder" },
  { target: "darwin-x64", cliDir: "@altru-coder/cli-darwin-x64", binary: "altru-coder" },
  { target: "darwin-arm64", cliDir: "@altru-coder/cli-darwin-arm64", binary: "altru-coder" },
  { target: "win32-x64", cliDir: "@altru-coder/cli-windows-x64", binary: "altru-coder.exe" },
  { target: "win32-arm64", cliDir: "@altru-coder/cli-windows-arm64", binary: "altru-coder.exe" },
]

const names = process.env.VSIX_TARGETS?.split(",").map((item) => item.trim()).filter(Boolean)
const targets = names ? all.filter((item) => names.includes(item.target)) : all

if (targets.length === 0) {
  throw new Error(`No VSIX targets matched VSIX_TARGETS=${process.env.VSIX_TARGETS}`)
}

function vsix(target: string) {
  return `${display} ${version} ${target}.vsix`
}

function clean(dir: string) {
  if (!existsSync(dir)) return

  try {
    rmSync(dir, { recursive: true, force: true })
  } catch (err) {
    throw new Error(
      `Failed to clean ${dir}. Stop any running Altru Coder extension or CLI process that may be locking files and rerun the VSIX build.`,
      { cause: err },
    )
  }

  console.log(`  ✅ Cleaned ${dir}`)
}

const binDir = join(import.meta.dir, "..", "bin")
const distDir = join(import.meta.dir, "..", "dist")
const outDir = join(import.meta.dir, "..", "out")

console.log("\n🧹 Cleaning up directories...")
for (const dir of [binDir, distDir, outDir]) {
  clean(dir)
}

mkdirSync(outDir, { recursive: true })
mkdirSync(distDir, { recursive: true })

console.log("\n🔄 Rebuilding SDK types (ensures dist/ is in sync with server API)...")
await $`bun run --cwd ${join(import.meta.dir, "..", "..", "sdk", "js")} build`

console.log("\n📦 Compiling extension...")
await $`bun run typecheck`
await $`bun run lint`
await $`node ${join(import.meta.dir, "..", "esbuild.js")} --production`

for (const config of targets) {
  console.log(`\n🎯 Processing target: ${config.target}`)

  if (existsSync(binDir)) {
    clean(binDir)
  }
  mkdirSync(binDir, { recursive: true })

  const sourceBinary = join(cliDistDir, config.cliDir, "bin", config.binary)
  const targetBinary = join(binDir, config.binary)

  if (!existsSync(sourceBinary)) {
    throw new Error(`CLI binary not found at ${sourceBinary}`)
  }

  console.log(`  📥 Copying binary from ${config.cliDir}/bin/${config.binary}...`)
  await $`cp ${sourceBinary} ${targetBinary}`

  if (config.binary !== "altru-coder.exe") {
    chmodSync(targetBinary, 0o755)
  }

  console.log(`  ✅ Binary ready at ${targetBinary}`)

  console.log(`  📦 Packaging .vsix for ${config.target}${prerelease ? " (pre-release)" : ""}...`)
  const vsixPath = join(outDir, vsix(config.target))
  const args = ["--no-dependencies", "--skip-license", "--target", config.target, "-o", vsixPath]
  if (prerelease) args.push("--pre-release")
  await $`vsce package ${args}`.env({
    ...process.env,
    npm_config_ignore_scripts: "true",
  })
  console.log(`  ✅ Created ${vsixPath}`)
}

console.log("\n✨ All VSIX packages built successfully!")
