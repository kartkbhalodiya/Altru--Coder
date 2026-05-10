import type { ProviderPreset } from "./types"

export const ClawrouterPreset: ProviderPreset = {
  id: "clawrouter",
  name: "ClawRouter",
  baseURL: "http://localhost:1337/v1",
  note: "Fetch locally routed ClawRouter models.",
  models: [
    { id: "blockrun/free", name: "BlockRun Free" },
    { id: "auto", name: "Auto Router" },
  ],
  local: true,
}
