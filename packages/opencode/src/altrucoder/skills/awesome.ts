// altrucoder_change - new file
import fs from "fs/promises"
import fssync from "fs"
import path from "path"
import type { Info } from "@/skill"

const PACK = "awesome-claude-skills"
const HEAD = 32 * 1024

export type Indexed = Pick<
  Info,
  | "name"
  | "description"
  | "displayName"
  | "shortDescription"
  | "iconSmall"
  | "iconLarge"
  | "brandColor"
  | "defaultPrompt"
  | "enabled"
  | "dependencies"
  | "location"
  | "content"
>

function roots() {
  return [
    path.join(path.dirname(process.execPath), "skills", PACK),
    path.resolve(import.meta.dir, "../../..", "altrucoder-skill-packs", PACK),
  ]
}

function unquote(value: string) {
  const text = value.trim()
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1)
  }
  return text
}

async function read(file: string) {
  const handle = await fs.open(file, "r")
  try {
    const buf = Buffer.alloc(HEAD)
    const result = await handle.read(buf, 0, HEAD, 0)
    return buf.subarray(0, result.bytesRead).toString("utf8")
  } finally {
    await handle.close()
  }
}

function matter(text: string) {
  if (!text.startsWith("---")) return
  const end = text.indexOf("\n---", 3)
  if (end === -1) return
  const out: Record<string, string> = {}
  for (const line of text.slice(3, end).split(/\r?\n/)) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line.trimEnd())
    if (!match) continue
    out[match[1]] = unquote(match[2] ?? "")
  }
  return out
}

async function walk(dir: string, out: string[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === ".git") return
      const item = path.join(dir, entry.name)
      if (entry.isDirectory()) return walk(item, out)
      if (entry.isFile() && entry.name === "SKILL.md") out.push(item)
    }),
  )
}

export function root() {
  return roots().find((item) => fssync.existsSync(item))
}

export async function index() {
  const dir = root()
  if (!dir) return [] satisfies Indexed[]

  const files: string[] = []
  await walk(dir, files)
  const seen = new Set<string>()
  const skills: Indexed[] = []

  for (const file of files.sort()) {
    const meta = matter(await read(file))
    if (!meta?.name || !meta.description) continue
    if (seen.has(meta.name)) continue
    seen.add(meta.name)
    skills.push({
      name: meta.name,
      description: meta.description,
      displayName: meta.displayName,
      shortDescription: meta.shortDescription,
      iconSmall: meta.iconSmall,
      iconLarge: meta.iconLarge,
      brandColor: meta.brandColor,
      defaultPrompt: meta.defaultPrompt,
      enabled: meta.enabled === "false" ? false : true,
      location: file,
      content: "",
    })
  }

  return skills
}

export function isAwesome(skill: Pick<Info, "location">) {
  return skill.location.includes(`${path.sep}${PACK}${path.sep}`) || skill.location.includes(`/${PACK}/`)
}

export const AwesomeSkills = {
  index,
  isAwesome,
  root,
}
