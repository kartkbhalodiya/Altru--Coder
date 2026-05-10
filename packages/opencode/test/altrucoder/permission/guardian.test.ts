import { afterEach, expect, test } from "bun:test"
import { Cause, Effect, Exit, Fiber, Layer } from "effect"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { Bus } from "../../../src/bus"
import { Permission } from "../../../src/permission"
import { PermissionID } from "../../../src/permission/schema"
import { ProjectID } from "../../../src/project/schema"
import { SessionID } from "../../../src/session/schema"
import { PermissionGuardian } from "../../../src/altrucoder/permission/guardian"
import { disposeAllInstances, provideTmpdirInstance } from "../../fixture/fixture"
import { testEffect } from "../../lib/effect"

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

const reply = (input: Parameters<Permission.Interface["reply"]>[0]) =>
  Effect.gen(function* () {
    const permission = yield* Permission.Service
    return yield* permission.reply(input)
  })

const wait = (count: number) =>
  Effect.gen(function* () {
    for (let i = 0; i < 100; i++) {
      const pending = yield* list()
      if (pending.length === count) return pending
      yield* Effect.sleep("10 millis")
    }
    throw new Error(`timed out waiting for ${count} pending permission request(s)`)
  })

test("PermissionGuardian allows clearly read-only terminal modes", () => {
  const dir = process.cwd()
  expect(
    PermissionGuardian.review({
      request: { permission: "terminal", patterns: ["list"], metadata: { guardian: true, mode: "list" } },
      context: {
        directory: dir,
        worktree: dir,
        project: {
          id: ProjectID.make("project_guardian"),
          worktree: dir,
          time: { created: 0, updated: 0 },
          sandboxes: [],
        },
      },
      protected: false,
    }).action,
  ).toBe("allow")
})

it.live("guardian auto-allows low-risk read-only tool permissions", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        yield* ask({
          sessionID: SessionID.make("session_guardian_read"),
          permission: "grep",
          patterns: ["src/**/*.ts"],
          metadata: { guardian: true },
          always: [],
          ruleset: [{ permission: "grep", pattern: "*", action: "ask" }],
        })

        expect(yield* list()).toHaveLength(0)
      }),
    { git: true },
  ),
)

it.live("guardian denies obviously dangerous shell commands before user prompt", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        const exit = yield* ask({
          sessionID: SessionID.make("session_guardian_bash"),
          permission: "bash",
          patterns: ["rm -rf / --no-preserve-root"],
          metadata: { guardian: true, command: "rm -rf / --no-preserve-root" },
          always: [],
          ruleset: [{ permission: "bash", pattern: "*", action: "ask" }],
        }).pipe(Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) expect(Cause.squash(exit.cause)).toBeInstanceOf(Permission.DeniedError)
        expect(yield* list()).toHaveLength(0)
      }),
    { git: true },
  ),
)

it.live("guardian leaves ambiguous mutating requests for normal approval", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        const fiber = yield* ask({
          id: PermissionID.make("per_guardian_edit"),
          sessionID: SessionID.make("session_guardian_edit"),
          permission: "edit",
          patterns: ["src/index.ts"],
          metadata: { guardian: true, filepath: "src/index.ts" },
          always: [],
          ruleset: [{ permission: "edit", pattern: "*", action: "ask" }],
        }).pipe(Effect.forkScoped)

        expect(yield* wait(1)).toHaveLength(1)
        yield* reply({ requestID: PermissionID.make("per_guardian_edit"), reply: "reject" })

        const exit = yield* Fiber.await(fiber)
        expect(Exit.isFailure(exit)).toBe(true)
      }),
    { git: true },
  ),
)

it.live("guardian marker is required so direct permission API behavior stays unchanged", () =>
  provideTmpdirInstance(
    () =>
      Effect.gen(function* () {
        const fiber = yield* ask({
          id: PermissionID.make("per_guardian_direct"),
          sessionID: SessionID.make("session_guardian_direct"),
          permission: "grep",
          patterns: ["src/**/*.ts"],
          metadata: {},
          always: [],
          ruleset: [{ permission: "grep", pattern: "*", action: "ask" }],
        }).pipe(Effect.forkScoped)

        expect(yield* wait(1)).toHaveLength(1)
        yield* reply({ requestID: PermissionID.make("per_guardian_direct"), reply: "reject" })

        const exit = yield* Fiber.await(fiber)
        expect(Exit.isFailure(exit)).toBe(true)
      }),
    { git: true },
  ),
)
