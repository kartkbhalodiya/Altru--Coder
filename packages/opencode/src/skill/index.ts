import path from "path"
import { pathToFileURL } from "url"
import z from "zod"
import { Effect, Layer, Context, Schema } from "effect"
import { zod } from "@/util/effect-zod"
import { withStatics } from "@/util/schema"
import { NamedError } from "@opencode-ai/core/util/error"
import type { Agent } from "@/agent/agent"
import { Bus } from "@/bus"
import { makeRuntime } from "@/effect/run-service" // altrucoder_change
import { InstanceState } from "@/effect/instance-state"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Global } from "@opencode-ai/core/global"
import { Permission } from "@/permission"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Config } from "@/config/config"
import { ConfigMarkdown } from "@/config/markdown"
import { Glob } from "@opencode-ai/core/util/glob"
import * as Log from "@opencode-ai/core/util/log"
import { Discovery } from "./discovery"
import { rm } from "fs/promises" // altrucoder_change
import { BUILTIN_SKILLS } from "../altrucoder/skills/builtin" // altrucoder_change
import { AwesomeSkills } from "../altrucoder/skills/awesome" // altrucoder_change

const log = Log.create({ service: "skill" })
const CLAUDE_EXTERNAL_DIR = ".claude"
const AGENTS_EXTERNAL_DIR = ".agents"
// altrucoder_change start
export const BUILTIN_LOCATION = "builtin"
// altrucoder_change end
const EXTERNAL_SKILL_PATTERN = "skills/**/SKILL.md"
const ALTRU_CODER_SKILL_PATTERN = "{skill,skills}/**/SKILL.md"
const SKILL_PATTERN = "**/SKILL.md"

export const Info = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  displayName: Schema.optional(Schema.String), // altrucoder_change
  shortDescription: Schema.optional(Schema.String), // altrucoder_change
  iconSmall: Schema.optional(Schema.String), // altrucoder_change
  iconLarge: Schema.optional(Schema.String), // altrucoder_change
  brandColor: Schema.optional(Schema.String), // altrucoder_change
  defaultPrompt: Schema.optional(Schema.String), // altrucoder_change
  enabled: Schema.optional(Schema.Boolean), // altrucoder_change
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)), // altrucoder_change
  location: Schema.String,
  content: Schema.String,
}).pipe(withStatics((s) => ({ zod: zod(s) })))
export type Info = Schema.Schema.Type<typeof Info>

export const InvalidError = NamedError.create(
  "SkillInvalidError",
  z.object({
    path: z.string(),
    message: z.string().optional(),
    issues: z.custom<z.core.$ZodIssue[]>().optional(),
  }),
)

export const NameMismatchError = NamedError.create(
  "SkillNameMismatchError",
  z.object({
    path: z.string(),
    expected: z.string(),
    actual: z.string(),
  }),
)

type State = {
  skills: Record<string, Info>
  dirs: Set<string>
  lazy: Set<string> // altrucoder_change
}

type DiscoveryState = {
  matches: string[]
  dirs: string[]
}

type ScanState = {
  matches: Set<string>
  dirs: Set<string>
}

export interface Interface {
  readonly get: (name: string) => Effect.Effect<Info | undefined>
  readonly all: () => Effect.Effect<Info[]>
  readonly dirs: () => Effect.Effect<string[]>
  readonly available: (agent?: Agent.Info) => Effect.Effect<Info[]>
}

const add = Effect.fnUntraced(function* (state: State, match: string, bus: Bus.Interface) {
  const md = yield* Effect.tryPromise({
    try: () => ConfigMarkdown.parse(match),
    catch: (err) => err,
  }).pipe(
    Effect.catch(
      Effect.fnUntraced(function* (err) {
        const message = ConfigMarkdown.FrontmatterError.isInstance(err)
          ? err.data.message
          : `Failed to parse skill ${match}`
        const { Session } = yield* Effect.promise(() => import("@/session/session"))
        yield* bus.publish(Session.Event.Error, { error: new NamedError.Unknown({ message }).toObject() })
        log.error("failed to load skill", { skill: match, err })
        return undefined
      }),
    ),
  )

  if (!md) return

  const parsed = z
    .object({
      name: z.string(),
      description: z.string(),
      displayName: z.string().optional(),
      shortDescription: z.string().optional(),
      iconSmall: z.string().optional(),
      iconLarge: z.string().optional(),
      brandColor: z.string().optional(),
      defaultPrompt: z.string().optional(),
      enabled: z.boolean().optional(),
      dependencies: z.record(z.string(), z.unknown()).optional(),
    })
    .safeParse(md.data)
  if (!parsed.success) return

  if (state.skills[parsed.data.name]) {
    log.warn("duplicate skill name", {
      name: parsed.data.name,
      existing: state.skills[parsed.data.name].location,
      duplicate: match,
    })
  }

  state.lazy.delete(parsed.data.name) // altrucoder_change
  state.dirs.add(path.dirname(match))
  state.skills[parsed.data.name] = {
    name: parsed.data.name,
    description: parsed.data.description,
    displayName: parsed.data.displayName, // altrucoder_change
    shortDescription: parsed.data.shortDescription, // altrucoder_change
    iconSmall: parsed.data.iconSmall, // altrucoder_change
    iconLarge: parsed.data.iconLarge, // altrucoder_change
    brandColor: parsed.data.brandColor, // altrucoder_change
    defaultPrompt: parsed.data.defaultPrompt, // altrucoder_change
    enabled: parsed.data.enabled ?? true, // altrucoder_change
    dependencies: parsed.data.dependencies, // altrucoder_change
    location: match,
    content: md.content,
  }
})

const scan = Effect.fnUntraced(function* (
  state: ScanState,
  root: string,
  pattern: string,
  opts?: { dot?: boolean; scope?: string },
) {
  const matches = yield* Effect.tryPromise({
    try: () =>
      Glob.scan(pattern, {
        cwd: root,
        absolute: true,
        include: "file",
        symlink: true,
        dot: opts?.dot,
      }),
    catch: (error) => error,
  }).pipe(
    Effect.catch((error) => {
      if (!opts?.scope) return Effect.die(error)
      log.error(`failed to scan ${opts.scope} skills`, { dir: root, error })
      return Effect.succeed([] as string[])
    }),
  )

  for (const match of matches) {
    state.matches.add(match)
    state.dirs.add(path.dirname(match))
  }
})

const discoverSkills = Effect.fnUntraced(function* (
  config: Config.Interface,
  discovery: Discovery.Interface,
  fsys: AppFileSystem.Interface,
  global: Global.Interface,
  directory: string,
  worktree: string,
) {
  const state: ScanState = { matches: new Set(), dirs: new Set() }

  const externalDirs: string[] = []
  if (!Flag.ALTRU_CODER_DISABLE_EXTERNAL_SKILLS) {
    if (!Flag.ALTRU_CODER_DISABLE_CLAUDE_CODE_SKILLS) externalDirs.push(CLAUDE_EXTERNAL_DIR)
    externalDirs.push(AGENTS_EXTERNAL_DIR)

    for (const dir of externalDirs) {
      const root = path.join(global.home, dir)
      if (!(yield* fsys.isDir(root))) continue
      yield* scan(state, root, EXTERNAL_SKILL_PATTERN, { dot: true, scope: "global" })
    }

    const upDirs = yield* fsys
      .up({ targets: externalDirs, start: directory, stop: worktree })
      .pipe(Effect.catch(() => Effect.succeed([] as string[])))

    for (const root of upDirs) {
      yield* scan(state, root, EXTERNAL_SKILL_PATTERN, { dot: true, scope: "project" })
    }
  }

  const configDirs = yield* config.directories()
  for (const dir of configDirs) {
    yield* scan(state, dir, ALTRU_CODER_SKILL_PATTERN)
  }

  const cfg = yield* config.get()
  for (const item of cfg.skills?.paths ?? []) {
    const expanded = item.startsWith("~/") ? path.join(global.home, item.slice(2)) : item
    const dir = path.isAbsolute(expanded) ? expanded : path.join(directory, expanded)
    if (!(yield* fsys.isDir(dir))) {
      log.warn("skill path not found", { path: dir })
      continue
    }

    yield* scan(state, dir, SKILL_PATTERN)
  }

  for (const url of cfg.skills?.urls ?? []) {
    const pulledDirs = yield* discovery.pull(url)
    for (const dir of pulledDirs) {
      yield* scan(state, dir, SKILL_PATTERN)
    }
  }

  return {
    matches: Array.from(state.matches),
    dirs: Array.from(state.dirs),
  }
})

const loadSkills = Effect.fnUntraced(function* (state: State, discovered: DiscoveryState, bus: Bus.Interface) {
  // altrucoder_change start - seed built-in skills before discovery so user skills can override
  for (const skill of BUILTIN_SKILLS) {
    state.skills[skill.name] = {
      name: skill.name,
      description: skill.description,
      displayName: skill.displayName,
      shortDescription: skill.shortDescription,
      iconSmall: skill.iconSmall,
      iconLarge: skill.iconLarge,
      brandColor: skill.brandColor,
      defaultPrompt: skill.defaultPrompt,
      enabled: skill.enabled ?? true,
      dependencies: skill.dependencies,
      location: BUILTIN_LOCATION,
      content: skill.content,
    }
  }
  // altrucoder_change end

  // altrucoder_change start - index bundled awesome-claude-skills metadata without loading full skill bodies
  const awesome = yield* Effect.tryPromise({
    try: () => AwesomeSkills.index(),
    catch: (err) => err,
  }).pipe(
    Effect.catch((err) => {
      log.error("failed to index bundled awesome-claude-skills", { err })
      return Effect.succeed([])
    }),
  )
  for (const skill of awesome) {
    if (state.skills[skill.name]) {
      log.warn("duplicate bundled awesome skill name", {
        name: skill.name,
        existing: state.skills[skill.name].location,
        duplicate: skill.location,
      })
      continue
    }
    state.dirs.add(path.dirname(skill.location))
    state.lazy.add(skill.name)
    state.skills[skill.name] = skill
  }
  // altrucoder_change end

  yield* Effect.forEach(discovered.matches, (match) => add(state, match, bus), {
    concurrency: "unbounded",
    discard: true,
  })

  log.info("init", { count: Object.keys(state.skills).length })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/Skill") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const discovery = yield* Discovery.Service
    const config = yield* Config.Service
    const bus = yield* Bus.Service
    const fsys = yield* AppFileSystem.Service
    const global = yield* Global.Service
    const discovered = yield* InstanceState.make(
      Effect.fn("Skill.discovery")(function* (ctx) {
        return yield* discoverSkills(config, discovery, fsys, global, ctx.directory, ctx.worktree)
      }),
    )
    const state = yield* InstanceState.make(
      Effect.fn("Skill.state")(function* () {
        const s: State = { skills: {}, dirs: new Set(), lazy: new Set() } // altrucoder_change
        yield* loadSkills(s, yield* InstanceState.get(discovered), bus)
        return s
      }),
    )

    const get = Effect.fn("Skill.get")(function* (name: string) {
      const s = yield* InstanceState.get(state)
      const info = s.skills[name]
      if (!info || !s.lazy.has(name)) return info

      // altrucoder_change start - lazy-load bundled skill body only when the skill tool requests it
      const md = yield* Effect.tryPromise({
        try: () => ConfigMarkdown.parse(info.location),
        catch: (err) => err,
      }).pipe(
        Effect.catch((err) => {
          log.error("failed to load lazy bundled skill", { skill: name, location: info.location, err })
          return Effect.succeed(undefined)
        }),
      )
      if (!md) return info
      const next = { ...info, content: md.content }
      s.skills[name] = next
      s.lazy.delete(name)
      return next
      // altrucoder_change end
    })

    const all = Effect.fn("Skill.all")(function* () {
      const s = yield* InstanceState.get(state)
      return Object.values(s.skills)
    })

    const dirs = Effect.fn("Skill.dirs")(function* () {
      const s = yield* InstanceState.get(state) // altrucoder_change
      return Array.from(new Set([...(yield* InstanceState.get(discovered)).dirs, ...s.dirs])) // altrucoder_change
    })

    const available = Effect.fn("Skill.available")(function* (agent?: Agent.Info) {
      const s = yield* InstanceState.get(state)
      const list = Object.values(s.skills).toSorted((a, b) => a.name.localeCompare(b.name))
      const enabled = list.filter((skill) => skill.enabled !== false) // altrucoder_change
      if (!agent) return enabled
      return enabled.filter((skill) => Permission.evaluate("skill", skill.name, agent.permission).action !== "deny")
    })

    return Service.of({ get, all, dirs, available })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Discovery.defaultLayer),
  Layer.provide(Config.defaultLayer),
  Layer.provide(Bus.layer),
  Layer.provide(AppFileSystem.defaultLayer),
  Layer.provide(Global.layer),
)

// altrucoder_change start - legacy promise helpers for Altru Coder callsites
const { runPromise } = makeRuntime(Service, defaultLayer)
export const all = () => runPromise((svc) => svc.all())
export const get = (name: string) => runPromise((svc) => svc.get(name))
export const dirs = () => runPromise((svc) => svc.dirs())
// altrucoder_change end

export function fmt(list: Info[], opts: { verbose: boolean }) {
  if (list.length === 0) return "No skills are currently available."
  const loc = (skill: Info) =>
    skill.location === BUILTIN_LOCATION ? BUILTIN_LOCATION : pathToFileURL(skill.location).href
  if (opts.verbose) {
    return [
      "<available_skills>",
      ...list
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((skill) => [
          "  <skill>",
          `    <name>${skill.name}</name>`,
          ...(skill.displayName ? [`    <display_name>${skill.displayName}</display_name>`] : []),
          `    <description>${skill.description}</description>`,
          ...(skill.shortDescription ? [`    <short_description>${skill.shortDescription}</short_description>`] : []),
          ...(skill.brandColor ? [`    <brand_color>${skill.brandColor}</brand_color>`] : []),
          ...(skill.defaultPrompt ? [`    <default_prompt>${skill.defaultPrompt}</default_prompt>`] : []),
          `    <location>${loc(skill)}</location>`,
          "  </skill>",
        ]),
      "</available_skills>",
    ].join("\n")
  }

  return [
    "## Available Skills",
    ...list
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map((skill) => `- **${skill.displayName ?? skill.name}**: ${skill.shortDescription ?? skill.description}`),
  ].join("\n")
}

// altrucoder_change start - skill removal
export async function remove(location: string) {
  if (location === BUILTIN_LOCATION) {
    throw new Error("cannot remove built-in skill")
  }
  const resolved = path.resolve(location)
  const dir = path.dirname(resolved)
  await rm(dir, { recursive: true, force: true })
}
// altrucoder_change end

export * as Skill from "."
