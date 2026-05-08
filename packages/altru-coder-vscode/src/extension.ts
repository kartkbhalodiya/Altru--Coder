import * as vscode from "vscode"
import { AltruCoderProvider } from "./AltruCoderProvider"
import { AgentManagerProvider } from "./agent-manager/AgentManagerProvider"
import { VscodeHost } from "./agent-manager/vscode-host"
import { AltruCoderClawProvider } from "./altru-coder-claw/AltruCoderClawProvider"
import { DiffViewerProvider } from "./diff/DiffViewerProvider"
import { DiffSourceCatalog } from "./diff/sources/catalog"
import { DiffVirtualProvider } from "./DiffVirtualProvider"
import { SettingsEditorProvider } from "./SettingsEditorProvider"
import { SubAgentViewerProvider } from "./SubAgentViewerProvider"
import { EXTENSION_DISPLAY_NAME } from "./constants"
import { AltruCoderConnectionService } from "./services/cli-backend"
import { registerAutocompleteProvider } from "./services/autocomplete"
import { ensureBackendForAutocomplete } from "./services/autocomplete/ensure-backend"
import { AutocompleteServiceManager } from "./services/autocomplete/AutocompleteServiceManager"
import { BrowserAutomationService } from "./services/browser-automation"
import { TelemetryProxy } from "./services/telemetry"
import { registerCommitMessageService } from "./services/commit-message"
import { registerCodeActions, registerTerminalActions, AltruCoderActionProvider } from "./services/code-actions"
import { registerToggleAutoApprove } from "./commands/toggle-auto-approve"
import { registerHeapSnapshot } from "./commands/heap-snapshot"
import { RemoteStatusService } from "./services/RemoteStatusService"
import { markWorkspace } from "./util/spotlight"

let agentManager: AgentManagerProvider | undefined

const panelTitleHandler = (panel: vscode.WebviewPanel) => (title: string) => {
  panel.title = title || EXTENSION_DISPLAY_NAME
}

// Activated via "onStartupFinished" (package.json) so that commands, code actions, keybindings,
// autocomplete, commit-message generation, and URI deep links all work immediately — without
// requiring the user to open a Altru Coder sidebar or panel first. The CLI backend is NOT spawned here;
// it starts lazily when a webview connects or when ensureBackendForAutocomplete() triggers it.
export function activate(context: vscode.ExtensionContext) {
  console.log("Altru Coder extension is now active")

  const telemetry = TelemetryProxy.getInstance()

  // Create shared connection service (one server for all webviews)
  const connectionService = new AltruCoderConnectionService(context)

  // Create browser automation service (manages Playwright MCP registration)
  const browserAutomationService = new BrowserAutomationService(connectionService)
  browserAutomationService.syncWithSettings()

  // Create remote status service (one status bar item for all webviews)
  const remoteService = new RemoteStatusService()
  context.subscriptions.push(remoteService)
  connectionService.setRemoteService(remoteService)

  // Re-register browser automation MCP server on CLI backend reconnect, configure telemetry,
  // set remote service client, and reload autocomplete so it picks up the now-available backend connection.
  const unsubscribeStateChange = connectionService.onStateChange((state) => {
    if (state === "connected") {
      browserAutomationService.reregisterIfEnabled()
      const config = connectionService.getServerConfig()
      if (config) {
        telemetry.configure(config.baseUrl, config.password)
        // Sync the CLI's PostHog client with the current consent state. The
        // CLI reads ALTRU_CODER_TELEMETRY_LEVEL once at spawn, so without this call
        // a fresh CLI started while VS Code telemetry was off would stay
        // opted out for the rest of the session.
        telemetry.setEnabled(vscode.env.isTelemetryEnabled)
      }
      try {
        remoteService.setClient(connectionService.getClient())
        console.log("[Altru Coder New] CLI connected, calling remoteService.refresh()")
        remoteService.refresh().catch((err) => console.warn("[Altru Coder New] initial remote refresh failed:", err))
      } catch {
        remoteService.setClient(null)
      }
      AutocompleteServiceManager.getInstance()?.load()
    } else {
      remoteService.clearState()
      remoteService.setClient(null)
    }
  })

  // Propagate runtime telemetry consent changes to the CLI subprocess so its
  // PostHog client stays in sync with the user's VS Code telemetry setting.
  context.subscriptions.push(
    vscode.env.onDidChangeTelemetryEnabled((enabled) => {
      telemetry.setEnabled(enabled)
    }),
  )

  // Prewarm the CLI backend early so autocomplete is ready before first editor use.
  ensureBackendForAutocomplete(connectionService)

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    void markWorkspace(folder.uri.fsPath, (msg) => console.warn(`[Altru Coder New] ${msg}`))
  }

  // Track all open tab panel providers so toolbar button commands can target them.
  // NOTE: The editor/title toolbar for tab panels intentionally omits Agent Manager
  // and Marketplace buttons (unlike the sidebar). Too many icons causes VS Code to
  // collapse them into a "..." overflow menu, hiding important buttons like Settings.
  const tabPanels = new Map<vscode.WebviewPanel, AltruCoderProvider>()
  const activeTabProvider = () => {
    for (const [panel, p] of tabPanels) {
      if (panel.active) return p
    }
    return undefined
  }

  // Create the provider with shared service
  const provider = new AltruCoderProvider(context.extensionUri, connectionService, context)
  provider.setRemoteService(remoteService)

  // Register the webview view provider for the sidebar.
  // retainContextWhenHidden keeps the webview alive when switching to other sidebar panels.
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AltruCoderProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  )

  // Ensure Agent Manager navigation keybindings work when a VS Code terminal has focus.
  // The terminal intercepts all keystrokes unless the command is listed in
  // terminal.integrated.commandsToSkipShell, which only contains built-in
  // commands by default.
  const skip = ["altru-coder.new.agentManagerOpen", "altru-coder.new.agentManager.showTerminal"]
  if (process.platform === "darwin") skip.push("altru-coder.new.agentManager.runScript")
  ensureCommandsSkipShell(skip)

  // Create AltruCoderClaw chat provider for editor panel
  const altruClawProvider = new AltruCoderClawProvider(context.extensionUri, connectionService)
  context.subscriptions.push(altruClawProvider)

  // Create Agent Manager provider for editor panel
  const agentManagerHost = new VscodeHost(context.extensionUri, connectionService, context)
  const agentManagerProvider = new AgentManagerProvider(agentManagerHost, connectionService)
  agentManager = agentManagerProvider
  context.subscriptions.push(agentManagerProvider)

  // Wire "Continue in Worktree" from sidebar → Agent Manager
  provider.setContinueInWorktreeHandler((sessionId, progress) =>
    agentManagerProvider.continueFromSidebar(sessionId, progress),
  )
  provider.setCreateWorktreeHandler((baseBranch, branchName) =>
    agentManagerProvider.createFromSidebar(baseBranch, branchName),
  )

  // Register toggle auto-approve shortcut (Ctrl+Alt+A / Cmd+Alt+A)
  const defaultDir = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd()
  const autoApprove = registerToggleAutoApprove(
    context,
    connectionService,
    (sessionId) => {
      if (sessionId) {
        const dir =
          provider.getSessionDirectories().get(sessionId) ?? agentManagerProvider.getSessionDirectories().get(sessionId)
        if (dir) return dir
      }
      return defaultDir()
    },
    () => {
      const dirs = new Set([defaultDir()])
      for (const dir of provider.getSessionDirectories().values()) dirs.add(dir)
      for (const dir of agentManagerProvider.getSessionDirectories().values()) dirs.add(dir)
      return [...dirs]
    },
  )
  provider.setAutoApproveController(autoApprove)
  agentManagerHost.setAutoApproveController(autoApprove)

  // Register serializer so Agent Manager restores when VS Code restarts
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer(AgentManagerProvider.viewType, {
      deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        const ctx = agentManagerHost.wrapExistingPanel(panel, {
          onBeforeMessage: (msg) => agentManagerProvider.handleMessage(msg),
        })
        agentManagerProvider.deserializePanel(ctx)
        return Promise.resolve()
      },
    }),
  )

  // Register serializer so AltruCoderClaw panel restores when VS Code restarts
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer(AltruCoderClawProvider.viewType, {
      deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        altruClawProvider.restorePanel(panel)
        return Promise.resolve()
      },
    }),
  )

  // Register serializer so "Open in Tab" restores when VS Code restarts
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer("altru-coder.new.TabPanel", {
      deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        const tabProvider = new AltruCoderProvider(context.extensionUri, connectionService, context, {
          tabTitle: panelTitleHandler(panel),
        })
        tabProvider.setRemoteService(remoteService)
        tabProvider.setAutoApproveController(autoApprove)
        tabProvider.setContinueInWorktreeHandler((sessionId, progress) =>
          agentManagerProvider.continueFromSidebar(sessionId, progress),
        )
        tabProvider.setCreateWorktreeHandler((baseBranch, branchName) =>
          agentManagerProvider.createFromSidebar(baseBranch, branchName),
        )
        tabProvider.setDiffVirtualProvider(diffVirtualProvider)
        tabProvider.resolveWebviewPanel(panel)
        tabPanels.set(panel, tabProvider)
        panel.onDidDispose(
          () => {
            console.log("[Altru Coder New] Tab panel restored from restart disposed")
            tabPanels.delete(panel)
            tabProvider.dispose()
          },
          null,
          context.subscriptions,
        )
        return Promise.resolve()
      },
    }),
  )

  const diffSourceCatalog = new DiffSourceCatalog(connectionService)
  const diffViewerProvider = new DiffViewerProvider(context.extensionUri, connectionService, diffSourceCatalog, {
    sessionIdProvider: () => provider.getCurrentSessionId(),
  })
  diffViewerProvider.setCommentHandler((comments, autoSend) => {
    void provider.appendReviewComments(comments, autoSend)
  })
  context.subscriptions.push(diffViewerProvider)

  // Create diff virtual provider (lightweight single-file diff for permission approval)
  const diffVirtualProvider = new DiffVirtualProvider(context.extensionUri)
  provider.setDiffVirtualProvider(diffVirtualProvider)
  agentManagerHost.setDiffVirtualProvider(diffVirtualProvider)
  context.subscriptions.push(diffVirtualProvider)

  // Create settings/profile editor provider (opens in editor area, not sidebar)
  const settingsEditorProvider = new SettingsEditorProvider(context.extensionUri, connectionService, context)
  settingsEditorProvider.setRemoteService(remoteService)
  context.subscriptions.push(settingsEditorProvider)

  // Create sub-agent viewer provider (read-only editor panel for sub-agent sessions)
  const subAgentViewerProvider = new SubAgentViewerProvider(context.extensionUri, connectionService, context)
  context.subscriptions.push(subAgentViewerProvider)

  // Register serializers so settings/diff/sub-agent panels restore on restart
  const settingsViews = ["settingsPanel", "profilePanel", "marketplacePanel"] as const
  for (const suffix of settingsViews) {
    context.subscriptions.push(
      vscode.window.registerWebviewPanelSerializer(`altru-coder.new.${suffix}`, {
        deserializeWebviewPanel(panel: vscode.WebviewPanel) {
          settingsEditorProvider.deserializePanel(panel)
          return Promise.resolve()
        },
      }),
    )
  }

  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer(DiffViewerProvider.viewType, {
      deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        diffViewerProvider.deserializePanel(panel)
        return Promise.resolve()
      },
    }),
  )

  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer("altru-coder.new.SubAgentViewerPanel", {
      deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        // Sub-agent viewer requires a session ID that can't be recovered
        // after restart, so dispose the stale panel cleanly.
        panel.dispose()
        return Promise.resolve()
      },
    }),
  )

  // Register toolbar button command handlers
  const settings = async (tab?: string) => {
    await vscode.commands.executeCommand(`${AltruCoderProvider.viewType}.focus`)
    await provider.waitForReady()
    provider.postMessage({ type: "navigate", view: "settings", ...(tab ? { tab } : {}) })
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("altru-coder.new.plusButtonClicked", () => {
      const tab = activeTabProvider()
      if (tab) tab.postMessage({ type: "action", action: "plusButtonClicked" })
      else provider.postMessage({ type: "action", action: "plusButtonClicked" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManagerOpen", () => {
      agentManagerProvider.openPanel()
    }),
    vscode.commands.registerCommand("altru-coder.new.marketplaceButtonClicked", (directory?: string) => {
      settingsEditorProvider.openPanel("marketplace", undefined, directory)
    }),
    vscode.commands.registerCommand("altru-coder.new.altruCoderClawOpen", () => {
      altruClawProvider.openPanel()
    }),
    vscode.commands.registerCommand("altru-coder.new.historyButtonClicked", () => {
      const tab = activeTabProvider()
      if (tab) tab.postMessage({ type: "action", action: "historyButtonClicked" })
      else provider.postMessage({ type: "action", action: "historyButtonClicked" })
    }),
    vscode.commands.registerCommand("altru-coder.new.cycleAgentMode", () => {
      const tab = activeTabProvider()
      if (tab) tab.postMessage({ type: "action", action: "cycleAgentMode" })
      else provider.postMessage({ type: "action", action: "cycleAgentMode" })
      agentManagerProvider.postMessage({ type: "action", action: "cycleAgentMode" })
    }),
    vscode.commands.registerCommand("altru-coder.new.cyclePreviousAgentMode", () => {
      const tab = activeTabProvider()
      if (tab) tab.postMessage({ type: "action", action: "cyclePreviousAgentMode" })
      else provider.postMessage({ type: "action", action: "cyclePreviousAgentMode" })
      agentManagerProvider.postMessage({ type: "action", action: "cyclePreviousAgentMode" })
    }),
    vscode.commands.registerCommand("altru-coder.new.profileButtonClicked", () => {
      settingsEditorProvider.openPanel("profile")
    }),
    vscode.commands.registerCommand("altru-coder.new.settingsButtonClicked", (tab?: string) => {
      return settings(tab)
    }),
    vscode.commands.registerCommand("altru-coder.new.openIndexingSettings", () => {
      return settings("indexing")
    }),
    // legacy-migration start
    vscode.commands.registerCommand("altru-coder.new.openMigrationWizard", () => {
      provider.postMessage({ type: "migrationState", needed: true })
    }),
    // legacy-migration end
    vscode.commands.registerCommand("altru-coder.new.generateTerminalCommand", async () => {
      const input = await vscode.window.showInputBox({
        prompt: "Describe the terminal command you want to generate",
        placeHolder: "e.g., find all .ts files modified in the last 24 hours",
      })
      if (!input) return
      await vscode.commands.executeCommand("altru-coder.SidebarProvider.focus")
      await provider.waitForReady()
      provider.postMessage({ type: "triggerTask", text: `Generate a terminal command: ${input}` })
    }),
    vscode.commands.registerCommand("altru-coder.new.toggleRemote", () => {
      remoteService.toggle().catch((err) => console.error("[Altru Coder New] toggleRemote command failed:", err))
    }),
    vscode.commands.registerCommand("altru-coder.new.openInTab", () => {
      return openAltruCoderInNewTab(
        context,
        connectionService,
        agentManagerProvider,
        tabPanels,
        diffVirtualProvider,
        remoteService,
        autoApprove,
      )
    }),
    vscode.commands.registerCommand(
      "altru-coder.new.showChanges",
      (arg?: { sessionId?: string; turnId?: string; initialSourceId?: string }) => {
        diffViewerProvider.openFromCommand(arg)
      },
    ),
    vscode.commands.registerCommand("altru-coder.new.openSubAgentViewer", (sessionID: string, title?: string) => {
      subAgentViewerProvider.openPanel(sessionID, title)
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.previousSession", () => {
      agentManagerProvider.postMessage({ type: "action", action: "sessionPrevious" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.nextSession", () => {
      agentManagerProvider.postMessage({ type: "action", action: "sessionNext" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.previousTab", () => {
      agentManagerProvider.postMessage({ type: "action", action: "tabPrevious" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.nextTab", () => {
      agentManagerProvider.postMessage({ type: "action", action: "tabNext" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.showTerminal", () => {
      // Route through the webview so it can reach into the active session
      // state and open the VS Code integrated terminal for it.
      agentManagerProvider.postMessage({ type: "action", action: "showTerminal" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.runScript", () => {
      agentManagerProvider.postMessage({ type: "action", action: "runScript" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.toggleDiff", () => {
      agentManagerProvider.postMessage({ type: "action", action: "toggleDiff" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.showShortcuts", () => {
      agentManagerProvider.postMessage({ type: "action", action: "showShortcuts" })
    }),

    vscode.commands.registerCommand("altru-coder.new.agentManager.newTab", () => {
      agentManagerProvider.postMessage({ type: "action", action: "newTab" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.newTerminal", () => {
      agentManagerProvider.postMessage({ type: "action", action: "newTerminal" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.closeTab", () => {
      agentManagerProvider.postMessage({ type: "action", action: "closeTab" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.newWorktree", () => {
      agentManagerProvider.postMessage({ type: "action", action: "newWorktree" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.openWorktree", () => {
      agentManagerProvider.postMessage({ type: "action", action: "openWorktree" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.closeWorktree", () => {
      agentManagerProvider.postMessage({ type: "action", action: "closeWorktree" })
    }),
    vscode.commands.registerCommand("altru-coder.new.agentManager.advancedWorktree", () =>
      agentManagerProvider.openAdvancedWorktree(),
    ),
    ...Array.from({ length: 9 }, (_, i) =>
      vscode.commands.registerCommand(`altru-coder.new.agentManager.jumpTo${i + 1}`, () => {
        agentManagerProvider.postMessage({ type: "action", action: `jumpTo${i + 1}` })
      }),
    ),
  )

  // Register URI handler for session imports (vscode://altrucoder.altru-coder/altrucoder/s/{sessionId})
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      async handleUri(uri: vscode.Uri) {
        const match = uri.path.match(/^\/altrucoder\/s\/([a-zA-Z0-9_-]+)$/)
        if (!match) return
        const sessionId = match[1]
        if (!sessionId) return
        console.log("[Altru Coder New] URI handler: opening cloud session:", sessionId)
        await vscode.commands.executeCommand(`${AltruCoderProvider.viewType}.focus`)
        provider.openCloudSession(sessionId)
      },
    }),
  )

  // Register autocomplete provider
  registerAutocompleteProvider(context, connectionService)

  // Register commit message generation
  registerCommitMessageService(context, connectionService)

  registerHeapSnapshot(context, connectionService)

  // Register code actions (editor context menus, terminal context menus, keyboard shortcuts)
  registerCodeActions(context, provider, agentManagerProvider)
  registerTerminalActions(context, provider, agentManagerProvider)

  // Register CodeActionProvider (lightbulb quick fixes)
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file" },
      new AltruCoderActionProvider(),
      AltruCoderActionProvider.metadata,
    ),
  )

  // Dispose services when extension deactivates (kills the server)
  context.subscriptions.push({
    dispose: () => {
      unsubscribeStateChange()
      browserAutomationService.dispose()
      provider.dispose()
      connectionService.dispose()
    },
  })
}

export async function deactivate() {
  await agentManager?.shutdown()
  TelemetryProxy.getInstance().shutdown()
}

async function openAltruCoderInNewTab(
  context: vscode.ExtensionContext,
  connectionService: AltruCoderConnectionService,
  agentManagerProvider: AgentManagerProvider,
  tabPanels: Map<vscode.WebviewPanel, AltruCoderProvider>,
  diffVirtualProvider: DiffVirtualProvider,
  remoteService: RemoteStatusService,
  autoApprove: ReturnType<typeof registerToggleAutoApprove>,
) {
  const lastCol = Math.max(...vscode.window.visibleTextEditors.map((e) => e.viewColumn || 0), 0)
  const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0

  if (!hasVisibleEditors) {
    await vscode.commands.executeCommand("workbench.action.newGroupRight")
  }

  const targetCol = hasVisibleEditors ? Math.max(lastCol + 1, 1) : vscode.ViewColumn.Two

  const panel = vscode.window.createWebviewPanel("altru-coder.new.TabPanel", EXTENSION_DISPLAY_NAME, targetCol, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [context.extensionUri],
  })

  panel.iconPath = {
    light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "altru-logo.png"),
    dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "altru-logo.png"),
  }

  const tabProvider = new AltruCoderProvider(context.extensionUri, connectionService, context, {
    tabTitle: panelTitleHandler(panel),
  })
  tabProvider.setRemoteService(remoteService)
  tabProvider.setAutoApproveController(autoApprove)
  tabProvider.setContinueInWorktreeHandler((sessionId, progress) =>
    agentManagerProvider.continueFromSidebar(sessionId, progress),
  )
  tabProvider.setCreateWorktreeHandler((baseBranch, branchName) =>
    agentManagerProvider.createFromSidebar(baseBranch, branchName),
  )
  tabProvider.setDiffVirtualProvider(diffVirtualProvider)
  tabProvider.resolveWebviewPanel(panel)
  tabPanels.set(panel, tabProvider)

  // Wait for the new panel to become active before locking the editor group.
  // This avoids the race where VS Code hasn't switched focus yet.
  await waitForWebviewPanelToBeActive(panel)
  await vscode.commands.executeCommand("workbench.action.lockEditorGroup")

  panel.onDidDispose(
    () => {
      console.log("[Altru Coder New] Tab panel disposed")
      tabPanels.delete(panel)
      tabProvider.dispose()
    },
    null,
    context.subscriptions,
  )
}

/**
 * Add extension commands to terminal.integrated.commandsToSkipShell so they
 * work when a VS Code terminal has focus. The setting only ships with built-in
 * commands; extension commands must be added explicitly.
 */
function ensureCommandsSkipShell(commands: string[]): void {
  const config = vscode.workspace.getConfiguration("terminal.integrated")
  const info = config.inspect<string[]>("commandsToSkipShell")
  // Update whichever scope already carries an override so we don't
  // shadow workspace settings or leak workspace values into global.
  const [existing, target] = info?.workspaceFolderValue
    ? [info.workspaceFolderValue, vscode.ConfigurationTarget.WorkspaceFolder]
    : info?.workspaceValue
      ? [info.workspaceValue, vscode.ConfigurationTarget.Workspace]
      : [info?.globalValue ?? [], vscode.ConfigurationTarget.Global]
  const missing = commands.filter((cmd) => !existing.includes(cmd))
  if (missing.length === 0) return
  config.update("commandsToSkipShell", [...existing, ...missing], target)
}

function waitForWebviewPanelToBeActive(panel: vscode.WebviewPanel): Promise<void> {
  if (panel.active) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const disposable = panel.onDidChangeViewState((event) => {
      if (!event.webviewPanel.active) {
        return
      }
      disposable.dispose()
      resolve()
    })
  })
}
