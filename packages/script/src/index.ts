import { $ } from "bun"
import semver from "semver"
import path from "path"

const rootPkgPath = path.resolve(import.meta.dir, "../../../package.json")
const rootPkg = await Bun.file(rootPkgPath).json()
const expectedBunVersion = rootPkg.packageManager?.split("@")[1]

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json")
}

// relax version requirement
const expectedBunVersionRange = `^${expectedBunVersion}`

if (!semver.satisfies(process.versions.bun, expectedBunVersionRange)) {
  throw new Error(`This script requires bun@${expectedBunVersionRange}, but you are using bun@${process.versions.bun}`)
}
// altrucoder_change start
const env = {
  ALTRU_CODER_CHANNEL: process.env["ALTRU_CODER_CHANNEL"],
  ALTRU_CODER_BUMP: process.env["ALTRU_CODER_BUMP"],
  ALTRU_CODER_VERSION: process.env["ALTRU_CODER_VERSION"],
  ALTRU_CODER_RELEASE: process.env["ALTRU_CODER_RELEASE"],
  ALTRU_CODER_PRE_RELEASE: process.env["ALTRU_CODER_PRE_RELEASE"],
}
// altrucoder_change end
const CHANNEL = await (async () => {
  if (env.ALTRU_CODER_CHANNEL) return env.ALTRU_CODER_CHANNEL // altrucoder_change
  // altrucoder_change start - publish to "rc" channel for pre-releases
  if (env.ALTRU_CODER_PRE_RELEASE === "true") return "rc"
  // altrucoder_change end
  if (env.ALTRU_CODER_BUMP) return "latest" // altrucoder_change
  if (env.ALTRU_CODER_VERSION && !env.ALTRU_CODER_VERSION.startsWith("0.0.0-")) return "latest" // altrucoder_change
  return await $`git branch --show-current`.text().then((x) => x.trim().replace(/[^0-9A-Za-z-]/g, "-")) // altrucoder_change
})()
const IS_PREVIEW = CHANNEL !== "latest"

// altrucoder_change start - shared helpers for version computation
function parseVersion(input: string) {
  const match = input.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    value: `${match[1]}.${match[2]}.${match[3]}`,
  }
}

function compareVersion(
  a: NonNullable<ReturnType<typeof parseVersion>>,
  b: NonNullable<ReturnType<typeof parseVersion>>,
) {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  return a.patch - b.patch
}

async function fetchLatest() {
  const data: any = await fetch("https://registry.npmjs.org/@altru-coder/cli/latest").then((res) => {
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
  })
  return data.version as string
}

async function fetchHighest() {
  if (!process.env.GH_REPO) return fetchLatest()
  const data: { tagName: string }[] = await $`gh release list --json tagName --limit 100 --repo ${process.env.GH_REPO}`
    .json()
    .catch(() => [])
  const versions = data.flatMap((item) => {
    const version = parseVersion(item.tagName)
    if (!version) return []
    return [version]
  })
  const highest = versions.sort(compareVersion).at(-1)
  if (highest) return highest.value
  return fetchLatest()
}

function bumpVersion(current: string, type: string) {
  const version = parseVersion(current)
  if (!version) throw new Error(`Invalid version: ${current}`)
  if (type === "major") return `${version.major + 1}.0.0`
  if (type === "minor") return `${version.major}.${version.minor + 1}.0`
  return `${version.major}.${version.minor}.${version.patch + 1}`
}
// altrucoder_change end

const VERSION = await (async () => {
  if (env.ALTRU_CODER_VERSION) return env.ALTRU_CODER_VERSION
  if (IS_PREVIEW) {
    // altrucoder_change start - rc releases use plain semver required by VS Code Marketplace
    if (env.ALTRU_CODER_BUMP && env.ALTRU_CODER_PRE_RELEASE === "true") {
      const current = await fetchHighest()
      return bumpVersion(current, env.ALTRU_CODER_BUMP.toLowerCase())
    }
    // altrucoder_change end
    return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`
  }
  const version = await fetchHighest() // altrucoder_change
  return bumpVersion(version, env.ALTRU_CODER_BUMP?.toLowerCase() ?? "patch") // altrucoder_change
})()

// altrucoder_change start
const team = [
  "actions-user",
  "altru-coder-maintainer[bot]",
  "altruconnect[bot]",
  "altruconnect-lite[bot]",
  "alexkgold",
  "arimesser",
  "arkadiykondrashov",
  "bturcotte520",
  "catrielmuller",
  "chrarnoldus",
  "codingelves",
  "darkogj",
  "dependabot[bot]",
  "dosire",
  "DScdng",
  "emilieschario",
  "eshurakov",
  "Helix-Altru Coder",
  "iscekic",
  "jeanduplessis",
  "jobrietbergen",
  "jrf0110",
  "johnnyeric",
  "alex-alecu",
  "imanolmzd-svg",
  "altrucoder-bot",
  "altru-coder-bot",
  "altru-coder-bot[bot]",
  "kirillk",
  "lambertjosh",
  "LigiaZ",
  "marius-altrucoder",
  "markijbema",
  "olearycrew",
  "pandemicsyn",
  "pedroheyerdahl",
  "RSO",
  "sbreitenother",
  "suhailkc2025",
  "Sureshkumars",
]
// altrucoder_change end

export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get preview() {
    return IS_PREVIEW
  },
  get release(): boolean {
    return !!env.ALTRU_CODER_RELEASE
  },
  get team() {
    return team
  },
}
console.log(`altru-coder script`, JSON.stringify(Script, null, 2)) // altrucoder_change
