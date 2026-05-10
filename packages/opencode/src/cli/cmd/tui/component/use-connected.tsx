import { createMemo } from "solid-js"
import { useSync } from "@tui/context/sync"

export function useConnected() {
  const sync = useSync()
  // altrucoder_change - exclude "altru-coder" (anonymous autoload) alongside "opencode"
  return createMemo(() =>
    sync.data.provider.some(
      (x) =>
        (x.id !== "opencode" && x.id !== "altru-coder") || Object.values(x.models).some((y) => y.cost?.input !== 0),
    ),
  )
}
