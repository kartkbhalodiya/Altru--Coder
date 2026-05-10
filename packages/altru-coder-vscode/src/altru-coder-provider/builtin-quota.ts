import * as vscode from "vscode"
import {
  ALTRU_CODER_BUILTIN_MODELS,
  ALTRU_CODER_BUILTIN_TOKEN_LIMIT,
  ALTRU_CODER_BUILTIN_TOKEN_WINDOW_MS,
  isAltruCoderBuiltinModel,
} from "../shared/provider-model"

const KEY = "altruCoderBuiltinQuota"

interface State {
  started: number
  used: number
  messages: Record<string, number>
}

export interface BuiltinQuotaSnapshot {
  limit: number
  used: number
  remaining: number
  resetAt: number
  models: Array<{ providerID: string; modelID: string; name: string }>
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function clean(raw: unknown, now = Date.now()): State {
  if (!record(raw)) return { started: 0, used: 0, messages: {} }

  const started = typeof raw.started === "number" && Number.isFinite(raw.started) ? Math.max(0, raw.started) : 0
  if (started > 0 && now - started >= ALTRU_CODER_BUILTIN_TOKEN_WINDOW_MS) {
    return { started: 0, used: 0, messages: {} }
  }

  const messages = record(raw.messages)
    ? Object.fromEntries(
        Object.entries(raw.messages).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]),
        ),
      )
    : {}
  const used = typeof raw.used === "number" && Number.isFinite(raw.used) ? Math.max(0, raw.used) : 0
  return { started, used, messages }
}

function total(tokens: unknown): number {
  if (!record(tokens)) return 0
  if (typeof tokens.total === "number" && Number.isFinite(tokens.total)) return Math.max(0, tokens.total)
  const cache = record(tokens.cache) ? tokens.cache : {}
  const values = [tokens.input, tokens.output, tokens.reasoning, cache.read, cache.write].map((value) =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0,
  )
  return values.reduce((sum, value) => sum + value, 0)
}

function view(state: State): BuiltinQuotaSnapshot {
  const used = Math.floor(state.used)
  const started = state.started > 0 ? state.started : Date.now()
  return {
    limit: ALTRU_CODER_BUILTIN_TOKEN_LIMIT,
    used,
    remaining: Math.max(0, ALTRU_CODER_BUILTIN_TOKEN_LIMIT - used),
    resetAt: started + ALTRU_CODER_BUILTIN_TOKEN_WINDOW_MS,
    models: ALTRU_CODER_BUILTIN_MODELS.map((model) => ({
      providerID: model.providerID,
      modelID: model.modelID,
      name: model.name,
    })),
  }
}

export class BuiltinQuota {
  private chain = Promise.resolve()

  constructor(private readonly state: vscode.Memento) {}

  async snapshot(): Promise<BuiltinQuotaSnapshot> {
    const current = clean(this.state.get(KEY))
    await this.state.update(KEY, current)
    return view(current)
  }

  async record(info: unknown): Promise<BuiltinQuotaSnapshot | undefined> {
    const result = { changed: false }
    this.chain = this.chain
      .catch(() => undefined)
      .then(async () => {
        if (!record(info)) return
        const providerID = typeof info.providerID === "string" ? info.providerID : undefined
        const modelID = typeof info.modelID === "string" ? info.modelID : undefined
        const id = typeof info.id === "string" ? info.id : undefined
        if (info.role !== "assistant" || !id || !isAltruCoderBuiltinModel(providerID, modelID)) return

        const count = total(info.tokens)
        if (count <= 0) return

        const current = clean(this.state.get(KEY))
        const prior = current.messages[id] ?? 0
        const delta = Math.max(0, count - prior)
        if (delta === 0) return

        const next = {
          started: current.started || Date.now(),
          used: current.used + delta,
          messages: { ...current.messages, [id]: count },
        }
        await this.state.update(KEY, next)
        result.changed = true
      })

    await this.chain
    if (!result.changed) return undefined
    return this.snapshot()
  }

  async canSend(providerID: string | undefined, modelID: string | undefined): Promise<boolean> {
    if (!isAltruCoderBuiltinModel(providerID, modelID)) return true
    if (ALTRU_CODER_BUILTIN_TOKEN_LIMIT >= Number.MAX_SAFE_INTEGER / 2) return true
    const current = await this.snapshot()
    return current.remaining > 0
  }
}
