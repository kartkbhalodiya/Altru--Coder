/**
 * AltruCoderClaw webview types.
 *
 * Mirrors the extension host types for use in the SolidJS webview.
 * All data arrives via postMessage — no direct network access.
 *
 * SYNC: These types are mirrored from src/altru-coder-claw/types.ts — keep both in sync.
 */

// ── Instance status ─────────────────────────────────────────────────

export type ClawStatus = {
  // Mirrors src/altru-coder-claw/types.ts. `recovering` / `restoring` are transitional
  // states the cloud worker reports when bringing an instance back online.
  status:
    | "provisioned"
    | "starting"
    | "restarting"
    | "recovering"
    | "running"
    | "stopped"
    | "destroying"
    | "restoring"
    | null
  sandboxId?: string
  flyRegion?: string
  machineSize?: { cpus: number; memory_mb: number }
  openclawVersion?: string | null
  lastStartedAt?: string | null
  lastStoppedAt?: string | null
  channelCount?: number
  secretCount?: number
  userId?: string
  botName?: string | null
}

// ── Altru Coder Chat content blocks ────────────────────────────────────────

export type ExecApprovalDecision = "allow-once" | "allow-always" | "deny"

export type TextBlock = { type: "text"; text: string }

export type ActionItem = {
  label: string
  style: "primary" | "danger" | "secondary"
  value: ExecApprovalDecision
}

export type ActionsBlock = {
  type: "actions"
  groupId: string
  actions: ActionItem[]
  resolved?: {
    value: ExecApprovalDecision
    resolvedBy: string
    resolvedAt: number
  }
}

export type ContentBlock = TextBlock | ActionsBlock

// ── Reactions ───────────────────────────────────────────────────────

export type ReactionSummary = {
  emoji: string
  count: number
  memberIds: string[]
}

// ── Messages ────────────────────────────────────────────────────────

export type Message = {
  id: string
  senderId: string
  content: ContentBlock[]
  inReplyToMessageId: string | null
  updatedAt: number | null
  clientUpdatedAt: number | null
  deleted: boolean
  deliveryFailed: boolean
  reactions: ReactionSummary[]
}

// ── Conversations ───────────────────────────────────────────────────

export type ConversationListItem = {
  conversationId: string
  title: string | null
  lastActivityAt: number | null
  lastReadAt: number | null
  joinedAt: number
}

// ── Bot / conversation status ───────────────────────────────────────

export type BotStatusRecord = {
  online: boolean
  at: number
  updatedAt: number
}

export type ConversationStatusRecord = {
  conversationId: string
  contextTokens: number
  contextWindow: number
  model: string | null
  provider: string | null
  at: number
  updatedAt: number
}

// ── Typing ──────────────────────────────────────────────────────────

export type TypingMember = { memberId: string; at: number }

// ── Webview state ──────────────────────────────────────────────────

export type AltruCoderClawState =
  | { phase: "loading"; locale: string }
  | { phase: "noInstance"; locale: string }
  | { phase: "needsUpgrade"; locale: string }
  | { phase: "error"; locale: string; error: string }
  | {
      phase: "ready"
      locale: string
      status: ClawStatus | null
      currentUserId: string
      sandboxId: string
      conversations: ConversationListItem[]
      hasMoreConversations: boolean
      activeConversationId: string | null
      messages: Message[]
      hasMoreMessages: boolean
      botStatus: BotStatusRecord | null
      conversationStatus: ConversationStatusRecord | null
      typingMembers: TypingMember[]
    }

// ── Messages: Extension Host → Webview ──────────────────────────────

export type AltruCoderClawOutMessage =
  | { type: "altru-coder-claw.state"; state: AltruCoderClawState }
  | { type: "altru-coder-claw.status"; data: ClawStatus | null }
  | { type: "altru-coder-claw.locale"; locale: string }
  | { type: "altru-coder-claw.error"; error: string }
  | { type: "altru-coder-claw.conversations"; conversations: ConversationListItem[]; hasMore: boolean; replace: boolean }
  | { type: "altru-coder-claw.activeConversation"; conversationId: string | null }
  | { type: "altru-coder-claw.messages"; conversationId: string; messages: Message[]; hasMore: boolean; replace: boolean }
  | { type: "altru-coder-claw.messageOptimistic"; conversationId: string; message: Message }
  | { type: "altru-coder-claw.messageReplaced"; conversationId: string; pendingId: string; message: Message }
  | { type: "altru-coder-claw.messageRemoved"; conversationId: string; messageId: string }
  | { type: "altru-coder-claw.botStatus"; status: BotStatusRecord | null }
  | { type: "altru-coder-claw.conversationStatus"; status: ConversationStatusRecord | null }
  | { type: "altru-coder-claw.typing"; conversationId: string; memberId: string }
  | { type: "altru-coder-claw.typingStop"; conversationId: string; memberId: string }
  | { type: "fontSizeChanged"; fontSize: number }

// Note: messages sent from the webview to the extension host are typed in
// src/altru-coder-claw/types.ts (AltruCoderClawInMessage). The webview dispatches them
// inline via vscode.postMessage and does not import the type.
