import * as vscode from "vscode"
import * as path from "path"
import type { AltruCoderClient, Event, PermissionRequest } from "@altru-coder/sdk/v2/client"
import type { AltruCoderConnectionService } from "../services/cli-backend/connection-service"

/**
 * Callback that resolves the correct working directory for a session.
 * For worktree sessions this returns the worktree path; otherwise the workspace root.
 */
export type DirectoryResolver = (sessionId?: string) => string

/**
 * Returns every unique directory the extension tracks
 * (workspace root + all registered worktree paths).
 */
export type AllDirectories = () => string[]

export type AutoApproveMode = "default" | "workspace" | "bypass"

export interface AutoApproveState {
  active: boolean
  mode: AutoApproveMode
}

export interface AutoApproveController {
  active(): boolean
  mode(): AutoApproveMode
  setMode(mode: AutoApproveMode): Promise<AutoApproveMode>
  toggle(): Promise<boolean>
  onChange(listener: (state: AutoApproveState) => void): { dispose(): void }
}

const CONFIG = "altru-coder.new.autoApprove"
const ENABLED = "enabled"
const MODE = "mode"

/**
 * Runtime auto-approve modes for permissions.
 *
 * Workspace mode replies "always" to in-project prompts. Bypass mode writes
 * the CLI's allow-everything rule so the backend stops prompting entirely.
 */
export function registerToggleAutoApprove(
  context: vscode.ExtensionContext,
  connectionService: AltruCoderConnectionService,
  resolve: DirectoryResolver,
  directories: AllDirectories,
): AutoApproveController {
  const state = { mode: readMode(), generation: 0 }
  const listeners = new Set<(state: AutoApproveState) => void>()

  const notify = () => {
    const snapshot = current(state.mode)
    for (const listener of listeners) listener(snapshot)
  }

  const setMode = async (next: AutoApproveMode) => {
    state.mode = next
    state.generation++
    const snapshot = state.generation
    notify()
    await writeMode(next)
    await apply(next, snapshot)
    return state.mode
  }

  const toggle = async () => {
    await setMode(state.mode === "default" ? "workspace" : "default")
    return state.mode !== "default"
  }

  const apply = async (mode: AutoApproveMode, snapshot: number) => {
    const client = tryGetClient(connectionService)
    if (mode === "default") {
      vscode.window.showInformationMessage("Auto-approve default")
      if (client) await allowEverything(client, directories(), false)
      return
    }

    if (mode === "workspace") {
      vscode.window.showInformationMessage("Auto-approve inside workspace enabled")
      if (!client) return
      await allowEverything(client, directories(), false)
      await drain(client, directories(), snapshot, mode, "always")
      return
    }

    vscode.window.showWarningMessage("Bypass permissions enabled")
    if (!client) return
    await allowEverything(client, directories(), true)
    await drain(client, directories(), snapshot, mode, "once")
  }

  const drain = async (
    client: AltruCoderClient,
    roots: string[],
    snapshot: number,
    mode: AutoApproveMode,
    reply: "once" | "always",
  ) => {
    for (const dir of unique(roots)) {
      if (state.generation !== snapshot) break
      try {
        const { data: pending } = await client.permission.list({ directory: dir }, { throwOnError: true })
        for (const req of pending) {
          if (state.generation !== snapshot) break
          if (!shouldApprove(mode, req, roots)) continue
          await client.permission.reply({ requestID: req.id, directory: dir, reply }).catch((err) => {
            console.error("[Altru Coder New] toggleAutoApprove: failed to drain pending:", err)
          })
        }
      } catch (err) {
        console.error("[Altru Coder New] toggleAutoApprove: failed to list pending permissions:", err)
      }
    }
  }

  const unsubscribe = connectionService.onEvent((event: Event) => {
    const mode = state.mode
    if (mode === "default") return
    if (event.type !== "permission.asked") return
    if (!shouldApprove(mode, event.properties, directories())) return
    const client = tryGetClient(connectionService)
    if (!client) return
    const dir = resolve(event.properties.sessionID)
    if (mode === "bypass") {
      client.permission
        .allowEverything({ requestID: event.properties.id, directory: dir, enable: true })
        .catch((err) => {
          console.error("[Altru Coder New] toggleAutoApprove: failed to bypass permission:", err)
        })
      return
    }
    client.permission.reply({ requestID: event.properties.id, directory: dir, reply: "always" }).catch((err) => {
      console.error("[Altru Coder New] toggleAutoApprove: failed to auto-reply:", err)
    })
  })

  context.subscriptions.push({ dispose: unsubscribe })
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration(`${CONFIG}.${MODE}`) && !event.affectsConfiguration(`${CONFIG}.${ENABLED}`))
        return
      const next = readMode()
      if (next === state.mode) return
      state.mode = next
      state.generation++
      notify()
    }),
  )

  context.subscriptions.push(vscode.commands.registerCommand("altru-coder.new.toggleAutoApprove", toggle))

  return {
    active: () => state.mode !== "default",
    mode: () => state.mode,
    setMode,
    toggle,
    onChange(listener) {
      listeners.add(listener)
      let disposed = false
      return {
        dispose() {
          if (disposed) return
          disposed = true
          listeners.delete(listener)
        },
      }
    },
  }
}

function current(mode: AutoApproveMode): AutoApproveState {
  return { mode, active: mode !== "default" }
}

function readMode(): AutoApproveMode {
  const cfg = vscode.workspace.getConfiguration(CONFIG)
  const mode = cfg.get<string>(MODE, "")
  if (isMode(mode)) return mode
  return cfg.get(ENABLED, false) ? "workspace" : "default"
}

async function writeMode(mode: AutoApproveMode) {
  const cfg = vscode.workspace.getConfiguration(CONFIG)
  await cfg.update(MODE, mode, target(MODE))
  await cfg.update(ENABLED, mode !== "default", target(ENABLED))
}

function target(key: string): vscode.ConfigurationTarget {
  const info = vscode.workspace.getConfiguration(CONFIG).inspect(key)
  if (info?.workspaceFolderValue !== undefined) return vscode.ConfigurationTarget.WorkspaceFolder
  if (info?.workspaceValue !== undefined) return vscode.ConfigurationTarget.Workspace
  return vscode.ConfigurationTarget.Global
}

function isMode(value: unknown): value is AutoApproveMode {
  return value === "default" || value === "workspace" || value === "bypass"
}

function unique(dirs: string[]) {
  return [...new Set(dirs.filter(Boolean))]
}

async function allowEverything(client: AltruCoderClient, dirs: string[], enable: boolean) {
  for (const dir of unique(dirs)) {
    await client.permission.allowEverything({ directory: dir, enable }, { throwOnError: true }).catch((err) => {
      console.error("[Altru Coder New] toggleAutoApprove: failed to update bypass mode:", err)
    })
  }
}

function shouldApprove(mode: AutoApproveMode, req: PermissionRequest, roots: string[]) {
  if (mode === "bypass") return true
  if (mode === "default") return false
  if (req.permission !== "external_directory") return true
  return req.patterns.every((pattern) => contained(pattern, roots))
}

function contained(pattern: string, roots: string[]) {
  const clean = pattern.replace(/[/\\]?\*.*$/, "")
  if (!clean || (clean === pattern && pattern.includes("*"))) return false
  const file = path.resolve(clean)
  return unique(roots).some((root) => {
    const dir = path.resolve(root)
    const rel = path.relative(dir, file)
    return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel))
  })
}

function tryGetClient(connectionService: AltruCoderConnectionService): AltruCoderClient | undefined {
  try {
    return connectionService.getClient()
  } catch {
    return undefined
  }
}
