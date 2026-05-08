// Individual chat message bubble — renders Altru Coder Chat ContentBlock[] content
// with reactions, action approvals, edit/delete/reply controls.
//
// Layout mirrors the web client (cloud/apps/web/src/app/(app)/claw/altru-chat/
// components/MessageBubble.tsx): own messages right-justified with a primary
// bubble, bot/other messages left-justified with a muted bubble, author name
// and reply preview stacked above the bubble, timestamp/edited markers
// rendered inside the bubble's footer, reactions stacked below, and the
// per-message toolbar positioned to the side and revealed on hover.

import { Show, For, createMemo, createSignal } from "solid-js"
import { Markdown } from "@altru-coder/altru-coder-ui/markdown"
import { showToast } from "@altru-coder/altru-coder-ui/toast"
import type { ContentBlock, ExecApprovalDecision, Message } from "../lib/types"
import { useAltruCoderClawLanguage } from "../context/language"

const ULID_TIME_LEN = 10
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const ENCODING_LEN = ENCODING.length

/** Decode the time portion of a ULID into a millisecond epoch. */
function ulidToTimestamp(id: string): number {
  if (!id || id.length < ULID_TIME_LEN) return Date.now()
  const time = id.slice(0, ULID_TIME_LEN).toUpperCase()
  let ts = 0
  for (const ch of time) {
    const idx = ENCODING.indexOf(ch)
    if (idx === -1) return Date.now()
    ts = ts * ENCODING_LEN + idx
  }
  return ts
}

function contentBlocksToText(content: ContentBlock[]): string {
  let out = ""
  for (const block of content) {
    if (block.type === "text") out += block.text
  }
  return out
}

function formatTime(epoch: number): string {
  const d = new Date(epoch)
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

type MessageBubbleProps = {
  message: Message
  isOwn: boolean
  assistantName: string | null
  replyToMessage: Message | null
  pendingDeleteId: string | null
  onReply: (msg: Message) => void
  onRequestDelete: (id: string) => void
  onCancelDelete: () => void
  onConfirmDelete: (id: string) => void
  onEdit: (id: string, content: ContentBlock[]) => void
  onAddReaction: (id: string, emoji: string) => void
  onRemoveReaction: (id: string, emoji: string) => void
  onExecuteAction: (id: string, groupId: string, value: ExecApprovalDecision) => void
}

export function MessageBubble(props: MessageBubbleProps) {
  const { t } = useAltruCoderClawLanguage()
  const [isEditing, setIsEditing] = createSignal(false)
  const [editText, setEditText] = createSignal("")
  const [showReactionPick, setShowReactionPick] = createSignal(false)

  const isBot = createMemo(() => props.message.senderId.startsWith("bot:"))
  const isOptimistic = createMemo(() => props.message.id.startsWith("pending-"))
  const timestamp = createMemo(() => (isOptimistic() ? Date.now() : ulidToTimestamp(props.message.id)))
  const textContent = createMemo(() => (props.message.deleted ? "" : contentBlocksToText(props.message.content)))
  const empty = createMemo(() => !textContent() || !textContent().trim())
  const isDeleting = createMemo(() => props.pendingDeleteId === props.message.id)
  const variant = createMemo(() => (props.isOwn ? "own" : isBot() ? "bot" : "other"))
  // Reactions are rendered inline below the bubble; author name sits above
  // bot bubbles only (we never label our own messages).
  const showAuthor = createMemo(() => isBot() && !props.isOwn)
  const actionBlocks = createMemo(() => props.message.content.filter((b) => b.type === "actions"))

  const startEdit = () => {
    setEditText(textContent())
    setIsEditing(true)
  }

  const saveEdit = () => {
    const trimmed = editText().trim()
    if (!trimmed) {
      setIsEditing(false)
      return
    }
    if (trimmed === textContent().trim()) {
      setIsEditing(false)
      return
    }
    props.onEdit(props.message.id, [{ type: "text", text: trimmed }])
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditText("")
  }

  const copyText = async () => {
    const text = textContent()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showToast({ title: t("altruClaw.message.copied"), variant: "success", duration: 2000 })
    } catch {
      showToast({ title: t("altruClaw.message.copyFailed"), variant: "error", duration: 3000 })
    }
  }

  return (
    <div class={`altru-coder-claw-msg altru-coder-claw-msg-${variant()}`}>
      <div class="altru-coder-claw-msg-column">
        {/* Author label — above the bubble for bot messages only */}
        <Show when={showAuthor()}>
          <span class="altru-coder-claw-msg-author">{props.assistantName ?? t("altruClaw.message.bot")}</span>
        </Show>

        {/* Reply preview — above the bubble, aligned with the author label */}
        <Show when={props.replyToMessage}>
          {(reply) => (
            <div class="altru-coder-claw-msg-reply">
              <span class="altru-coder-claw-msg-reply-arrow" aria-hidden="true">
                ↩
              </span>
              <Show
                when={!reply().deleted}
                fallback={<span class="altru-coder-claw-msg-reply-deleted">{t("altruClaw.message.replyDeleted")}</span>}
              >
                <span class="altru-coder-claw-msg-reply-text">
                  {(() => {
                    const txt = contentBlocksToText(reply().content)
                    return txt.length > 60 ? `${txt.slice(0, 60)}…` : txt
                  })()}
                </span>
              </Show>
            </div>
          )}
        </Show>

        {/* Bubble + side-positioned toolbar */}
        <div class="altru-coder-claw-msg-bubble-wrap">
          <Show when={!props.message.deleted && !isEditing() && !isDeleting() && !isOptimistic()}>
            <div class="altru-coder-claw-msg-toolbar">
              <button
                type="button"
                class="altru-coder-claw-iconbtn-sm"
                onClick={() => setShowReactionPick((v) => !v)}
                title={t("altruClaw.message.react")}
                aria-label={t("altruClaw.message.react")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              <Show when={!empty()}>
                <button
                  type="button"
                  class="altru-coder-claw-iconbtn-sm"
                  onClick={copyText}
                  title={t("altruClaw.message.copy")}
                  aria-label={t("altruClaw.message.copy")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </Show>
              <Show when={!props.message.deliveryFailed}>
                <button
                  type="button"
                  class="altru-coder-claw-iconbtn-sm"
                  onClick={() => props.onReply(props.message)}
                  title={t("altruClaw.message.reply")}
                  aria-label={t("altruClaw.message.reply")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 17 4 12 9 7" />
                    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                  </svg>
                </button>
              </Show>
              <Show when={props.isOwn && !props.message.deliveryFailed}>
                <button
                  type="button"
                  class="altru-coder-claw-iconbtn-sm"
                  onClick={startEdit}
                  title={t("altruClaw.message.edit")}
                  aria-label={t("altruClaw.message.edit")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </Show>
              <Show when={props.isOwn}>
                <button
                  type="button"
                  class="altru-coder-claw-iconbtn-sm altru-coder-claw-iconbtn-danger"
                  onClick={() => props.onRequestDelete(props.message.id)}
                  title={t("altruClaw.message.delete")}
                  aria-label={t("altruClaw.message.delete")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </Show>
            </div>
          </Show>

          {/* Quick reaction picker (popover, toggled from the toolbar) */}
          <Show when={showReactionPick()}>
            <div class="altru-coder-claw-msg-reactionpick">
              <For each={["👍", "❤️", "😂", "🎉", "🚀", "👀"]}>
                {(emoji) => (
                  <button
                    type="button"
                    class="altru-coder-claw-msg-reactionpick-btn"
                    onClick={() => {
                      setShowReactionPick(false)
                      props.onAddReaction(props.message.id, emoji)
                    }}
                  >
                    {emoji}
                  </button>
                )}
              </For>
            </div>
          </Show>

          <div class="altru-coder-claw-msg-bubble">
            <Show
              when={!props.message.deleted}
              fallback={<span class="altru-coder-claw-msg-deleted">{t("altruClaw.message.deleted")}</span>}
            >
              <Show when={isEditing()}>
                <div class="altru-coder-claw-msg-edit">
                  <textarea
                    class="altru-coder-claw-msg-edit-input"
                    value={editText()}
                    onInput={(e) => setEditText(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        saveEdit()
                      } else if (e.key === "Escape") {
                        cancelEdit()
                      }
                    }}
                    autofocus
                  />
                  <div class="altru-coder-claw-msg-edit-actions">
                    <button
                      type="button"
                      class="altru-coder-claw-iconbtn-sm"
                      onClick={saveEdit}
                      title={t("altruClaw.message.save")}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      class="altru-coder-claw-iconbtn-sm"
                      onClick={cancelEdit}
                      title={t("altruClaw.message.cancel")}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </Show>

              <Show when={isDeleting()}>
                <div class="altru-coder-claw-msg-confirm-delete">
                  <span>{t("altruClaw.message.confirmDelete")}</span>
                  <button
                    type="button"
                    class="altru-coder-claw-iconbtn-sm"
                    onClick={() => props.onConfirmDelete(props.message.id)}
                    title={t("altruClaw.message.confirmDelete")}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    class="altru-coder-claw-iconbtn-sm"
                    onClick={() => props.onCancelDelete()}
                    title={t("altruClaw.message.cancel")}
                  >
                    ×
                  </button>
                </div>
              </Show>

              <Show when={!isEditing() && !isDeleting()}>
                <div class="altru-coder-claw-msg-body">
                  <Show
                    when={!empty()}
                    fallback={<span class="altru-coder-claw-msg-thinking">{t("altruClaw.message.thinking")}</span>}
                  >
                    <Show when={isBot()} fallback={<span class="altru-coder-claw-msg-text">{textContent()}</span>}>
                      <Markdown text={textContent()} />
                    </Show>
                  </Show>
                </div>
              </Show>

              {/* Action approval blocks rendered inside the bubble */}
              <For each={actionBlocks()}>
                {(block) => {
                  if (block.type !== "actions") return null
                  return (
                    <Show
                      when={!block.resolved}
                      fallback={
                        <div class="altru-coder-claw-msg-actions-resolved">
                          <span class="altru-coder-claw-msg-actions-resolved-icon">
                            {block.resolved!.value === "deny" ? "✗" : "✓"}
                          </span>
                          <span>
                            {block.actions.find((a) => a.value === block.resolved!.value)?.label ??
                              block.resolved!.value}
                          </span>
                        </div>
                      }
                    >
                      <div class="altru-coder-claw-msg-actions">
                        <For each={block.actions}>
                          {(action) => (
                            <button
                              type="button"
                              class={`altru-coder-claw-msg-action altru-coder-claw-msg-action-${action.style}`}
                              onClick={() => props.onExecuteAction(props.message.id, block.groupId, action.value)}
                            >
                              {action.label}
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  )
                }}
              </For>
            </Show>

            {/* Footer: delivery status + edited marker + timestamp (inside bubble, right-aligned) */}
            <Show when={!isEditing() && !isDeleting()}>
              <div class="altru-coder-claw-msg-footer">
                <Show when={props.message.deliveryFailed}>
                  <span class="altru-coder-claw-msg-failed">{t("altruClaw.message.notDelivered")}</span>
                </Show>
                <Show when={props.message.clientUpdatedAt && !props.message.deleted}>
                  <span>{t("altruClaw.message.edited")}</span>
                </Show>
                <span>{formatTime(timestamp())}</span>
              </div>
            </Show>
          </div>

          {/* Reaction summaries — below the bubble, aligned with the bubble edge */}
          <Show when={!props.message.deleted && props.message.reactions.length > 0}>
            <div class="altru-coder-claw-msg-reactions">
              <For each={props.message.reactions}>
                {(r) => (
                  <button
                    type="button"
                    class="altru-coder-claw-msg-reaction-pill"
                    onClick={() => props.onRemoveReaction(props.message.id, r.emoji)}
                    title={t("altruClaw.message.removeReaction")}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}
