import * as vscode from "vscode"
import { buildWebviewHtml } from "../utils"

export function providerWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, port?: number): string {
  return buildWebviewHtml(webview, {
    scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview.js")),
    styleUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview.css")),
    iconsBaseUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "assets", "icons")),
    title: "Altru Coder",
    port,
    extraStyles: `.container { height: 100%; display: flex; flex-direction: column; height: 100vh; border-right: 1px solid var(--border-weak-base); }`,
  })
}
