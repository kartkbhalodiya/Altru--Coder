// altrucoder_change - new file
import { AwesomeSkills } from "./awesome"

type Skill = {
  name: string
  description?: string
  location?: string
}

const DETAIL = new Set([
  "ui-ux-pro-max",
  "ckm:ui-styling",
  "ckm:design-system",
  "ckm:brand",
  "ckm:slides",
  "ckm:banner-design",
  "ckm:design",
  "ui-ux-pro-max-full",
])

const CORE = ["frontend-design"] as const
const FALLBACK = ["feature-dev", "altru-coder-config", "code-review"] as const
const ACTION = ["debug", "fix", "implement", "wire", "build", "add", "ship", "refactor"] as const

const GROUPS = [
  {
    names: ["ckm:ui-styling"],
    words: [
      "ui",
      "frontend",
      "component",
      "screen",
      "page",
      "website",
      "landing",
      "dashboard",
      "admin",
      "form",
      "login",
      "signup",
      "modal",
      "dialog",
      "dropdown",
      "table",
      "card",
      "navbar",
      "sidebar",
      "responsive",
      "mobile",
      "tailwind",
      "shadcn",
      "css",
      "html",
      "react",
      "webview",
      "webview-ui",
      "chart",
      "charts",
      "graph",
      "data visualization",
      ".tsx",
      ".jsx",
      ".css",
      ".scss",
      ".vue",
      ".svelte",
      ".astro",
    ],
  },
  {
    names: ["ckm:design-system"],
    words: ["design system", "tokens", "token", "theme", "css variable", "component spec", "variant", "semantic"],
  },
  {
    names: ["ckm:brand"],
    words: ["brand", "branding", "logo usage", "visual identity", "voice", "guideline", "palette", "typography"],
  },
  {
    names: ["ckm:slides"],
    words: ["slide", "slides", "deck", "presentation", "pitch", "ppt"],
  },
  {
    names: ["ckm:banner-design"],
    words: ["banner", "cover", "header", "ad creative", "display ad", "hero image", "social post"],
  },
  {
    names: ["ckm:design"],
    words: ["logo", "icon", "asset", "mockup", "cip", "corporate identity", "visual design"],
  },
  {
    names: ["ui-ux-pro-max-full"],
    words: ["full audit", "complete audit", "deep audit", "ux audit", "ui audit", "full ux", "deep ux"],
  },
] as const

const UI_WORDS = GROUPS.flatMap((group) => group.words)
const MAX = 3

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "make",
  "create",
  "build",
  "fix",
  "add",
  "use",
  "need",
  "want",
  "work",
  "page",
])

function clean(value?: string) {
  return (value ?? "").toLowerCase()
}

function has(text: string, words: readonly string[]) {
  return words.some((word) => text.includes(word))
}

function terms(text: string) {
  return clean(text)
    .split(/[^a-z0-9:+.-]+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
}

function add<T extends Skill>(out: T[], map: Map<string, T>, names: readonly string[]) {
  for (const name of names) {
    const skill = map.get(name)
    if (!skill) continue
    if (out.some((item) => item.name === skill.name)) continue
    out.push(skill)
  }
}

function score(skill: Skill, query: string) {
  const name = clean(skill.name)
  const desc = clean(skill.description)
  const text = `${name} ${desc}`
  let total = query.includes(name) ? 100 : 0
  for (const term of terms(query)) {
    if (name.includes(term)) total += 4
    if (desc.includes(term)) total += 1
    if (text.includes(term.replaceAll("-", " "))) total += 1
  }
  return total
}

function awesome<T extends Skill>(list: T[], query: string, used: T[], limit = MAX) {
  return list
    .filter((skill) => skill.location && AwesomeSkills.isAwesome({ location: skill.location }))
    .filter((skill) => !used.some((item) => item.name === skill.name))
    .map((skill) => ({ skill, score: score(skill, query) }))
    .filter((item) => item.score > 0)
    .toSorted((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit)
    .map((item) => item.skill)
}

function builtin<T extends Skill>(list: T[], query: string, used: T[], limit = MAX) {
  return list
    .filter((skill) => !DETAIL.has(skill.name))
    .filter((skill) => !(skill.location && AwesomeSkills.isAwesome({ location: skill.location })))
    .filter((skill) => !used.some((item) => item.name === skill.name))
    .map((skill) => ({ skill, score: score(skill, query) }))
    .filter((item) => item.score > 0)
    .toSorted((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit)
    .map((item) => item.skill)
}

export function frontend(query?: string) {
  const text = clean(query)
  return has(text, UI_WORDS)
}

export function nearest<T extends Skill>(list: T[], query?: string) {
  const text = clean(query)
  const map = new Map(list.map((item) => [item.name, item]))
  if (!text) {
    const out: T[] = []
    add(out, map, FALLBACK)
    return out.slice(0, MAX)
  }

  if (!frontend(text)) {
    const out: T[] = []
    if (has(text, ACTION)) add(out, map, ["feature-dev"])
    out.push(...builtin(list, text, out, Math.max(0, MAX - out.length)))
    const extra = awesome(list, text, out, Math.max(0, MAX - out.length))
    if (out.length + extra.length > 0) return [...out, ...extra].slice(0, MAX)

    const base: T[] = []
    add(base, map, FALLBACK)
    return base.slice(0, MAX)
  }

  const out: T[] = []
  add(out, map, CORE)

  for (const group of GROUPS) {
    if (has(text, group.words)) add(out, map, group.names)
  }

  for (const item of list) {
    if (!text.includes(item.name.toLowerCase())) continue
    add(out, map, [item.name])
  }

  if (!out.some((item) => item.name === "ckm:ui-styling")) add(out, map, ["ckm:ui-styling"])
  return [...out, ...awesome(list, text, out, Math.max(0, MAX - out.length))].slice(0, MAX)
}
