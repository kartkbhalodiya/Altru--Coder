import type {
  AuthorizeProviderOAuthMessage,
  CompleteProviderOAuthMessage,
  ConnectProviderMessage,
  DisconnectProviderMessage,
  ExtensionMessage,
  ProviderActionErrorMessage,
  ProviderConnectedMessage,
  ProviderDisconnectedMessage,
  ProviderOAuthReadyMessage,
  SaveCustomProviderMessage,
  WebviewMessage,
} from "../types/messages"

type ProviderRequest =
  | ConnectProviderMessage
  | AuthorizeProviderOAuthMessage
  | CompleteProviderOAuthMessage
  | DisconnectProviderMessage
  | SaveCustomProviderMessage

type ProviderRequestInput =
  | Omit<ConnectProviderMessage, "requestId">
  | Omit<AuthorizeProviderOAuthMessage, "requestId">
  | Omit<CompleteProviderOAuthMessage, "requestId">
  | Omit<DisconnectProviderMessage, "requestId">
  | Omit<SaveCustomProviderMessage, "requestId">

type Transport = {
  postMessage: (message: WebviewMessage) => void
  onMessage: (handler: (message: ExtensionMessage) => void) => () => void
}

type Handlers = {
  onOAuthReady?: (message: ProviderOAuthReadyMessage) => void
  onConnected?: (message: ProviderConnectedMessage) => void
  onDisconnected?: (message: ProviderDisconnectedMessage) => void
  onError?: (message: ProviderActionErrorMessage) => void
}

type Pending = {
  handlers: Handlers
  timer: ReturnType<typeof setTimeout>
}

const TIMEOUT_MS = 30000

function error(message: ProviderRequestInput, requestId: string): ProviderActionErrorMessage {
  const action =
    message.type === "disconnectProvider"
      ? "disconnect"
      : message.type === "authorizeProviderOAuth"
        ? "authorize"
        : "connect"
  return {
    type: "providerActionError",
    requestId,
    providerID: message.providerID,
    action,
    message: "Provider action timed out",
  }
}

export function createProviderAction(vscode: Transport, timeout = TIMEOUT_MS) {
  const pending = new Map<string, Pending>()
  const unsubscribe = vscode.onMessage((message) => {
    if (!("requestId" in message)) return

    const item = pending.get(message.requestId)
    if (!item) return
    pending.delete(message.requestId)
    clearTimeout(item.timer)

    if (message.type === "providerOAuthReady") {
      item.handlers.onOAuthReady?.(message)
      return
    }

    if (message.type === "providerConnected") {
      item.handlers.onConnected?.(message)
      return
    }

    if (message.type === "providerDisconnected") {
      item.handlers.onDisconnected?.(message)
      return
    }

    if (message.type === "providerActionError") {
      item.handlers.onError?.(message)
    }
  })

  function send(message: ProviderRequestInput, handlers: Handlers = {}) {
    const requestId = crypto.randomUUID()
    const timer = setTimeout(() => {
      const item = pending.get(requestId)
      if (!item) return
      pending.delete(requestId)
      item.handlers.onError?.(error(message, requestId))
    }, timeout)
    pending.set(requestId, { handlers, timer })
    vscode.postMessage({ ...message, requestId } as ProviderRequest)
    return requestId
  }

  function clear(requestId?: string) {
    if (requestId) {
      const item = pending.get(requestId)
      if (item) clearTimeout(item.timer)
      pending.delete(requestId)
      return
    }
    for (const item of pending.values()) clearTimeout(item.timer)
    pending.clear()
  }

  function dispose() {
    clear()
    unsubscribe()
  }

  return { clear, send, dispose }
}
