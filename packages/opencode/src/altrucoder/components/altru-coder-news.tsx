/**
 * Altru Coder News Component
 *
 * Self-contained component that fetches and displays Altru Coder news/notifications.
 * Shows a banner on the home screen; clicking opens a dialog with all news items.
 */

import { createEffect, createMemo, createSignal, on, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { useDialog } from "@tui/ui/dialog"
import type { AltruCoderNotification } from "@altru-coder/altru-coder-gateway"
import { NotificationBanner } from "./notification-banner.js"
import { DialogAltruCoderNotifications } from "./dialog-altru-coder-notifications.js"

export function AltruCoderNews() {
  const sync = useSync()
  const sdk = useSDK()
  const dialog = useDialog()

  const [notifications, setNotifications] = createSignal<AltruCoderNotification[]>([])
  const [fetched, setFetched] = createSignal(false)
  const isAltruCoderConnected = createMemo(() => sync.data.provider_next.connected.includes("altru-coder"))

  const openNewsDialog = () => {
    const items = notifications()
    if (items.length > 0) {
      dialog.replace(() => <DialogAltruCoderNotifications notifications={items} />)
    }
  }

  // Reactively wait for sync to complete, then fetch notifications once
  createEffect(
    on(
      () => sync.status,
      async (status) => {
        if (status !== "complete") return
        if (fetched()) return
        setFetched(true)

        if (!isAltruCoderConnected()) return

        const result = await sdk.client.altruCoder.notifications()
        const items = result.data?.filter(({ showIn }) => !showIn || showIn.includes("cli"))
        if (items && items.length > 0) {
          setNotifications(items)
        }
      },
    ),
  )

  // Always render the container to reserve layout space and prevent shift.
  // The banner content appears once notifications are loaded; the fixed-height
  // placeholder keeps the surrounding elements stable during the async fetch.
  return (
    <Show when={notifications().length > 0} fallback={<box height={3} />}>
      <NotificationBanner
        notification={notifications()[0]}
        totalCount={notifications().length}
        onClick={openNewsDialog}
      />
    </Show>
  )
}
