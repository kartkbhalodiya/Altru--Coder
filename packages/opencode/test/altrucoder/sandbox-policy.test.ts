import { afterEach, expect, test } from "bun:test"
import { Cause, Effect, Exit, Layer } from "effect"
import path from "path"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { Bus } from "../../src/bus"
import { Permission } from "../../src/permission"
import { SessionID } from "../../src/session/schema"
import { SandboxPolicy } from "../../src/altrucoder/sandbox/policy"
import { disposeAllInstances, provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const bus = Bus.layer
const env = Layer.mergeAll(Permission.layer.pipe(Layer.provide(bus)), bus, CrossSpawnSpawner.defaultLayer)
const it = testEffect(env)

afterEach(async () => {
  await disposeAllInstances()
})

const ask = (input: Parameters<Permission.Interface["ask"]>[0]) =>
  Effect.gen(function* () {
    const permission = yield* Permission.Service
    return yield* permission.ask(input)
  })

const list = () =>
  Effect.gen(function* () {
    const permission = yield* Permission.Service
    return yield* permission.list()
  })

const denied = (exit: Exit.Exit<void, Permission.Error>) => {
  expect(Exit.isFailure(exit)).toBe(true)
  if (Exit.isFailure(exit)) expect(Cause.squash(exit.cause)).toBeInstanceOf(Permission.DeniedError)
}

test("SandboxPolicy parses and finds active mode from rules", () => {
  expect(SandboxPolicy.parse("READ-ONLY")).toBe("read-only")
  expect(SandboxPolicy.parse("workspace-write")).toBe("workspace-write")
  expect(SandboxPolicy.parse("unknown")).toBeUndefined()
  expect(SandboxPolicy.active(SandboxPolicy.rules("workspace-write"))).toBe("workspace-write")
})

it.live("read-only denies mutating tools even when allow-all appears later", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        const exit = yield* ask({
          sessionID: SessionID.make("session_sandbox_read_edit"),
          permission: "edit",
          patterns: ["src/index.ts"],
          metadata: { filepath: "src/index.ts" },
          always: [],
          ruleset: [...SandboxPolicy.rules("read-only"), { permission: "*", pattern: "*", action: "allow" }],
        }).pipe(Effect.exit)

        denied(exit)
        expect(yield* list()).toHaveLength(0)
      }),
    { git: true },
  ),
)

it.live("read-only allows low-risk shell inspection without prompting", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        yield* ask({
          sessionID: SessionID.make("session_sandbox_read_bash"),
          permission: "bash",
          patterns: ["git status"],
          metadata: { command: "git status" },
          always: [],
          ruleset: SandboxPolicy.rules("read-only"),
        })

        expect(yield* list()).toHaveLength(0)
      }),
    { git: true },
  ),
)

it.live("read-only denies shell commands that are not clearly read-only", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        const command = "node -e \"require('fs').writeFileSync('x','y')\""
        const exit = yield* ask({
          sessionID: SessionID.make("session_sandbox_read_bash_deny"),
          permission: "bash",
          patterns: [command],
          metadata: { command },
          always: [],
          ruleset: [...SandboxPolicy.rules("read-only"), { permission: "*", pattern: "*", action: "allow" }],
        }).pipe(Effect.exit)

        denied(exit)
        expect(yield* list()).toHaveLength(0)
      }),
    { git: true },
  ),
)

it.live("workspace-write allows workspace edits but blocks external writes", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        yield* ask({
          sessionID: SessionID.make("session_sandbox_workspace_edit"),
          permission: "edit",
          patterns: ["src/index.ts"],
          metadata: { filepath: "src/index.ts" },
          always: [],
          ruleset: SandboxPolicy.rules("workspace-write"),
        })

        const exit = yield* ask({
          sessionID: SessionID.make("session_sandbox_workspace_external"),
          permission: "external_directory",
          patterns: [path.join(path.dirname(process.cwd()), "*")],
          metadata: { access: "write" },
          always: [],
          ruleset: [...SandboxPolicy.rules("workspace-write"), { permission: "*", pattern: "*", action: "allow" }],
        }).pipe(Effect.exit)

        denied(exit)
        expect(yield* list()).toHaveLength(0)
      }),
    { git: true },
  ),
)

it.live("danger-full-access bypasses protected config approval", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        yield* ask({
          sessionID: SessionID.make("session_sandbox_danger_config"),
          permission: "edit",
          patterns: ["opencode.json"],
          metadata: { filepath: "opencode.json" },
          always: [],
          ruleset: SandboxPolicy.rules("danger-full-access"),
        })

        expect(yield* list()).toHaveLength(0)
      }),
    { git: true, config: {} },
  ),
)
