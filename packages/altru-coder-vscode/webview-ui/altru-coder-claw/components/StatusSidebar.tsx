// AltruCoderClaw status sidebar — mirrors the CLI sidebar structure:
// conversation title at top, then Bot Status, Context, Instance, Details.
//
// Ref: packages/opencode/src/altrucoder/claw/sidebar.tsx

import { Show, createMemo, createSignal } from "solid-js"
import { useClaw } from "../context/claw"
import { useAltruCoderClawLanguage } from "../context/language"

function dot(status: string | null | undefined): string {
  if (!status) return "altru-coder-claw-dot-offline"
  if (status === "running") return "altru-coder-claw-dot-online"
  if (status === "starting" || status === "restarting") return "altru-coder-claw-dot-warning"
  if (status === "destroying") return "altru-coder-claw-dot-error"
  return "altru-coder-claw-dot-offline"
}

function uptime(started: string | null | undefined): string {
  if (!started) return "\u2014"
  const ms = Date.now() - new Date(started).getTime()
  if (ms < 0) return "\u2014"
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

function capitalize(s: string | null | undefined, fallback: string): string {
  if (!s) return fallback
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

export function StatusSidebar() {
  const claw = useClaw()
  const { t } = useAltruCoderClawLanguage()
  const status = createMemo(() => claw.status())
  const ctx = createMemo(() => claw.conversationStatus())

  const [isRenamingTitle, setIsRenamingTitle] = createSignal(false)
  const [renameTitleText, setRenameTitleText] = createSignal("")

  const activeConversation = createMemo(() => {
    const id = claw.activeConversationId()
    if (!id) return null
    return claw.conversations().find((c) => c.conversationId === id) ?? null
  })

  const conversationTitle = createMemo(() => {
    const conv = activeConversation()
    if (!conv) return t("altruClaw.conversations.new")
    return conv.title ?? t("altruClaw.conversations.untitled")
  })

  const handleTitleClick = () => {
    if (!activeConversation()) return
    setRenameTitleText(conversationTitle())
    setIsRenamingTitle(true)
  }

  const commitTitleRename = () => {
    const next = renameTitleText().trim()
    const conv = activeConversation()
    if (conv && next && next !== conversationTitle()) {
      claw.renameConversation(conv.conversationId, next)
    }
    setIsRenamingTitle(false)
  }

  const onTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitTitleRename()
    } else if (e.key === "Escape") {
      setRenameTitleText("")
      setIsRenamingTitle(false)
    }
  }

  return (
    <div class="altru-coder-claw-sidebar">
      {/* Conversation title (top, like the session route title) */}
      <Show when={claw.activeConversationId()}>
        <div class="altru-coder-claw-sidebar-section">
          <Show
            when={!isRenamingTitle()}
            fallback={
              <input
                autofocus
                class="altru-coder-claw-sidebar-titleinput"
                value={renameTitleText()}
                onInput={(e) => setRenameTitleText(e.currentTarget.value)}
                onKeyDown={onTitleKeyDown}
                onBlur={commitTitleRename}
                maxLength={200}
              />
            }
          >
            <button
              type="button"
              class="altru-coder-claw-sidebar-titlebtn"
              onClick={handleTitleClick}
              title={t("altruClaw.conversations.rename")}
            >
              {conversationTitle()}
            </button>
          </Show>
        </div>
      </Show>

      {/* Bot Status */}
      <Show when={claw.activeConversationId()}>
        <div class="altru-coder-claw-sidebar-section">
          <div class="altru-coder-claw-sidebar-label">{t("altruClaw.sidebar.botStatus")}</div>
          <div class="altru-coder-claw-sidebar-row">
            <span
              class={`altru-coder-claw-dot ${claw.botStatus()?.online ? "altru-coder-claw-dot-online" : "altru-coder-claw-dot-offline"}`}
            />
            <span>{claw.botStatus()?.online ? t("altruClaw.chat.online") : t("altruClaw.chat.offline")}</span>
          </div>
        </div>
      </Show>

      {/* Context window usage */}
      <Show when={ctx()}>
        {(c) => (
          <div class="altru-coder-claw-sidebar-section">
            <div class="altru-coder-claw-sidebar-label">{t("altruClaw.sidebar.context")}</div>
            <Show when={c().contextWindow > 0}>
              <div class="altru-coder-claw-sidebar-detail">
                <span class="altru-coder-claw-sidebar-muted">{t("altruClaw.sidebar.used")}</span>
                <span>{Math.min(100, Math.round((c().contextTokens / c().contextWindow) * 100))}%</span>
              </div>
            </Show>
            <div class="altru-coder-claw-sidebar-detail">
              <span class="altru-coder-claw-sidebar-muted">{t("altruClaw.sidebar.tokens")}</span>
              <span>
                {formatTokens(c().contextTokens)} / {formatTokens(c().contextWindow)}
              </span>
            </div>
            <Show when={c().model}>
              <div class="altru-coder-claw-sidebar-detail">
                <span class="altru-coder-claw-sidebar-muted">{t("altruClaw.sidebar.model")}</span>
                <span class="altru-coder-claw-sidebar-value-truncate">{c().model}</span>
              </div>
            </Show>
            <Show when={c().provider}>
              <div class="altru-coder-claw-sidebar-detail">
                <span class="altru-coder-claw-sidebar-muted">{t("altruClaw.sidebar.provider")}</span>
                <span class="altru-coder-claw-sidebar-value-truncate">{c().provider}</span>
              </div>
            </Show>
          </div>
        )}
      </Show>

      {/* Instance status */}
      <Show when={status()}>
        <div class="altru-coder-claw-sidebar-section">
          <div class="altru-coder-claw-sidebar-label">{t("altruClaw.sidebar.instance")}</div>
          <div class="altru-coder-claw-sidebar-row">
            <span class={`altru-coder-claw-dot ${dot(status()!.status)}`} />
            <span>
              {capitalize(status()!.status, t("altruClaw.sidebar.unknown"))}
              <Show when={status()!.status === "running"}>
                <span class="altru-coder-claw-sidebar-muted"> {uptime(status()!.lastStartedAt)}</span>
              </Show>
            </span>
          </div>
        </div>

        {/* Details */}
        <div class="altru-coder-claw-sidebar-section">
          <div class="altru-coder-claw-sidebar-label">{t("altruClaw.sidebar.details")}</div>
          <div class="altru-coder-claw-sidebar-detail">
            <span class="altru-coder-claw-sidebar-muted">{t("altruClaw.sidebar.region")}</span>
            <span>{status()!.flyRegion?.toUpperCase() ?? "\u2014"}</span>
          </div>
          <div class="altru-coder-claw-sidebar-detail">
            <span class="altru-coder-claw-sidebar-muted">{t("altruClaw.sidebar.version")}</span>
            <span>{status()!.openclawVersion ?? "\u2014"}</span>
          </div>
          <Show
            when={
              status()!.channelCount !== null &&
              status()!.channelCount !== undefined &&
              (status()!.channelCount ?? 0) >= 1
            }
          >
            <div class="altru-coder-claw-sidebar-detail">
              <span class="altru-coder-claw-sidebar-muted">{t("altruClaw.sidebar.channels")}</span>
              <span>{status()!.channelCount}</span>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={!status()}>
        <div class="altru-coder-claw-sidebar-section">
          <span class="altru-coder-claw-sidebar-muted">{t("altruClaw.sidebar.noData")}</span>
        </div>
      </Show>
    </div>
  )
}
