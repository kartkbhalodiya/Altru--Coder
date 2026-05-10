/**
 * PromptInput component
 * Text input with send/abort buttons, ghost-text autocomplete, and @ file mention support
 */

import { createSignal, createEffect, on, For, Index, onCleanup, Show, untrack, type Component } from "solid-js"
import { Button } from "@altru-coder/altru-coder-ui/button"
import { Dialog } from "@altru-coder/altru-coder-ui/dialog"
import { IconButton } from "@altru-coder/altru-coder-ui/icon-button"
import { Tooltip } from "@altru-coder/altru-coder-ui/tooltip"
import { FileIcon } from "@altru-coder/altru-coder-ui/file-icon"
import { Icon } from "@altru-coder/altru-coder-ui/icon"
import { showToast } from "@altru-coder/altru-coder-ui/toast"
import { useDialog } from "@altru-coder/altru-coder-ui/context/dialog"
import { useSession } from "../../context/session"
import { useServer } from "../../context/server"
import { useIndexing } from "../../context/indexing"
import { useLanguage } from "../../context/language"
import { useVSCode } from "../../context/vscode"
import { useWorktreeMode } from "../../context/worktree-mode"
import { useConfig } from "../../context/config"
import { ModelSelector } from "../shared/ModelSelector"
import { ModeSwitcher } from "../shared/ModeSwitcher"
import { ThinkingSelector } from "../shared/ThinkingSelector"
import { AltruBuiltinQuotaIndicator } from "./AltruBuiltinQuotaIndicator"
import { useFileMention } from "../../hooks/useFileMention"
import { useTerminalContext } from "../../hooks/useTerminalContext"
import { useGitChangesContext } from "../../hooks/useGitChangesContext"
import { hasTerminalMention } from "../../hooks/terminal-context-utils"
import { hasGitChangesMention } from "../../hooks/git-changes-context-utils"
import { useSlashCommand } from "../../hooks/useSlashCommand"
import { useGhostText } from "../../hooks/useGhostText"
import { useImageAttachments, type ImageAttachment } from "../../hooks/useImageAttachments"
import { convertToMentionPath } from "../../utils/path-mentions"
import { usePromptHistory } from "../../hooks/usePromptHistory"
import { WandSparkles } from "@altru-coder/altru-coder-ui/lucide"
import { fileName, dirName, buildHighlightSegments, atEnd, isPromptBusy } from "./prompt-input-utils"
import type { AutoApproveMode, ReviewComment, TextPart } from "../../types/messages"
import { formatReviewCommentsMarkdown } from "../../utils/review-comment-markdown"
import { pendingDraftKey, scopeDraftKey, sessionDraftKey } from "../../utils/prompt-drafts"
import { isAltruCoderBuiltinModel } from "../../../../src/shared/provider-model"

// Per-session input text storage (module-level so it survives remounts)
const drafts = new Map<string, string>()
const reviewDrafts = new Map<string, ReviewComment[]>()
const imageDrafts = new Map<string, ImageAttachment[]>()
const fileDrafts = new Map<string, AttachedFile[]>()
const MODES: Array<{ mode: AutoApproveMode; label: string; description: string }> = [
  { mode: "default", label: "Default", description: "Normal read, write, and tool permissions." },
  { mode: "workspace", label: "All approve", description: "Approve all prompts inside this folder." },
  { mode: "bypass", label: "Bypass", description: "Approve anything in any folder." },
]
const TEXT_EXTS = new Set([
  "bat",
  "c",
  "cc",
  "conf",
  "cpp",
  "cs",
  "css",
  "csv",
  "env",
  "go",
  "h",
  "hpp",
  "html",
  "java",
  "js",
  "json",
  "jsx",
  "kt",
  "kts",
  "log",
  "md",
  "mjs",
  "php",
  "ps1",
  "py",
  "rb",
  "rs",
  "scss",
  "sh",
  "sql",
  "svg",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
])
const TEXT_NAMES = new Set(["dockerfile", "makefile", "license", "readme", ".env", ".gitignore"])

interface AttachedFile {
  id: string
  filename: string
  mime: string
  dataUrl: string
}

function isAutoApproveMode(value: unknown): value is AutoApproveMode {
  return value === "default" || value === "workspace" || value === "bypass"
}

function ext(file: File) {
  const i = file.name.lastIndexOf(".")
  if (i === -1) return ""
  return file.name.slice(i + 1).toLowerCase()
}

function mime(file: File) {
  const lower = file.name.toLowerCase()
  if (TEXT_NAMES.has(lower) || TEXT_EXTS.has(ext(file))) return "text/plain"
  return file.type || "application/octet-stream"
}

function dataurl(raw: string, type: string) {
  if (raw.startsWith("data:;base64,")) return `data:${type};base64,${raw.slice("data:;base64,".length)}`
  return raw
}

function read(file: File): Promise<AttachedFile> {
  const type = mime(file)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name || "file"}`))
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : ""
      if (!raw) {
        reject(new Error(`Failed to read ${file.name || "file"}`))
        return
      }
      resolve({
        id: crypto.randomUUID(),
        filename: file.name || "file",
        mime: type,
        dataUrl: dataurl(raw, type),
      })
    }
    reader.readAsDataURL(file)
  })
}

function mergeReviewComments(current: ReviewComment[], incoming: ReviewComment[]): ReviewComment[] {
  if (incoming.length === 0) return current
  const map = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) {
    map.set(item.id, item)
  }
  return [...map.values()]
}

interface PromptInputProps {
  blocked?: () => boolean
  /** When true, session is busy only because a suggestion is pending — treat as idle for input */
  suggesting?: () => boolean
  /** When true, session is busy only because a question is pending — treat as idle for input */
  questioning?: () => boolean
  boxId?: string
  pendingSessionID?: string
}

export const PromptInput: Component<PromptInputProps> = (props) => {
  const session = useSession()
  const server = useServer()
  const indexing = useIndexing()
  const { features } = useConfig()
  const language = useLanguage()
  const vscode = useVSCode()
  const worktree = useWorktreeMode()
  const dialog = useDialog()
  const sid = () => session.currentSessionID() ?? props.pendingSessionID ?? session.draftSessionID() ?? undefined
  const ctx = () => {
    const id = props.boxId
    if (!id || !id.startsWith("agent-manager:")) return undefined
    const rest = id.slice("agent-manager:".length)
    return rest === "unassigned" ? undefined : rest
  }
  const hasGit = () => server.gitInstalled()
  const mention = useFileMention(vscode, sid, hasGit)
  const terminal = useTerminalContext(vscode)
  const git = useGitChangesContext(vscode, ctx, hasGit)
  const slash = useSlashCommand(vscode, () =>
    session.variantList(sid()).length > 0 ? new Set() : new Set(["variant"]),
  )
  const imageAttach = useImageAttachments()
  imageAttach.setFilePathDropHandler((paths) => {
    const cwd = server.workspaceDirectory()
    const resolved = paths.map((p) => convertToMentionPath(p, cwd))
    const ref = textareaRef
    if (!ref) return
    const val = ref.value
    const cursor = ref.selectionStart ?? val.length
    const before = val.substring(0, cursor)
    const after = val.substring(cursor)
    const inserted = resolved.map((p) => `@${p}`).join(" ")
    const result = before + inserted + " " + after
    ref.value = result
    setText(result)
    mention.addPaths(resolved, cwd)
    const pos = cursor + inserted.length + 1
    ref.setSelectionRange(pos, pos)
    ref.focus()
    adjustHeight()
  })
  const history = usePromptHistory()

  const boxKey = () => props.boxId ?? "prompt:default"
  const rawKey = () =>
    sessionDraftKey(session.currentSessionID()) ??
    pendingDraftKey(props.pendingSessionID ?? session.draftSessionID()) ??
    "new"
  const draftKey = () => scopeDraftKey(boxKey(), rawKey())
  const saveDraft = (
    key: string,
    next: string,
    comments: ReviewComment[],
    imgs: ImageAttachment[],
    docs: AttachedFile[],
  ) => {
    if (next) drafts.set(key, next)
    else drafts.delete(key)
    if (comments.length > 0) reviewDrafts.set(key, comments)
    else reviewDrafts.delete(key)
    if (imgs.length > 0) imageDrafts.set(key, imgs)
    else imageDrafts.delete(key)
    if (docs.length > 0) fileDrafts.set(key, docs)
    else fileDrafts.delete(key)
  }
  const readDraft = () => ({
    text: text().trim(),
    comments: reviewComments(),
    images: imageAttach.images(),
    files: files(),
  })

  const [text, setText] = createSignal("")
  const [reviewComments, setReviewComments] = createSignal<ReviewComment[]>([])
  const [enhancing, setEnhancing] = createSignal(false)
  const [enhanceRequest, setEnhanceRequest] = createSignal<string | null>(null)
  const [autoApproveMode, setAutoApproveMode] = createSignal<AutoApproveMode>("default")
  const [autoApproveOpen, setAutoApproveOpen] = createSignal(false)
  const [attachOpen, setAttachOpen] = createSignal(false)
  const [files, setFiles] = createSignal<AttachedFile[]>([])
  let enhanceCounter = 0
  let preEnhanceText: string | null = null

  const ghost = useGhostText(vscode, text, () => server.isConnected())

  const replaceReviewComments = (next: ReviewComment[]) => {
    setReviewComments(next)
    if (next.length === 0) {
      reviewDrafts.delete(draftKey())
      return
    }
    reviewDrafts.set(draftKey(), next)
  }

  const clearReviewComments = () => replaceReviewComments([])

  const removeReviewComment = (id: string) => {
    replaceReviewComments(reviewComments().filter((item) => item.id !== id))
  }

  const openReviewFile = (item: ReviewComment) => {
    const id = session.currentSessionID()
    if (worktree && id) {
      vscode.postMessage({ type: "agentManager.openFile", sessionId: id, filePath: item.file, line: item.line })
      dialog.close()
      return
    }
    vscode.postMessage({ type: "openFile", filePath: item.file, line: item.line, column: 1 })
    dialog.close()
  }

  const side = (item: ReviewComment) => (item.side === "deletions" ? "-" : "+")
  const reviewChipTitle = (item: ReviewComment) => `${fileName(item.file)} ${side(item)}${item.line}`

  const showReviewCommentDialog = (item: ReviewComment) => {
    dialog.show(() => (
      <Dialog title={language.t("agentManager.review.modalTitle")} fit>
        <div class="prompt-review-modal">
          <div class="prompt-review-modal-head">
            <span class="prompt-review-modal-headline">{reviewChipTitle(item)}</span>
            <Tooltip value={language.t("agentManager.diff.openFile")} placement="top">
              <IconButton
                icon="go-to-file"
                size="small"
                variant="ghost"
                label={language.t("agentManager.diff.openFile")}
                onClick={() => openReviewFile(item)}
              />
            </Tooltip>
          </div>

          <div class="prompt-review-modal-grid">
            <span class="prompt-review-modal-label">{language.t("agentManager.review.metaFile")}</span>
            <code class="prompt-review-modal-value">{item.file}</code>
            <span class="prompt-review-modal-label">{language.t("agentManager.review.metaLine")}</span>
            <span class="prompt-review-modal-value">L{item.line}</span>
            <span class="prompt-review-modal-label">{language.t("agentManager.review.metaComment")}</span>
            <span class="prompt-review-modal-value">{item.comment}</span>
          </div>

          <Show when={item.selectedText}>
            <pre class="prompt-review-modal-snippet">{item.selectedText}</pre>
          </Show>
        </div>
      </Dialog>
    ))
  }

  let textareaRef: HTMLTextAreaElement | undefined
  let highlightRef: HTMLDivElement | undefined
  let dropdownRef: HTMLDivElement | undefined
  let slashDropdownRef: HTMLDivElement | undefined
  let autoApproveRef: HTMLDivElement | undefined
  let attachRef: HTMLDivElement | undefined
  let imageInputRef: HTMLInputElement | undefined
  let fileInputRef: HTMLInputElement | undefined
  const closeAutoApprove = (event: MouseEvent) => {
    const target = event.target
    if (target instanceof Node && autoApproveRef?.contains(target)) return
    setAutoApproveOpen(false)
  }
  const closeAttach = (event: MouseEvent) => {
    const target = event.target
    if (target instanceof Node && attachRef?.contains(target)) return
    setAttachOpen(false)
  }
  window.addEventListener("mousedown", closeAutoApprove)
  window.addEventListener("mousedown", closeAttach)
  onCleanup(() => {
    window.removeEventListener("mousedown", closeAutoApprove)
    window.removeEventListener("mousedown", closeAttach)
  })

  // Save/restore input text when switching sessions.
  // Uses `on()` to track only draftKey — avoids re-running on every keystroke.
  createEffect(
    on(draftKey, (key, prev) => {
      if (prev !== undefined && prev !== key) {
        saveDraft(prev, untrack(text), untrack(reviewComments), untrack(imageAttach.images), untrack(files))
      }
      const draft = drafts.get(key) ?? ""
      const pending = reviewDrafts.get(key) ?? []
      setText(draft)
      setReviewComments(pending)
      imageAttach.replace(imageDrafts.get(key) ?? [])
      setFiles(fileDrafts.get(key) ?? [])
      setEnhancing(false)
      preEnhanceText = null
      history.reset()
      if (textareaRef) {
        textareaRef.value = draft
        adjustHeight()
      }
      window.dispatchEvent(new Event("focusPrompt"))
    }),
  )

  // Seed prompt history from the current session's user messages (e.g., when a
  // session is loaded that has existing conversation). Tracks userMessages()
  // reactively so newly loaded sessions automatically contribute to history.
  // Strip review-comment markdown prefix so only the user's draft is stored.
  const REVIEW_PREFIX = /^## Review Comments\n[\s\S]*?\n\n/
  createEffect(() => {
    const msgs = session.userMessages()
    if (msgs.length === 0) return
    const texts = msgs.map((m) => {
      const parts = session.getParts(m.id)
      const raw = parts
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => p.text)
        .join("")
      return raw.replace(REVIEW_PREFIX, "")
    })
    history.seed(texts)
  })

  // Focus textarea when any part of the app requests it
  const onFocusPrompt = (event: Event) => {
    const focus = () => {
      const ref = textareaRef
      if (!ref) return
      ref.focus({ preventScroll: true })
    }
    focus()
    if (!(event instanceof CustomEvent) || !event.detail?.restore) return
    const restore = () => {
      window.focus()
      focus()
    }
    queueMicrotask(restore)
    requestAnimationFrame(() => {
      restore()
      requestAnimationFrame(restore)
      setTimeout(restore, 0)
      setTimeout(restore, 50)
    })
  }
  window.addEventListener("focusPrompt", onFocusPrompt)
  onCleanup(() => window.removeEventListener("focusPrompt", onFocusPrompt))

  // Start a new task, carrying over the current prompt text (without auto-sending it)
  const onNewTaskRequest = () => {
    const draft = text().trim()
    const comments = reviewComments()
    const imgs = imageAttach.images()
    const docs = files()
    session.clearCurrentSession()
    // After clearing, draftKey() points to the "new" bucket — save there
    // so the session-switch effect restores the prompt in the new-task view.
    saveDraft(draftKey(), draft, comments, imgs, docs)
  }
  window.addEventListener("newTaskRequest", onNewTaskRequest)
  onCleanup(() => window.removeEventListener("newTaskRequest", onNewTaskRequest))

  const captured = new Map<string, ReturnType<typeof readDraft>>()
  const onAgentManagerCaptureDraft = (event: Event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail?.id !== "string") return
    captured.set(event.detail.id, readDraft())
  }
  window.addEventListener("agentManagerCaptureDraft", onAgentManagerCaptureDraft)
  onCleanup(() => window.removeEventListener("agentManagerCaptureDraft", onAgentManagerCaptureDraft))

  const onAgentManagerApplyDraft = (event: Event) => {
    if (!(event instanceof CustomEvent)) return
    const id = event.detail?.id
    const sid = event.detail?.sessionId
    const box = event.detail?.boxId
    if (typeof id !== "string" || typeof sid !== "string" || typeof box !== "string") return
    const draft = captured.get(id)
    captured.delete(id)
    if (!draft) return
    saveDraft(scopeDraftKey(box, sessionDraftKey(sid)), draft.text, draft.comments, draft.images, draft.files)
  }
  window.addEventListener("agentManagerApplyDraft", onAgentManagerApplyDraft)
  onCleanup(() => window.removeEventListener("agentManagerApplyDraft", onAgentManagerApplyDraft))

  const onAgentManagerDiscardDraft = (event: Event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail?.id !== "string") return
    captured.delete(event.detail.id)
  }
  window.addEventListener("agentManagerDiscardDraft", onAgentManagerDiscardDraft)
  onCleanup(() => window.removeEventListener("agentManagerDiscardDraft", onAgentManagerDiscardDraft))

  // Compact/summarize the current session (mirrors canCompact guards in TaskHeader)
  const onCompact = () => {
    if (session.status() === "busy") return
    if (session.messages().length === 0) return
    if (!session.selected(sid())) return
    session.compact()
  }
  window.addEventListener("compactSession", onCompact)
  onCleanup(() => window.removeEventListener("compactSession", onCompact))

  const isBusy = () => isPromptBusy(session.status(), !!props.suggesting?.(), !!props.questioning?.())
  const isDisabled = () => !server.isConnected()
  const hasInput = () =>
    text().trim().length > 0 || imageAttach.images().length > 0 || files().length > 0 || reviewComments().length > 0
  const quotaBlocked = () => {
    const selection = session.selected(sid())
    const quota = session.altruBuiltinQuota()
    if (!selection || !quota || !isAltruCoderBuiltinModel(selection.providerID, selection.modelID)) return false
    if (quota.limit >= Number.MAX_SAFE_INTEGER / 2) return false
    return quota.remaining <= 0
  }
  const canSend = () =>
    hasInput() && !isDisabled() && !terminal.pending() && !git.pending() && !props.blocked?.() && !quotaBlocked()
  const showStop = () => isBusy() && !hasInput()
  const isAtEnd = () =>
    textareaRef ? atEnd(textareaRef.selectionStart, textareaRef.selectionEnd, textareaRef.value.length) : false
  const highlightMentions = () => {
    const paths = new Set(mention.mentionedPaths())
    if (hasTerminalMention(text())) paths.add("terminal")
    if (hasGit() && hasGitChangesMention(text())) paths.add("git-changes")
    return paths
  }
  const placeholder = () => {
    switch (server.connectionState()) {
      case "error":
        return language.t("prompt.placeholder.error")
      default:
        return language.t("prompt.placeholder.default")
    }
  }
  const autoApprove = () => autoApproveMode() !== "default"
  const autoApproveTitle = () => MODES.find((item) => item.mode === autoApproveMode())?.label ?? "Default"
  const chooseAutoApprove = (mode: AutoApproveMode) => {
    setAutoApproveOpen(false)
    vscode.postMessage({ type: "setAutoApproveMode", mode })
  }

  const unsubAutoApprove = vscode.onMessage((message) => {
    if (message.type === "autoApproveState") {
      setAutoApproveMode(isAutoApproveMode(message.mode) ? message.mode : message.active ? "workspace" : "default")
    }
  })

  const restoreFailed = (failed: import("../../types/messages").SendMessageFailedMessage) => {
    const target = scopeDraftKey(
      boxKey(),
      sessionDraftKey(failed.sessionID) ?? pendingDraftKey(failed.draftID) ?? "new",
    )
    if (target !== draftKey() || text().trim() || imageAttach.images().length > 0 || files().length > 0) return
    if (failed.text) {
      setText(failed.text)
      if (textareaRef) {
        textareaRef.value = failed.text
        adjustHeight()
        textareaRef.focus()
      }
    }
    const images = (failed.files ?? [])
      .filter((f) => f.mime.startsWith("image/") && f.url.startsWith("data:"))
      .map((f) => ({
        id: crypto.randomUUID(),
        filename: f.filename ?? "image",
        mime: f.mime,
        dataUrl: f.url,
      }))
    if (images.length > 0) {
      imageAttach.replace(images)
      imageDrafts.set(target, images)
    }
    const docs = (failed.files ?? [])
      .filter((f) => !f.mime.startsWith("image/") && f.url.startsWith("data:"))
      .map((f) => ({
        id: crypto.randomUUID(),
        filename: f.filename ?? "file",
        mime: f.mime,
        dataUrl: f.url,
      }))
    if (docs.length === 0) return
    setFiles(docs)
    fileDrafts.set(target, docs)
  }

  const unsubscribe = vscode.onMessage((message) => {
    if (message.type === "setChatBoxMessage") {
      setText(message.text)
      if (textareaRef) {
        textareaRef.value = message.text
        adjustHeight()
      }
    }

    if (message.type === "appendChatBoxMessage") {
      const current = text()
      const separator = current && !current.endsWith("\n") ? "\n\n" : ""
      const next = current + separator + message.text
      setText(next)
      if (textareaRef) {
        textareaRef.value = next
        adjustHeight()
        textareaRef.focus()
        textareaRef.scrollTop = textareaRef.scrollHeight
        syncHighlightScroll()
      }
    }

    if (message.type === "appendReviewComments") {
      const empty =
        !text().trim() && reviewComments().length === 0 && imageAttach.images().length === 0 && files().length === 0
      const merged = mergeReviewComments(reviewComments(), message.comments)
      replaceReviewComments(merged)
      if (message.autoSend && empty && !isDisabled() && !props.blocked?.()) {
        void handleSend()
      } else {
        textareaRef?.focus()
      }
    }

    if (message.type === "triggerTask") {
      if (isDisabled()) return
      const sel = session.selected(sid())
      session.sendMessage(message.text, sel?.providerID, sel?.modelID, undefined, undefined, ctx())
    }

    if (message.type === "sendMessageFailed") {
      restoreFailed(message as import("../../types/messages").SendMessageFailedMessage)
    }

    if (message.type === "sessionCreated" && message.draftID) {
      const target = scopeDraftKey(boxKey(), pendingDraftKey(message.draftID) ?? "new")
      const next = scopeDraftKey(boxKey(), sessionDraftKey(message.session.id) ?? "new")
      const draft = drafts.get(target)
      const pending = reviewDrafts.get(target)
      const imgs = imageDrafts.get(target)
      const docs = fileDrafts.get(target)
      if (draft !== undefined) drafts.set(next, draft)
      if (pending) reviewDrafts.set(next, pending)
      if (imgs) imageDrafts.set(next, imgs)
      if (docs) fileDrafts.set(next, docs)
      drafts.delete(target)
      reviewDrafts.delete(target)
      imageDrafts.delete(target)
      fileDrafts.delete(target)
      if (!session.currentSessionID() && (props.pendingSessionID ?? session.draftSessionID()) === message.draftID) {
        session.setDraftSessionID(message.session.id)
      }
    }

    if (message.type === "action" && message.action === "focusInput") {
      textareaRef?.focus()
    }

    if (message.type === "enhancePromptResult") {
      const result = message as import("../../types/messages").EnhancePromptResultMessage
      if (result.requestId !== enhanceRequest()) return
      setText(result.text)
      setEnhancing(false)
      setEnhanceRequest(null)
      if (textareaRef) {
        textareaRef.value = result.text
        adjustHeight()
        textareaRef.focus()
      }
    }

    if (message.type === "enhancePromptError") {
      const result = message as import("../../types/messages").EnhancePromptErrorMessage
      if (result.requestId !== enhanceRequest()) return
      setEnhancing(false)
      setEnhanceRequest(null)
      showToast({ variant: "error", title: language.t("common.requestFailed"), description: result.error })
    }
  })
  vscode.postMessage({ type: "requestAutoApproveState" })

  onCleanup(() => {
    // Persist current draft before unmounting
    saveDraft(draftKey(), text(), reviewComments(), imageAttach.images(), files())
    unsubAutoApprove()
    unsubscribe()
  })

  const acceptSuggestion = () => {
    const result = ghost.accept()
    if (!result) return

    const val = text() + result.text
    setText(val)

    if (textareaRef) {
      textareaRef.value = val
      adjustHeight()
      syncHighlightScroll()
    }
  }

  const syncGhost = () => ghost.sync(textareaRef)

  const scrollToActiveItem = () => {
    if (!dropdownRef) return
    const items = dropdownRef.querySelectorAll(".file-mention-item")
    const active = items[mention.mentionIndex()] as HTMLElement | undefined
    if (active) active.scrollIntoView({ block: "nearest" })
  }

  const scrollToActiveSlashItem = () => {
    if (!slashDropdownRef) return
    const items = slashDropdownRef.querySelectorAll(".slash-command-item")
    const active = items[slash.index()] as HTMLElement | undefined
    if (active) active.scrollIntoView({ block: "nearest" })
  }

  const syncHighlightScroll = () => {
    if (highlightRef && textareaRef) {
      highlightRef.scrollTop = textareaRef.scrollTop
    }
  }

  function adjustHeight() {
    if (!textareaRef) return
    const style = getComputedStyle(textareaRef)
    const min = Number.parseFloat(style.minHeight) || 64
    const max = Number.parseFloat(style.maxHeight) || 200
    textareaRef.style.height = "auto"
    const size = textareaRef.value ? textareaRef.scrollHeight : min
    textareaRef.style.height = `${Math.min(Math.max(size, min), max)}px`
  }

  const handlePaste = (e: ClipboardEvent) => {
    imageAttach.handlePaste(e)
    // After pasting text, the textarea content changes but the layout may not
    // have reflowed yet, causing the caret position to be visually out of sync.
    // Defer height recalculation to after the browser completes the reflow.
    requestAnimationFrame(() => {
      adjustHeight()
      syncHighlightScroll()
    })
  }

  const addFiles = async (items: File[]) => {
    if (items.length === 0) return
    const settled = await Promise.allSettled(items.map(read))
    const docs = settled.flatMap((item) => (item.status === "fulfilled" ? [item.value] : []))
    if (docs.length > 0) setFiles((prev) => [...prev, ...docs])
    const failed = settled.find((item) => item.status === "rejected")
    if (!failed || failed.status !== "rejected") return
    const reason = failed.reason instanceof Error ? failed.reason.message : String(failed.reason)
    showToast({ variant: "error", title: "Failed to attach file", description: reason })
  }

  const handleImageSelect = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    const items = Array.from(target.files ?? [])
    for (const item of items) imageAttach.add(item)
    target.value = ""
    setAttachOpen(false)
    textareaRef?.focus()
  }

  const handleFileSelect = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    const items = Array.from(target.files ?? [])
    target.value = ""
    setAttachOpen(false)
    void addFiles(items)
    textareaRef?.focus()
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const toggleAttach = () => {
    if (isDisabled()) return
    setAttachOpen(!attachOpen())
  }

  const pickImages = () => {
    setAttachOpen(false)
    imageInputRef?.click()
  }

  const pickFiles = () => {
    setAttachOpen(false)
    fileInputRef?.click()
  }

  const handleInput = (e: InputEvent) => {
    const target = e.target as HTMLTextAreaElement
    const val = target.value
    setText(val)
    if (enhancing()) {
      setEnhancing(false)
      setEnhanceRequest(null)
    }
    preEnhanceText = null
    adjustHeight()
    syncHighlightScroll()
    history.reset()

    slash.onInput(val, target.selectionStart ?? val.length)
    mention.onInput(val, target.selectionStart ?? val.length)
    ghost.setMentionOpen(slash.show() || mention.showMention())
    ghost.scheduleRequest(val, textareaRef)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    // Undo enhanced prompt with Ctrl+Z / ⌘Z
    if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey && preEnhanceText !== null) {
      e.preventDefault()
      const restored = preEnhanceText
      preEnhanceText = null
      setText(restored)
      if (textareaRef) {
        textareaRef.value = restored
        adjustHeight()
      }
      return
    }

    if (slash.onKeyDown(e, textareaRef, setText, adjustHeight)) {
      ghost.setMentionOpen(slash.show())
      queueMicrotask(scrollToActiveSlashItem)
      return
    }

    if (mention.onKeyDown(e, textareaRef, setText, adjustHeight)) {
      ghost.setMentionOpen(mention.showMention())
      queueMicrotask(scrollToActiveItem)
      return
    }

    // Prompt history: ArrowUp/ArrowDown at cursor boundaries cycles through sent prompts
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const start = textareaRef?.selectionStart ?? 0
      const end = textareaRef?.selectionEnd ?? 0
      if (start !== end) return // don't replace active text selection
      const cursor = start
      const direction = e.key === "ArrowUp" ? ("up" as const) : ("down" as const)
      const entry = history.navigate(direction, text(), cursor)
      if (entry !== null) {
        e.preventDefault()
        setText(entry)
        if (textareaRef) {
          textareaRef.value = entry
          adjustHeight()
          const pos = direction === "up" ? 0 : entry.length
          textareaRef.setSelectionRange(pos, pos)
        }
        return
      }
    }

    if (e.key === "Tab" && ghost.text()) {
      if (!isAtEnd()) return
      e.preventDefault()
      acceptSuggestion()
      return
    }
    if (e.key === "ArrowRight" && ghost.text()) {
      if (!isAtEnd()) return
      e.preventDefault()
      acceptSuggestion()
      return
    }
    if (e.key === "Escape" && ghost.text()) {
      e.preventDefault()
      e.stopPropagation()
      ghost.dismiss()
      return
    }
    if (e.key === "Escape" && attachOpen()) {
      e.preventDefault()
      e.stopPropagation()
      setAttachOpen(false)
      return
    }
    if (e.key === "Escape" && isBusy()) {
      e.preventDefault()
      e.stopPropagation()
      session.abort()
      return
    }
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const canEnhance = () => server.isConnected() && !isBusy() && !isDisabled() && !enhancing()

  const handleOpenIndexingSettings = () => {
    vscode.postMessage({ type: "openSettingsTab", tab: "indexing" })
  }

  const handleEnhance = () => {
    if (!server.isConnected() || isDisabled() || enhancing() || isBusy()) return
    const draft = text().trim()
    if (!draft) {
      const description = language.t("prompt.action.enhanceDescription")
      setText(description)
      if (textareaRef) {
        textareaRef.value = description
        adjustHeight()
        textareaRef.focus()
      }
      return
    }
    preEnhanceText = text()
    enhanceCounter++
    const sel = session.selected(sid())
    const requestId = `enhance-${draftKey()}-${enhanceCounter}`
    setEnhancing(true)
    setEnhanceRequest(requestId)
    vscode.postMessage({
      type: "enhancePrompt",
      text: draft,
      requestId,
      providerID: sel?.providerID,
      modelID: sel?.modelID,
    })
  }

  const handleSend = async () => {
    const draft = text().trim()

    // Detect slash command (hoisted for both client and server command checks).
    // Prioritize exact name matches over hint/alias matches so that a server
    // command named e.g. "continue" is not hijacked by a client alias.
    const cmdMatch = draft.match(/^\/(\S+)/)
    const word = cmdMatch?.[1]
    const matched = word
      ? (slash.commands().find((c) => c.name === word) ?? slash.commands().find((c) => c.hints.includes(word)))
      : undefined

    // Client-side slash command — runs locally without a backend round-trip
    if (matched?.action) {
      setText("")
      clearReviewComments()
      imageAttach.clear()
      setFiles([])
      mention.closeMention()
      slash.close()
      drafts.delete(draftKey())
      reviewDrafts.delete(draftKey())
      imageDrafts.delete(draftKey())
      fileDrafts.delete(draftKey())
      if (textareaRef) textareaRef.style.height = "auto"
      matched.action()
      return
    }

    const imgs = imageAttach.images()
    const docs = files()
    const pending = reviewComments()
    const review = pending.length > 0 ? formatReviewCommentsMarkdown(pending) : ""
    const message = draft && review ? `${review}\n\n${draft}` : draft || review
    if (
      (!message && imgs.length === 0 && docs.length === 0) ||
      isDisabled() ||
      terminal.pending() ||
      git.pending() ||
      props.blocked?.() ||
      quotaBlocked()
    )
      return

    const mentionFiles = mention.parseFileAttachments(draft)
    const imgFiles = imgs.map((img) => ({ mime: img.mime, url: img.dataUrl, filename: img.filename }))
    const docFiles = docs.map((file) => ({ mime: file.mime, url: file.dataUrl, filename: file.filename }))
    const pendingId = props.pendingSessionID ?? session.draftSessionID()
    const id = sid()
    const sel = session.selected(id)

    const terminalFile = await terminal.resolveAttachment(message, id).catch((err: Error) => {
      showToast({ variant: "error", title: "Terminal context unavailable", description: err.message })
      return undefined
    })
    if (hasTerminalMention(message) && !terminalFile) return

    const gitFile = await git.resolveAttachment(message, id).catch((err: Error) => {
      showToast({ variant: "error", title: "Git changes unavailable", description: err.message })
      return undefined
    })
    if (hasGit() && hasGitChangesMention(message) && !gitFile) return

    const allFiles = [
      ...mentionFiles,
      ...imgFiles,
      ...docFiles,
      ...(terminalFile ? [terminalFile] : []),
      ...(gitFile ? [gitFile] : []),
    ]
    const attachments = allFiles.length > 0 ? allFiles : undefined

    const key = draftKey()
    // Server-side slash command (cmdMatch/matched already computed above)
    if (matched) {
      const rest = draft.slice(cmdMatch![0].length).trim()
      const args = review && rest ? `${review}\n\n${rest}` : rest || review
      session.sendCommand(matched.name, args, sel?.providerID, sel?.modelID, attachments, pendingId, ctx())
    } else {
      session.sendMessage(message, sel?.providerID, sel?.modelID, attachments, pendingId, ctx())
    }

    history.append(draft)
    history.reset()
    setText("")
    clearReviewComments()
    imageAttach.clear()
    setFiles([])
    mention.closeMention()
    slash.close()
    drafts.delete(key)
    reviewDrafts.delete(key)
    imageDrafts.delete(key)
    fileDrafts.delete(key)

    if (textareaRef) textareaRef.style.height = "auto"
  }

  return (
    <div
      class="prompt-input-container"
      classList={{ "prompt-input-container--dragging": imageAttach.dragging() }}
      onDragOver={imageAttach.handleDragOver}
      onDragLeave={imageAttach.handleDragLeave}
      onDrop={imageAttach.handleDrop}
    >
      <input
        ref={imageInputRef}
        class="prompt-attachment-input"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        onChange={handleImageSelect}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={fileInputRef}
        class="prompt-attachment-input"
        type="file"
        multiple
        onChange={handleFileSelect}
        aria-hidden="true"
        tabIndex={-1}
      />
      <Show when={reviewComments().length > 0}>
        <div class="prompt-review-comments">
          <div class="prompt-review-comments-header">
            <span class="prompt-review-comments-title">
              {language.t("agentManager.review.inlineCount", { count: reviewComments().length })}
            </span>
            <Button variant="ghost" size="small" onClick={clearReviewComments}>
              {language.t("agentManager.review.clearAll")}
            </Button>
          </div>
          <div class="prompt-review-chip-list">
            <For each={reviewComments()}>
              {(item) => (
                <div class="prompt-review-chip">
                  <button type="button" class="prompt-review-chip-body" onClick={() => showReviewCommentDialog(item)}>
                    <span class="prompt-review-chip-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                          d="M3.2 11.8l-.6 2.5 2.3-1.2h6.1A2.8 2.8 0 0013.8 10V5A2.8 2.8 0 0011 2.2H5A2.8 2.8 0 002.2 5v5a2.8 2.8 0 001 2.2z"
                          stroke="currentColor"
                          stroke-width="1.4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                    <span class="prompt-review-chip-copy">
                      <span class="prompt-review-chip-main">
                        <span class="prompt-review-chip-title">{fileName(item.file)}</span>
                        <span class="prompt-review-chip-line">
                          {side(item)}
                          {item.line}
                        </span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    class="prompt-review-chip-remove"
                    onClick={() => removeReviewComment(item.id)}
                    aria-label={language.t("common.delete")}
                  >
                    ×
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
      <Show when={mention.showMention()}>
        <div class="file-mention-dropdown" ref={dropdownRef}>
          <Show
            when={mention.mentionResults().length > 0}
            fallback={<div class="file-mention-empty">No files or folders found</div>}
          >
            <For each={mention.mentionResults()}>
              {(item, index) => (
                <div
                  class="file-mention-item"
                  classList={{ "file-mention-item--active": index() === mention.mentionIndex() }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (textareaRef) mention.selectMention(item, textareaRef, setText, adjustHeight)
                  }}
                  onMouseEnter={() => mention.setMentionIndex(index())}
                >
                  {item.type === "terminal" ? (
                    <>
                      <Icon name="console" class="file-mention-icon" />
                      <span class="file-mention-name">{item.label}</span>
                      <span class="file-mention-dir">{item.description}</span>
                    </>
                  ) : item.type === "git-changes" ? (
                    <>
                      <Icon name="branch" class="file-mention-icon" />
                      <span class="file-mention-name">{item.label}</span>
                      <span class="file-mention-dir">{item.description}</span>
                    </>
                  ) : (
                    <>
                      <FileIcon
                        node={{ path: item.value, type: item.type === "folder" ? "directory" : "file" }}
                        class="file-mention-icon"
                      />
                      <span class="file-mention-name">
                        {item.type === "folder" ? `${fileName(item.value)}/` : fileName(item.value)}
                      </span>
                      <span class="file-mention-dir">{dirName(item.value)}</span>
                    </>
                  )}
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
      <Show when={slash.show()}>
        <div class="slash-command-dropdown" ref={slashDropdownRef}>
          <Show when={slash.results().length > 0} fallback={<div class="slash-command-empty">No commands found</div>}>
            {(() => {
              const all = slash.results()
              const actions = all.filter((c) => c.action)
              const server = all.filter((c) => !c.action)
              const offset = actions.length
              return (
                <>
                  <Show when={actions.length > 0}>
                    <div class="slash-command-group-label">Actions</div>
                    <For each={actions}>
                      {(cmd, idx) => (
                        <div
                          class="slash-command-item"
                          classList={{ "slash-command-item--active": idx() === slash.index() }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            if (textareaRef) slash.select(cmd, textareaRef, setText, adjustHeight)
                          }}
                          onMouseEnter={() => slash.setIndex(idx())}
                        >
                          <span class="slash-command-name">/{cmd.name}</span>
                          <Show when={cmd.description}>
                            <span class="slash-command-desc">{cmd.description}</span>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                  <Show when={server.length > 0}>
                    <Show when={actions.length > 0}>
                      <div class="slash-command-separator" />
                    </Show>
                    <div class="slash-command-group-label">Commands</div>
                    <For each={server}>
                      {(cmd, idx) => (
                        <div
                          class="slash-command-item"
                          classList={{ "slash-command-item--active": idx() + offset === slash.index() }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            if (textareaRef) slash.select(cmd, textareaRef, setText, adjustHeight)
                          }}
                          onMouseEnter={() => slash.setIndex(idx() + offset)}
                        >
                          <span class="slash-command-name">/{cmd.name}</span>
                          <Show when={cmd.description}>
                            <span class="slash-command-desc">{cmd.description}</span>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </>
              )
            })()}
          </Show>
        </div>
      </Show>
      <Show when={imageAttach.images().length > 0 || files().length > 0}>
        <div class="prompt-attachments">
          <For each={imageAttach.images()}>
            {(img) => (
              <div class="prompt-image-attachment">
                <img
                  src={img.dataUrl}
                  alt={img.filename}
                  title={img.filename}
                  onClick={() =>
                    vscode.postMessage({ type: "previewImage", dataUrl: img.dataUrl, filename: img.filename })
                  }
                />
                <button
                  type="button"
                  class="image-attachment-remove"
                  onClick={() => imageAttach.remove(img.id)}
                  aria-label={language.t("prompt.attachment.remove")}
                >
                  x
                </button>
              </div>
            )}
          </For>
          <For each={files()}>
            {(file) => (
              <div class="prompt-file-attachment" title={file.filename}>
                <FileIcon node={{ path: file.filename, type: "file" }} />
                <span class="prompt-file-attachment-name">{file.filename}</span>
                <button
                  type="button"
                  class="prompt-file-attachment-remove"
                  onClick={() => removeFile(file.id)}
                  aria-label={language.t("prompt.attachment.remove")}
                >
                  x
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class="prompt-input-wrapper">
        <div class="prompt-attach-menu" ref={attachRef}>
          <Tooltip value={language.t("prompt.action.attach")} placement="top">
            <Button
              variant="ghost"
              size="small"
              class="prompt-attach-button"
              onClick={toggleAttach}
              aria-disabled={isDisabled()}
              aria-label={language.t("prompt.action.attach")}
              aria-haspopup="menu"
              aria-expanded={attachOpen()}
            >
              <Icon name="paperclip" size="small" />
            </Button>
          </Tooltip>
          <Show when={attachOpen()}>
            <div class="prompt-attach-popover" role="menu">
              <button
                type="button"
                role="menuitem"
                class="prompt-attach-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={pickImages}
              >
                <Icon name="photo" size="small" />
                <span>{language.t("prompt.action.attachImage")}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                class="prompt-attach-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={pickFiles}
              >
                <Icon name="folder" size="small" />
                <span>{language.t("prompt.action.attachFiles")}</span>
              </button>
            </div>
          </Show>
        </div>
        <div class="prompt-input-ghost-wrapper">
          <div class="prompt-input-highlight-overlay" ref={highlightRef} aria-hidden="true">
            <Index each={buildHighlightSegments(text(), highlightMentions())}>
              {(seg) => (
                <Show when={seg().highlight} fallback={<span>{seg().text}</span>}>
                  <span class="prompt-input-file-mention">{seg().text}</span>
                </Show>
              )}
            </Index>
            <Show when={ghost.text()}>
              <span class="prompt-input-ghost-text">{ghost.text()}</span>
            </Show>
          </div>
          <textarea
            ref={textareaRef}
            class="prompt-input"
            classList={{ "prompt-input--disabled": isDisabled() }}
            placeholder={placeholder()}
            value={text()}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={syncGhost}
            onPaste={handlePaste}
            onClick={syncGhost}
            onFocus={syncGhost}
            onBlur={syncGhost}
            onSelect={syncGhost}
            onScroll={syncHighlightScroll}
            aria-disabled={isDisabled()}
            rows={1}
          />
        </div>
      </div>
      <div class="prompt-input-hint">
        <div class="prompt-input-hint-selectors">
          <ModeSwitcher sessionID={sid} />
          <ModelSelector sessionID={sid} />
          <AltruBuiltinQuotaIndicator sessionID={sid} />
          <ThinkingSelector sessionID={sid} />
        </div>
        <div class="prompt-input-hint-actions">
          <Show when={features().indexing}>
            <Tooltip value={indexing.status().message || indexing.label()} placement="top">
              <Button
                variant="ghost"
                size="small"
                onClick={handleOpenIndexingSettings}
                aria-label={language.t("prompt.action.indexing")}
                class={`prompt-indexing-button prompt-indexing-button--${indexing.tone()}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <ellipse cx="8" cy="3.5" rx="4.5" ry="2" stroke="currentColor" stroke-width="1.2" />
                  <path
                    d="M3.5 3.5V12.5C3.5 13.6046 5.51472 14.5 8 14.5C10.4853 14.5 12.5 13.6046 12.5 12.5V3.5"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <path
                    d="M3.5 8C3.5 9.10457 5.51472 10 8 10C10.4853 10 12.5 9.10457 12.5 8"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <circle cx="13" cy="3" r="2.5" fill="currentColor" />
                </svg>
              </Button>
            </Tooltip>
          </Show>
          <div class="prompt-auto-approve-menu" ref={autoApproveRef}>
            <Tooltip value={`Auto approve: ${autoApproveTitle()}`} placement="top">
              <Button
                variant="ghost"
                size="small"
                onClick={() => setAutoApproveOpen(!autoApproveOpen())}
                aria-label={`Auto approve: ${autoApproveTitle()}`}
                aria-haspopup="menu"
                aria-expanded={autoApproveOpen()}
                aria-pressed={autoApprove()}
                class={`prompt-auto-approve-button prompt-auto-approve-button--${autoApproveMode()}`}
              >
                <Icon name="shield" size="small" />
              </Button>
            </Tooltip>
            <Show when={autoApproveOpen()}>
              <div class="prompt-auto-approve-popover" role="menu">
                <For each={MODES}>
                  {(item) => (
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={autoApproveMode() === item.mode}
                      data-active={autoApproveMode() === item.mode ? "true" : undefined}
                      class="prompt-auto-approve-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseAutoApprove(item.mode)}
                    >
                      <span class="prompt-auto-approve-option-title">{item.label}</span>
                      <span class="prompt-auto-approve-option-description">{item.description}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
          <Tooltip value={language.t("prompt.action.enhance")} placement="top">
            <Button
              variant="ghost"
              size="small"
              onClick={handleEnhance}
              aria-disabled={!canEnhance()}
              aria-label={language.t("prompt.action.enhance")}
            >
              <WandSparkles size={16} class={enhancing() ? "enhance-spinner" : ""} />
            </Button>
          </Tooltip>
          <Show
            when={showStop()}
            fallback={
              <Tooltip
                value={
                  quotaBlocked()
                    ? "Altru built-in model token limit reached"
                    : props.blocked?.()
                      ? language.t("prompt.action.send.blocked")
                      : language.t("prompt.action.send")
                }
                placement="top"
              >
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => void handleSend()}
                  aria-disabled={!canSend()}
                  aria-label={language.t("prompt.action.send")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.5 1.5L14.5 8L1.5 14.5V9L10 8L1.5 7V1.5Z" />
                  </svg>
                </Button>
              </Tooltip>
            }
          >
            <Tooltip value={language.t("prompt.action.stop")} placement="top">
              <Button
                variant="ghost"
                size="small"
                onClick={() => session.abort()}
                aria-label={language.t("prompt.action.stop")}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="3" width="10" height="10" rx="1" />
                </svg>
              </Button>
            </Tooltip>
          </Show>
        </div>
      </div>
    </div>
  )
}
