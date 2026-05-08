import * as vscode from "vscode"

export class AltruCoderActionProvider implements vscode.CodeActionProvider {
  static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.RefactorRewrite],
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    if (range.isEmpty) return []

    const actions: vscode.CodeAction[] = []

    const add = new vscode.CodeAction("Add to Altru Coder", vscode.CodeActionKind.RefactorRewrite)
    add.command = { command: "altru-coder.new.addToContext", title: "Add to Altru Coder" }
    actions.push(add)

    const hasDiagnostics = context.diagnostics.length > 0

    if (hasDiagnostics) {
      const fix = new vscode.CodeAction("Fix with Altru Coder", vscode.CodeActionKind.QuickFix)
      fix.command = { command: "altru-coder.new.fixCode", title: "Fix with Altru Coder" }
      fix.isPreferred = true
      actions.push(fix)
    }

    if (!hasDiagnostics) {
      const explain = new vscode.CodeAction("Explain with Altru Coder", vscode.CodeActionKind.RefactorRewrite)
      explain.command = { command: "altru-coder.new.explainCode", title: "Explain with Altru Coder" }
      actions.push(explain)

      const improve = new vscode.CodeAction("Improve with Altru Coder", vscode.CodeActionKind.RefactorRewrite)
      improve.command = { command: "altru-coder.new.improveCode", title: "Improve with Altru Coder" }
      actions.push(improve)
    }

    return actions
  }
}
