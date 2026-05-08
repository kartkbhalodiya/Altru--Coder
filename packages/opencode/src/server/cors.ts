import * as AltruCoderServer from "@/altrucoder/server/server" // altrucoder_change

const opencodeOrigin = /^https:\/\/([a-z0-9-]+\.)*opencode\.ai$/

export type CorsOptions = { readonly cors?: ReadonlyArray<string> }

export function isAllowedCorsOrigin(input: string | undefined, opts?: CorsOptions) {
  if (!input) return true
  if (input.startsWith("http://localhost:")) return true
  if (input.startsWith("http://127.0.0.1:")) return true
  if (input.startsWith("oc://renderer")) return true
  if (input === "tauri://localhost" || input === "http://tauri.localhost" || input === "https://tauri.localhost")
    return true
  if (opencodeOrigin.test(input)) return true
  // altrucoder_change start
  if (AltruCoderServer.corsOrigin(input)) return true
  // altrucoder_change end
  return opts?.cors?.includes(input) ?? false
}
