import { Component, Show, createEffect, createMemo, createSignal } from "solid-js"
import { useNotifications } from "../../context/notifications"
import { useVSCode } from "../../context/vscode"
import { useSession } from "../../context/session"
import { useProvider } from "../../context/provider"
import { useLanguage } from "../../context/language"
import { ALTRU_CODER_PROVIDER_ID } from "../../../../src/shared/provider-model"
import { TelemetryEventName } from "../../../../src/services/telemetry/types"
import { stripSubProviderPrefix } from "../shared/model-selector-utils"

export const AltruCoderNotifications: Component = () => {
  const { filteredNotifications, dismiss } = useNotifications()
  const vscode = useVSCode()
  const session = useSession()
  const provider = useProvider()
  const language = useLanguage()
  const [index, setIndex] = createSignal(0)

  const items = filteredNotifications
  const total = () => items().length
  const safeIndex = () => Math.min(index(), Math.max(0, total() - 1))
  const current = createMemo(() => (total() === 0 ? undefined : items()[safeIndex()]))

  // Clamp index whenever the list shrinks so navigation always reflects reality
  createEffect(() => {
    const max = Math.max(0, total() - 1)
    if (index() > max) setIndex(max)
  })

  const handleAction = (url: string) => {
    vscode.postMessage({ type: "openExternal", url })
  }

  const isLast = () => safeIndex() === total() - 1

  const handleNext = () => {
    if (isLast()) {
      for (const n of items()) dismiss(n.id)
    } else {
      setIndex(safeIndex() + 1)
    }
  }

  /**
   * Resolve suggestModelId to a altru-coder-provider model selection.
   * Only the altru-coder provider is supported — the model must be present in the
   * catalog and reachable (isModelValid) before the button is shown.
   */
  const suggestedModel = createMemo(() => {
    const id = current()?.suggestModelId
    if (!id) return undefined
    const sel = { providerID: ALTRU_CODER_PROVIDER_ID, modelID: id }
    if (!provider.isModelValid(sel)) return undefined
    return sel
  })

  const canSwitchModel = createMemo(() => {
    const suggestion = suggestedModel()
    if (!suggestion) return false
    const sel = session.selected()
    if (sel && sel.providerID === suggestion.providerID && sel.modelID === suggestion.modelID) return false
    return true
  })

  const MAX_NAME = 30

  const suggestedName = createMemo(() => {
    const suggestion = suggestedModel()
    if (!suggestion) return undefined
    const model = provider.findModel(suggestion)
    if (!model?.name) return undefined
    const name = stripSubProviderPrefix(model.name)
    if (name.length > MAX_NAME) return undefined
    return name
  })

  const handleTryModel = () => {
    const suggestion = suggestedModel()
    if (!suggestion) return
    session.selectModel(suggestion.providerID, suggestion.modelID)
    vscode.postMessage({
      type: "telemetry",
      event: TelemetryEventName.NOTIFICATION_CLICKED,
      properties: { actionText: "Try model", suggestModelId: current()?.suggestModelId },
    })
  }

  return (
    <Show when={total() > 0}>
      <div class="altru-coder-notifications">
        <div class="altru-coder-notifications-card">
          <div class="altru-coder-notifications-header">
            <span class="altru-coder-notifications-title">{current()?.title}</span>
            <Show when={total() > 1}>
              <span class="altru-coder-notifications-nav-count">
                {safeIndex() + 1} / {total()}
              </span>
            </Show>
          </div>
          <p class="altru-coder-notifications-message">{current()?.message}</p>
          <div class="altru-coder-notifications-footer">
            <div class="altru-coder-notifications-cta-group">
              <Show when={canSwitchModel()}>
                <button class="altru-coder-notifications-action-btn" onClick={handleTryModel}>
                  {suggestedName()
                    ? language.t("notifications.action.tryModel", { model: suggestedName()! })
                    : language.t("notifications.action.tryModelGeneric")}
                </button>
              </Show>
              <Show when={current()?.action}>
                {(action) => (
                  <button class="altru-coder-notifications-action-btn" onClick={() => handleAction(action().actionURL)}>
                    {action().actionText}
                  </button>
                )}
              </Show>
            </div>
            <div class="altru-coder-notifications-next-group">
              <Show when={safeIndex() > 0}>
                <button class="altru-coder-notifications-back-link" onClick={() => setIndex(safeIndex() - 1)}>
                  {language.t("common.goBack")}
                </button>
              </Show>
              <button class="altru-coder-notifications-primary-btn" onClick={handleNext}>
                {isLast() ? language.t("notifications.action.close") : language.t("notifications.action.next")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}
