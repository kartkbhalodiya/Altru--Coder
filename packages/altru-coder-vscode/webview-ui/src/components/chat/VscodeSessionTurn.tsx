/**
 * VscodeSessionTurn component
 * Custom replacement for the upstream SessionTurn, designed for the VS Code sidebar.
 *
 * Key differences from upstream SessionTurn:
 * - No "Gathered context" grouping — each tool call is rendered individually
 * - Sub-agents are fully expanded inline via TaskToolExpanded
 * - No per-turn auto-scroll (MessageList handles it)
 * - Simpler flat structure without overflow containers
 */

import { Component, createMemo, createSignal, For, Show, createEffect } from "solid-js"
import { UserMessageDisplay } from "@altru-coder/altru-coder-ui/message-part"
import { DiffChanges } from "@altru-coder/altru-coder-ui/diff-changes"
import { Icon } from "@altru-coder/altru-coder-ui/icon"
import { useData } from "@altru-coder/altru-coder-ui/context/data"
import { useI18n } from "@altru-coder/altru-coder-ui/context/i18n"
import { AssistantMessage } from "./AssistantMessage"
import type {
  AssistantMessage as SDKAssistantMessage,
  Message as SDKMessage,
  Part as SDKPart,
  SnapshotFileDiff,
} from "@altru-coder/sdk/v2"
import { ErrorDisplay } from "./ErrorDisplay"
import { useServer } from "../../context/server"
import { useSession } from "../../context/session"
import { useLanguage } from "../../context/language"
import { useVSCode } from "../../context/vscode"
import { useFeedback } from "../../context/feedback"
import { visibleError } from "../../context/session-errors"
import type { ErrorDisplayProps } from "./ErrorDisplay"
import type { Message as WebMessage } from "../../types/messages"

const ROWS = 10

function dir(file: string): string {
  const i = file.lastIndexOf("/")
  return i === -1 ? "" : file.slice(0, i + 1)
}

function name(file: string): string {
  const i = file.lastIndexOf("/")
  return i === -1 ? file : file.slice(i + 1)
}

export interface VscodeTurn {
  id: string
  user: WebMessage
  assistant: WebMessage[]
  partial?: boolean
}

interface VscodeSessionTurnProps {
  turn: VscodeTurn
  queued?: boolean
  onForkMessage?: (sessionId: string, messageId: string) => void
}

export const VscodeSessionTurn: Component<VscodeSessionTurnProps> = (props) => {
  const data = useData()
  const i18n = useI18n()
  const server = useServer()
  const session = useSession()
  const language = useLanguage()
  const vscode = useVSCode()
  const feedback = useFeedback()

  const emptyParts: SDKPart[] = []
  const emptyDiffs: SnapshotFileDiff[] = []

  createEffect(() => {
    const turn = props.turn
    const ids = turn.partial ? turn.assistant.map((m) => m.id) : [turn.user.id, ...turn.assistant.map((m) => m.id)]
    session.hydrateParts(ids)
  })

  const message = createMemo(() => props.turn.user as SDKMessage & { role: "user" })

  const parts = createMemo(() => {
    const msg = message()
    return (data.store.part?.[msg.id] ?? emptyParts) as SDKPart[]
  })

  const assistantMessages = createMemo(() => props.turn.assistant as SDKAssistantMessage[])

  const interrupted = createMemo(() => assistantMessages().some((m) => m.error?.name === "MessageAbortedError"))

  const error = createMemo(() => visibleError(assistantMessages(), session.isErrorHidden))

  // Diffs from message summary
  const diffs = createMemo(() => {
    const rawDiffs = (message() as unknown as { summary?: { diffs?: unknown[] } } | undefined)?.summary?.diffs
    if (!rawDiffs?.length) return emptyDiffs
    const seen = new Set<string>()
    return (rawDiffs as SnapshotFileDiff[])
      .reduceRight<SnapshotFileDiff[]>((result, diff) => {
        if (seen.has(diff.file)) return result
        seen.add(diff.file)
        result.push(diff)
        return result
      }, [])
      .reverse()
  })

  const [all, setAll] = createSignal(false)
  const complete = createMemo(() => {
    const msgs = assistantMessages()
    if (msgs.length === 0) return false
    return msgs.every((msg) => typeof msg.time.completed === "number" || !!msg.error)
  })
  const totals = createMemo(() => ({
    files: diffs().length,
    additions: diffs().reduce((sum, diff) => sum + diff.additions, 0),
    deletions: diffs().reduce((sum, diff) => sum + diff.deletions, 0),
  }))
  const visible = createMemo(() => (all() ? diffs() : diffs().slice(0, ROWS)))
  const overflow = createMemo(() => Math.max(0, diffs().length - ROWS))
  const toggle = (event: MouseEvent) => {
    event.stopPropagation()
    setAll((value) => !value)
  }

  const openChanges = () => vscode.postMessage({ type: "openChanges", turnId: message().id })

  // Copy part ID — the last text part from the last assistant message.
  // Synthetic parts (e.g. "Initializing snapshot…" from the slow-repo guard)
  // are transient status lines, not assistant output: they must never win
  // this lookup, otherwise the copy button renders beside the spinner
  // instead of the real response.
  const showAssistantCopyPartID = createMemo(() => {
    const msgs = assistantMessages()
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i]
      if (!msg) continue
      const msgParts = (data.store.part?.[msg.id] ?? emptyParts) as SDKPart[]
      for (let j = msgParts.length - 1; j >= 0; j--) {
        const part = msgParts[j]
        if (!part || part.type !== "text") continue
        if ((part as SDKPart & { synthetic?: boolean }).synthetic) continue
        if ((part as SDKPart & { text: string }).text?.trim()) return part.id
      }
    }
    return undefined
  })

  return (
    <Show when={message()}>
      {(msg) => (
        <div class="vscode-session-turn" data-message={msg().id}>
          {/* User message */}
          <Show when={!props.turn.partial}>
            <div
              class="vscode-session-turn-user"
              data-revert-disabled={
                assistantMessages().length > 0 && !session.revert() && session.status() !== "idle" ? "" : undefined
              }
              title={
                assistantMessages().length > 0 && !session.revert() && session.status() !== "idle"
                  ? language.t("revert.disabled.agentBusy")
                  : undefined
              }
            >
              <UserMessageDisplay
                message={msg() as unknown as Parameters<typeof UserMessageDisplay>[0]["message"]}
                parts={parts() as unknown as Parameters<typeof UserMessageDisplay>[0]["parts"]}
                interrupted={interrupted()}
                queued={props.queued}
                onFork={props.onForkMessage ? () => props.onForkMessage?.(msg().sessionID, msg().id) : undefined}
                onRevert={
                  assistantMessages().length > 0 && !session.revert()
                    ? () => {
                        if (session.status() !== "idle") return
                        session.revertSession(msg().id)
                      }
                    : undefined
                }
              />
            </div>
          </Show>

          {/* Assistant parts — flat list, no context grouping */}
          <Show when={assistantMessages().length > 0}>
            <div class="vscode-session-turn-assistant">
              <For each={assistantMessages()}>
                {(amsg) => (
                  <AssistantMessage
                    message={amsg}
                    showAssistantCopyPartID={showAssistantCopyPartID()}
                    feedback={{
                      enabled: feedback.telemetryEnabled(),
                      rating: feedback.getRating(amsg.id),
                      onRate: (next) =>
                        feedback.rate({
                          messageID: amsg.id,
                          sessionID: amsg.sessionID,
                          parentMessageID: amsg.parentID,
                          providerID: amsg.providerID,
                          modelID: amsg.modelID,
                          variant: (amsg as SDKAssistantMessage & { variant?: string }).variant,
                          next,
                        }),
                    }}
                  />
                )}
              </For>
            </div>
          </Show>

          {/* Diff summary — shown after completion. Click opens the changes view. */}
          <Show when={diffs().length > 0 && complete() && server.gitInstalled()}>
            <div class="vscode-session-turn-diffs" data-component="session-turn-diff-summary">
              <div data-slot="session-turn-diffs-panel">
                <button
                  type="button"
                  data-slot="session-turn-diffs-header"
                  onClick={openChanges}
                  aria-label={language.t("command.session.show.changes")}
                >
                  <span data-slot="session-turn-diffs-title">
                    {language.t("session.review.filesChanged", { count: totals().files })}
                  </span>
                  <span data-slot="session-turn-diffs-total">
                    <span class="session-diff-add">+{totals().additions}</span>
                    <span class="session-diff-del">-{totals().deletions}</span>
                  </span>
                  <span data-slot="session-turn-diffs-review">
                    {language.t("common.review")}
                    <Icon name="open-file" size="small" />
                  </span>
                </button>
                <div data-slot="session-turn-diffs-list">
                  <For each={visible()}>
                    {(diff) => (
                      <button
                        type="button"
                        data-slot="session-turn-diff-row"
                        onClick={openChanges}
                        aria-label={`${language.t("common.review")} ${diff.file}`}
                      >
                        <span data-slot="session-turn-diff-path">
                          <Show when={dir(diff.file)}>
                            <span data-slot="session-turn-diff-directory">{`\u2066${dir(diff.file)}\u2069`}</span>
                          </Show>
                          <span data-slot="session-turn-diff-filename">{name(diff.file)}</span>
                        </span>
                        <span data-slot="session-turn-diff-changes">
                          <DiffChanges changes={diff} />
                        </span>
                        <span data-slot="session-turn-diff-chevron" aria-hidden="true">
                          <Icon name="chevron-right" size="small" />
                        </span>
                      </button>
                    )}
                  </For>
                  <Show when={overflow() > 0}>
                    <button type="button" data-slot="session-turn-diffs-more" onClick={toggle}>
                      {all()
                        ? i18n.t("ui.sessionTurn.diffs.showLess")
                        : i18n.t("ui.sessionTurn.diffs.more", { count: String(overflow()) })}
                    </button>
                  </Show>
                </div>
              </div>
            </div>
          </Show>

          {/* Error handling */}
          <Show when={error()}>
            {(err) => <ErrorDisplay error={err() as ErrorDisplayProps["error"]} onLogin={server.goToLogin} />}
          </Show>
        </div>
      )}
    </Show>
  )
}
