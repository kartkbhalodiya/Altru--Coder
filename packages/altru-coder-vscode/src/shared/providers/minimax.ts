import type { ProviderPreset } from './types'
import { ANTHROPIC_PROVIDER_PACKAGE } from '../provider-model'

export const MinimaxPreset: ProviderPreset = {
  id: "minimax",
  name: "MiniMax",
  baseURL: "https://api.minimax.io/anthropic",
  note: "Select MiniMax models from the built-in Cline registry.",
  npm: ANTHROPIC_PROVIDER_PACKAGE,
  fetch: false,
  models: [
    { id: "MiniMax-M2.7", name: "MiniMax M2.7", reasoning: true },
    { id: "MiniMax-M2.7-highspeed", name: "MiniMax M2.7 Highspeed", reasoning: true },
    { id: "MiniMax-M2.5", name: "MiniMax M2.5", reasoning: true },
    { id: "MiniMax-M2.5-highspeed", name: "MiniMax M2.5 Highspeed", reasoning: true },
    { id: "MiniMax-M2.1", name: "MiniMax M2.1" },
    { id: "MiniMax-M2.1-lightning", name: "MiniMax M2.1 Lightning" },
    { id: "MiniMax-M2", name: "MiniMax M2" },
  ],
}
