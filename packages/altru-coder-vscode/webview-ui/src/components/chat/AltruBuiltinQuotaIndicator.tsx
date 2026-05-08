import { Show, createMemo } from "solid-js"
import type { Component, Accessor } from "solid-js"
import { Tooltip } from "@altru-coder/altru-coder-ui/tooltip"
import { useSession } from "../../context/session"
import { useLanguage } from "../../context/language"
import { isAltruCoderBuiltinModel } from "../../../../src/shared/provider-model"

function fmt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(value)
}

export const AltruBuiltinQuotaIndicator: Component<{ sessionID?: Accessor<string | undefined> }> = (props) => {
  const session = useSession()
  const language = useLanguage()

  const data = createMemo(() => {
    const selection = session.selected(props.sessionID?.())
    const quota = session.altruBuiltinQuota()
    if (!selection || !quota || !isAltruCoderBuiltinModel(selection.providerID, selection.modelID)) return undefined

    const pct = quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0
    const reset = new Date(quota.resetAt).toLocaleString(language.locale())
    return {
      pct,
      reset,
      used: fmt(quota.used),
      limit: fmt(quota.limit),
      remaining: fmt(quota.remaining),
    }
  })

  const tip = createMemo(() => {
    const item = data()
    if (!item) return ""
    return `${item.used} / ${item.limit} built-in tokens used\n${item.remaining} remaining\nRefreshes ${item.reset}`
  })

  return (
    <Show when={data()}>
      {(item) => (
        <Tooltip value={tip()} placement="top">
          <div
            class="altru-builtin-quota"
            classList={{ "altru-builtin-quota--hot": item().pct >= 90 }}
            style={{ "--quota-pct": `${item().pct}%` }}
            aria-label={tip()}
          >
            <span class="altru-builtin-quota-ring" aria-hidden="true" />
            <span class="altru-builtin-quota-label">{item().used}</span>
          </div>
        </Tooltip>
      )}
    </Show>
  )
}
