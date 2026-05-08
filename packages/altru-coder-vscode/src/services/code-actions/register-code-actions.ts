import * as vscode from "vscode"
import type { AltruCoderProvider } from "../../AltruCoderProvider"
import type { AgentManagerProvider } from "../../agent-manager/AgentManagerProvider"
import { getEditorContext } from "./editor-utils"
import { createPrompt } from "./support-prompt"

export function registerCodeActions(
  context: vscode.ExtensionContext,
  provider: AltruCoderProvider,
  agentManager?: AgentManagerProvider,
): void {
  const target = () => (agentManager?.isActive() ? agentManager : provider)

  context.subscriptions.push(
    vscode.commands.registerCommand("altru-coder.new.explainCode", () => {
      const ctx = getEditorContext()
      if (!ctx) return
      const prompt = createPrompt("EXPLAIN", {
        filePath: ctx.filePath,
        startLine: String(ctx.startLine),
        endLine: String(ctx.endLine),
        selectedText: ctx.selectedText,
        userInput: "",
      })
      provider.postMessage({ type: "triggerTask", text: prompt })
    }),

    vscode.commands.registerCommand("altru-coder.new.fixCode", () => {
      const ctx = getEditorContext()
      if (!ctx) return
      const prompt = createPrompt("FIX", {
        filePath: ctx.filePath,
        startLine: String(ctx.startLine),
        endLine: String(ctx.endLine),
        selectedText: ctx.selectedText,
        diagnostics: ctx.diagnostics,
        userInput: "",
      })
      provider.postMessage({ type: "triggerTask", text: prompt })
    }),

    vscode.commands.registerCommand("altru-coder.new.improveCode", () => {
      const ctx = getEditorContext()
      if (!ctx) return
      const prompt = createPrompt("IMPROVE", {
        filePath: ctx.filePath,
        startLine: String(ctx.startLine),
        endLine: String(ctx.endLine),
        selectedText: ctx.selectedText,
        userInput: "",
      })
      provider.postMessage({ type: "triggerTask", text: prompt })
    }),

    vscode.commands.registerCommand("altru-coder.new.addToContext", () => {
      const ctx = getEditorContext()
      if (!ctx) return
      const prompt = createPrompt("ADD_TO_CONTEXT", {
        filePath: ctx.filePath,
        startLine: String(ctx.startLine),
        endLine: String(ctx.endLine),
        selectedText: ctx.selectedText,
      })
      target().postMessage({ type: "appendChatBoxMessage", text: prompt })
    }),

    vscode.commands.registerCommand("altru-coder.new.focusChatInput", () => {
      target().postMessage({ type: "action", action: "focusInput" })
    }),
  )
}
