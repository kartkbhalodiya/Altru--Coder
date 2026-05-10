import type { AutoApproveController, AutoApproveMode } from "../commands/toggle-auto-approve"

export type { AutoApproveController }

type Interceptor = (msg: Record<string, unknown>) => Promise<Record<string, unknown> | null>

export function createAutoApproveBridge(
  ctrl: AutoApproveController,
  post: (msg: unknown) => void,
  next?: Interceptor | null,
) {
  const send = () => post({ type: "autoApproveState", active: ctrl.active(), mode: ctrl.mode() })
  const sub = ctrl.onChange(send)
  return {
    dispose: () => sub.dispose(),
    async handle(msg: Record<string, unknown>) {
      if (msg.type === "toggleAutoApprove") return (await ctrl.toggle(), null)
      if (msg.type === "setAutoApproveMode" && isMode(msg.mode)) return (await ctrl.setMode(msg.mode), null)
      if (msg.type === "requestAutoApproveState") return (send(), null)
      if (msg.type === "webviewReady") send()
      return next ? next(msg) : msg
    },
  }
}

function isMode(value: unknown): value is AutoApproveMode {
  return value === "default" || value === "workspace" || value === "bypass"
}
