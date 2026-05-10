import * as vscode from "vscode"
import { GitOps } from "../agent-manager/GitOps"
import { GitStatsPoller, type LocalStats } from "../agent-manager/GitStatsPoller"
import { diffSummary, workingTreeSummary } from "../agent-manager/local-diff"
import { getWorkspaceRoot } from "../review-utils"

export function browserSettingsMessage() {
  const config = vscode.workspace.getConfiguration("altru-coder.new.browserAutomation")
  return {
    type: "browserSettingsLoaded" as const,
    settings: {
      enabled: config.get<boolean>("enabled", false),
      useSystemChrome: config.get<boolean>("useSystemChrome", true),
      headless: config.get<boolean>("headless", false),
    },
  }
}

export function claudeCompatSettingMessage() {
  const enabled = vscode.workspace.getConfiguration("altru-coder.new").get<boolean>("claudeCodeCompat", false)
  return {
    type: "claudeCompatSettingLoaded" as const,
    enabled: enabled ?? false,
  }
}

export function createStatsPolling(post: (msg: { type: "worktreeStatsLoaded"; files: number; additions: number; deletions: number }) => void) {
  const git = new GitOps({ log: () => {} })
  const poller = new GitStatsPoller({
    getWorktrees: () => [],
    getWorkspaceRoot: () => getWorkspaceRoot(),
    localDiff: (dir, base) => diffSummary(git, dir, base),
    localWorktreeDiff: (dir) => workingTreeSummary(git, dir),
    git,
    onStats: () => {},
    onLocalStats: (stats: LocalStats) => {
      post({
        type: "worktreeStatsLoaded",
        files: stats.files,
        additions: stats.additions,
        deletions: stats.deletions,
      })
    },
    log: () => {},
    hiddenIntervalMs: 60000,
  })
  poller.setEnabled(true)
  poller.setVisible(true)
  return { git, poller }
}
