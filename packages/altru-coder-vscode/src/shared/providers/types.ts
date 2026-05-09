export type ProviderPreset = {
  id: string
  name: string
  baseURL: string
  note: string
  npm?: string
  models?: ProviderPresetModel[]
  local?: boolean
  headers?: Record<string, string>
  fetch?: boolean
}

export type ProviderPresetModel = {
  id: string
  name?: string
  reasoning?: boolean
  variants?: Record<string, Record<string, unknown>>
}
