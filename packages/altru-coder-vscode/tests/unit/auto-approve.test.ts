import { describe, expect, it } from "bun:test"
import * as vscode from "vscode"
import {
  registerToggleAutoApprove,
  shouldApprove,
  type AutoApproveController,
  type AutoApproveMode,
  type AutoApproveState,
} from "../../src/commands/toggle-auto-approve"
import { createAutoApproveBridge } from "../../src/altru-coder-provider/auto-approve"
import type { Event, AltruCoderClient, PermissionRequest } from "@altru-coder/sdk/v2/client"
import type { AltruCoderConnectionService } from "../../src/services/cli-backend/connection-service"

type ConfigEvent = { affectsConfiguration(key: string): boolean }
type Reply = "once" | "always" | "reject"
type Permission = {
  id: string
  sessionID: string
  permission: string
  patterns: string[]
  always: string[]
  metadata: Record<string, unknown>
}

function defer<T>() {
  const state = {} as { resolve: (value: T) => void; reject: (err: unknown) => void }
  const promise = new Promise<T>((resolve, reject) => {
    state.resolve = resolve
    state.reject = reject
  })
  return { promise, resolve: state.resolve, reject: state.reject }
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function config(initial: boolean | AutoApproveMode, info: Record<string, unknown> = {}) {
  const handlers: Array<(event: ConfigEvent) => void> = []
  const updates: Array<{ key: string; value: unknown; target: unknown }> = []
  const messages: string[] = []
  const commands = new Map<string, (...args: unknown[]) => unknown>()
  const state = { mode: typeof initial === "string" ? initial : initial ? "workspace" : "default" }
  const api = vscode as unknown as {
    workspace: {
      getConfiguration: (section?: string) => {
        get: <T>(key: string, fallback?: T) => T | boolean | string
        inspect: <T>(key: string) => Record<string, unknown> | undefined
        update: (key: string, value: unknown, target: unknown) => Promise<void>
      }
      onDidChangeConfiguration: (listener: (event: ConfigEvent) => void) => { dispose(): void }
    }
    window: {
      showInformationMessage: (message: string) => Promise<undefined>
      showWarningMessage: (message: string) => Promise<undefined>
    }
    commands: { registerCommand: (command: string, callback: (...args: unknown[]) => unknown) => { dispose(): void } }
  }

  api.workspace.getConfiguration = () => ({
    get: (key, fallback) => {
      if (key === "mode") return state.mode
      if (key === "enabled") return state.mode !== "default"
      return fallback as string | boolean | undefined
    },
    inspect: () => info,
    update: async (key, value, target) => {
      updates.push({ key, value, target })
      if (key === "mode" && typeof value === "string") state.mode = value as AutoApproveMode
      if (key === "enabled" && typeof value === "boolean" && state.mode === "default" && value) state.mode = "workspace"
    },
  })
  api.workspace.onDidChangeConfiguration = (listener) => {
    handlers.push(listener)
    return {
      dispose() {
        const index = handlers.indexOf(listener)
        if (index >= 0) handlers.splice(index, 1)
      },
    }
  }
  api.window.showInformationMessage = async (message) => {
    messages.push(message)
    return undefined
  }
  api.window.showWarningMessage = async (message) => {
    messages.push(message)
    return undefined
  }
  api.commands.registerCommand = (command, callback) => {
    commands.set(command, callback)
    return { dispose: () => undefined }
  }

  return {
    updates,
    messages,
    commands,
    set active(value: boolean) {
      state.mode = value ? "workspace" : "default"
    },
    set mode(value: AutoApproveMode) {
      state.mode = value
    },
    emit(key = "altru-coder.new.autoApprove.mode") {
      for (const handler of handlers) handler({ affectsConfiguration: (name) => name === key })
    },
  }
}

function context() {
  return { subscriptions: [] as Array<{ dispose(): void }> } as vscode.ExtensionContext
}

function connection(client: AltruCoderClient | null) {
  const listeners: Array<(event: Event) => void> = []
  const svc = {
    getClient: () => {
      if (!client) throw new Error("not connected")
      return client
    },
    onEvent: (listener: (event: Event) => void) => {
      listeners.push(listener)
      return () => {
        const index = listeners.indexOf(listener)
        if (index >= 0) listeners.splice(index, 1)
      }
    },
  } as unknown as AltruCoderConnectionService

  return {
    svc,
    emit(event: Event) {
      for (const listener of listeners) listener(event)
    },
  }
}

function client(opts: {
  list?: (dir: string) => Promise<{ data: Permission[] }>
  reply?: (args: { requestID: string; directory: string; reply: Reply }) => Promise<unknown>
  allow?: (args: { requestID?: string; directory: string; enable: boolean }) => Promise<unknown>
}) {
  return {
    permission: {
      list: async (args: { directory: string }) => opts.list?.(args.directory) ?? { data: [] },
      reply: async (args: { requestID: string; directory: string; reply: Reply }) => opts.reply?.(args),
      allowEverything: async (args: { requestID?: string; directory: string; enable: boolean }) => opts.allow?.(args),
    },
  } as unknown as AltruCoderClient
}

function perm(id: string, permission = "bash", patterns = ["*"], sessionID = "ses_1"): Permission {
  return { id, sessionID, permission, patterns, always: patterns, metadata: {} }
}

function asked(id: string, sessionID = "ses_1", permission = "bash", patterns = ["*"]) {
  return { type: "permission.asked", properties: perm(id, permission, patterns, sessionID) } as Event
}

function request(input: Partial<PermissionRequest>): PermissionRequest {
  return {
    id: "perm",
    sessionID: "ses_1",
    permission: "read",
    patterns: [],
    always: [],
    metadata: {},
    ...input,
  }
}

describe("shouldApprove", () => {
  it("keeps workspace mode scoped to the current folder", () => {
    expect(
      shouldApprove(
        "workspace",
        request({ permission: "external_directory", patterns: ["/repo/src/*"] }),
        ["/repo"],
      ),
    ).toBe(true)
    expect(
      shouldApprove(
        "workspace",
        request({ permission: "external_directory", patterns: ["/outside/*"] }),
        ["/repo"],
      ),
    ).toBe(false)
    expect(shouldApprove("workspace", request({ permission: "read", patterns: ["/outside/secret.txt"] }), ["/repo"]))
      .toBe(false)
    expect(
      shouldApprove(
        "workspace",
        request({ permission: "grep", patterns: ["secret"], metadata: { path: "/outside" } }),
        ["/repo"],
      ),
    ).toBe(false)
  })

  it("allows explicit bypass to approve outside-folder prompts", () => {
    expect(
      shouldApprove("bypass", request({ permission: "external_directory", patterns: ["/outside/*"] }), ["/repo"]),
    ).toBe(true)
  })
})

describe("registerToggleAutoApprove", () => {
  it("restores persisted state, follows config changes, and persists toggles to the closest configured scope", async () => {
    const env = config(true, { workspaceValue: false })
    const replies: unknown[] = []
    const bypass: unknown[] = []
    const conn = connection(
      client({ reply: async (args) => replies.push(args), allow: async (args) => bypass.push(args) }),
    )
    const ctrl = registerToggleAutoApprove(
      context(),
      conn.svc,
      (session) => `/repo/${session}`,
      () => ["/repo"],
    )
    const changes: AutoApproveState[] = []
    ctrl.onChange((state) => changes.push(state))

    expect(ctrl.active()).toBe(true)
    expect(ctrl.mode()).toBe("workspace")
    conn.emit(asked("perm_1"))
    expect(replies).toEqual([{ requestID: "perm_1", directory: "/repo/ses_1", reply: "always" }])

    env.active = false
    env.emit()
    expect(ctrl.active()).toBe(false)
    expect(changes).toEqual([{ active: false, mode: "default" }])

    conn.emit(asked("perm_2"))
    expect(replies).toHaveLength(1)

    await ctrl.toggle()
    expect(ctrl.active()).toBe(true)
    expect(ctrl.mode()).toBe("workspace")
    expect(changes).toEqual([
      { active: false, mode: "default" },
      { active: true, mode: "workspace" },
    ])
    expect(env.updates).toEqual([
      { key: "mode", value: "workspace", target: vscode.ConfigurationTarget.Workspace },
      { key: "enabled", value: true, target: vscode.ConfigurationTarget.Workspace },
    ])
    expect(bypass).toContainEqual({ directory: "/repo", enable: false })
    expect(env.messages).toContain("Auto-approve inside workspace enabled")
  })

  it("cancels pending permission drains when disabled during an enable generation", async () => {
    config(false)
    const gate = defer<{ data: Permission[] }>()
    const started = defer<void>()
    const dirs: string[] = []
    const replies: unknown[] = []
    const conn = connection(
      client({
        list: async (dir) => {
          dirs.push(dir)
          if (dir === "/one") {
            started.resolve()
            return gate.promise
          }
          return { data: [perm("perm_other")] }
        },
        reply: async (args) => replies.push(args),
      }),
    )
    const ctrl = registerToggleAutoApprove(
      context(),
      conn.svc,
      () => "/repo",
      () => ["/one", "/two"],
    )

    const enable = ctrl.toggle()
    await started.promise
    const disable = ctrl.toggle()
    gate.resolve({ data: [perm("perm_1")] })
    await Promise.all([enable, disable])

    expect(ctrl.active()).toBe(false)
    expect(dirs).toEqual(["/one"])
    expect(replies).toEqual([])
  })

  it("uses bypass mode for unrestricted approval and leaves outside-folder prompts alone in workspace mode", async () => {
    config(false)
    const replies: unknown[] = []
    const bypass: unknown[] = []
    const conn = connection(
      client({ reply: async (args) => replies.push(args), allow: async (args) => bypass.push(args) }),
    )
    const ctrl = registerToggleAutoApprove(
      context(),
      conn.svc,
      (session) => `/repo/${session}`,
      () => ["/repo"],
    )

    await ctrl.setMode("workspace")
    conn.emit(asked("outside", "ses_1", "external_directory", ["C:/outside/*"]))
    expect(replies).toEqual([])

    await ctrl.setMode("bypass")
    expect(ctrl.mode()).toBe("bypass")
    expect(bypass).toContainEqual({ directory: "/repo", enable: true })

    conn.emit(asked("outside", "ses_1", "external_directory", ["C:/outside/*"]))
    await tick()
    expect(replies).toContainEqual({ requestID: "outside", directory: "/repo/ses_1", reply: "once" })
    expect(bypass).toContainEqual({ directory: "/repo/ses_1", enable: true })
  })
})

describe("createAutoApproveBridge", () => {
  it("syncs initial state, consumes toggle requests, forwards unrelated messages, and disposes listeners", async () => {
    const posts: unknown[] = []
    const forwarded: unknown[] = []
    const listeners = new Set<(state: AutoApproveState) => void>()
    const state = { mode: "default" as AutoApproveMode }
    const ctrl: AutoApproveController = {
      active: () => state.mode !== "default",
      mode: () => state.mode,
      setMode: async (mode) => {
        state.mode = mode
        for (const listener of listeners) listener({ active: state.mode !== "default", mode: state.mode })
        return state.mode
      },
      toggle: async () => {
        state.mode = state.mode === "default" ? "workspace" : "default"
        for (const listener of listeners) listener({ active: state.mode !== "default", mode: state.mode })
        return state.mode !== "default"
      },
      onChange(listener) {
        listeners.add(listener)
        return { dispose: () => listeners.delete(listener) }
      },
    }
    const bridge = createAutoApproveBridge(
      ctrl,
      (msg) => posts.push(msg),
      async (msg) => {
        forwarded.push(msg)
        return { type: "forwarded" }
      },
    )

    expect(await bridge.handle({ type: "webviewReady" })).toEqual({ type: "forwarded" })
    expect(await bridge.handle({ type: "requestAutoApproveState" })).toBeNull()
    expect(await bridge.handle({ type: "toggleAutoApprove" })).toBeNull()
    expect(await bridge.handle({ type: "setAutoApproveMode", mode: "bypass" })).toBeNull()
    expect(await bridge.handle({ type: "other" })).toEqual({ type: "forwarded" })

    expect(posts).toEqual([
      { type: "autoApproveState", active: false, mode: "default" },
      { type: "autoApproveState", active: false, mode: "default" },
      { type: "autoApproveState", active: true, mode: "workspace" },
      { type: "autoApproveState", active: true, mode: "bypass" },
    ])
    expect(forwarded).toEqual([{ type: "webviewReady" }, { type: "other" }])

    bridge.dispose()
    state.mode = "default"
    for (const listener of listeners) listener({ active: false, mode: state.mode })
    expect(posts).toHaveLength(4)
  })
})
