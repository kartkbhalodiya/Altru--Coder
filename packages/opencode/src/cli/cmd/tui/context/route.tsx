import { createStore, reconcile, unwrap } from "solid-js/store" // altrucoder_change
import { createSimpleContext } from "./helper"
import type { PromptInfo } from "../component/prompt/history"

export type HomeRoute = {
  type: "home"
  prompt?: PromptInfo
}

export type SessionRoute = {
  type: "session"
  sessionID: string
  prompt?: PromptInfo
}

// altrucoder_change start
export type AltruCoderClawRoute = {
  type: "altru-coder-claw"
}
// altrucoder_change end

export type PluginRoute = {
  type: "plugin"
  id: string
  data?: Record<string, unknown>
}

export type Route = HomeRoute | SessionRoute | PluginRoute | AltruCoderClawRoute // altrucoder_change

export const { use: useRoute, provider: RouteProvider } = createSimpleContext({
  name: "Route",
  init: (props: { initialRoute?: Route }) => {
    const [store, setStore] = createStore<Route>(
      props.initialRoute ??
        (process.env["ALTRU_CODER_ROUTE"]
          ? JSON.parse(process.env["ALTRU_CODER_ROUTE"])
          : {
              type: "home",
            }),
    )

    // altrucoder_change start
    let previous: Route | undefined
    // altrucoder_change end

    return {
      get data() {
        return store
      },
      navigate(route: Route) {
        previous = structuredClone(unwrap(store)) // altrucoder_change
        setStore(reconcile(route))
      },
      // altrucoder_change start
      back() {
        const target = previous ?? ({ type: "home" } as const)
        previous = undefined
        console.log("navigate", target)
        setStore(target)
      },
      // altrucoder_change end
    }
  },
})

export type RouteContext = ReturnType<typeof useRoute>

export function useRouteData<T extends Route["type"]>(type: T) {
  const route = useRoute()
  return route.data as Extract<Route, { type: typeof type }>
}
