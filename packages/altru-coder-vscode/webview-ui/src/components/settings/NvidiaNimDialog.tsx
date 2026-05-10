import { Button } from "@altru-coder/altru-coder-ui/button"
import { useDialog } from "@altru-coder/altru-coder-ui/context/dialog"
import { Dialog } from "@altru-coder/altru-coder-ui/dialog"
import { TextField } from "@altru-coder/altru-coder-ui/text-field"
import { showToast } from "@altru-coder/altru-coder-ui/toast"
import { For, Show, createMemo, createSignal } from "solid-js"
import { MASKED_CUSTOM_PROVIDER_KEY, resolveCustomProviderKey } from "../../../../src/shared/custom-provider"
import { CUSTOM_PROVIDER_PACKAGE } from "../../../../src/shared/provider-model"
import {
  NVIDIA_KIMI_MODEL_ID,
  NVIDIA_NIM_BASE_URL,
  NVIDIA_NIM_PROVIDER_ID,
  NVIDIA_NIM_PROVIDER_NAME,
  nvidiaNimModels,
} from "../../../../src/shared/nvidia-nim"
import type { ProviderPresetModel } from "../../../../src/shared/providers/types"
import { useLanguage } from "../../context/language"
import { useProvider } from "../../context/provider"
import { useVSCode } from "../../context/vscode"
import type { ExtensionMessage, ProviderConfig } from "../../types/messages"
import { ProviderLogo } from "../shared/ProviderLogo"

type Existing = {
  providerID: string
  name: string
  config: ProviderConfig
}

type Props = {
  existing?: Existing
  onBack?: () => void
}

const base: ProviderPresetModel[] = nvidiaNimModels()

function initial(existing: Existing | undefined, models: ProviderPresetModel[]) {
  const ids = Object.keys(existing?.config.models ?? {}).filter((id) => models.some((item) => item.id === id))
  if (ids.length > 0) return ids
  return [NVIDIA_KIMI_MODEL_ID]
}

function search(query: string, item: ProviderPresetModel) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return item.id.toLowerCase().includes(q) || (item.name ?? item.id).toLowerCase().includes(q)
}

function model(item: ProviderPresetModel) {
  const out: { name: string; reasoning?: true; variants?: Record<string, Record<string, unknown>> } = {
    name: item.name ?? item.id,
  }
  if (item.reasoning) out.reasoning = true
  if (item.variants) out.variants = item.variants
  return out
}

export default function NvidiaNimDialog(props: Props) {
  const dialog = useDialog()
  const language = useLanguage()
  const provider = useProvider()
  const vscode = useVSCode()
  const auth = props.existing ? provider.authStates()[NVIDIA_NIM_PROVIDER_ID] : undefined
  const [key, setKey] = createSignal(resolveCustomProviderKey(auth))
  const [touched, setTouched] = createSignal(false)
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal("")
  const [catalog, setCatalog] = createSignal(base)
  const [chosen, setChosen] = createSignal(new Set(initial(props.existing, catalog())))
  const [refreshing, setRefreshing] = createSignal(false)
  const [refreshError, setRefreshError] = createSignal<string>()

  const filtered = createMemo(() => catalog().filter((item) => search(query(), item)))
  const selected = createMemo(() => catalog().filter((item) => chosen().has(item.id)))
  const label = createMemo(() => {
    const items = selected()
    if (items.length === 0) return "Select models"
    if (items.length === 1) return items[0].name
    return `${items.length} models selected`
  })

  function toggle(id: string) {
    const next = new Set(chosen())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChosen(next)
  }

  function select() {
    const next = new Set(chosen())
    for (const item of filtered()) next.add(item.id)
    setChosen(next)
  }

  function clear() {
    const next = new Set(chosen())
    for (const item of filtered()) next.delete(item.id)
    setChosen(next)
  }

  function sync(items: ProviderPresetModel[]) {
    const next = [...items].sort((a, b) => a.id.localeCompare(b.id))
    const ids = new Set(next.map((item) => item.id))
    setCatalog(next)
    setChosen((value) => {
      const keep = [...value].filter((id) => ids.has(id))
      if (keep.length > 0) return new Set(keep)
      return new Set(initial(undefined, next))
    })
  }

  function refresh() {
    const rid = crypto.randomUUID()
    setRefreshing(true)
    setRefreshError(undefined)

    const unsub = vscode.onMessage((msg: ExtensionMessage) => {
      if (msg.type !== "customProviderModelsFetched") return
      if (msg.requestId !== rid) return
      unsub()
      setRefreshing(false)
      if (msg.error) {
        setRefreshError(msg.auth ? language.t("provider.custom.models.fetch.authError") : msg.error)
        return
      }
      const items = msg.models ?? []
      if (items.length === 0) {
        setRefreshError(language.t("provider.custom.models.fetch.empty"))
        return
      }
      sync(items)
    })

    vscode.postMessage({
      type: "fetchCustomProviderModels",
      requestId: rid,
      baseURL: NVIDIA_NIM_BASE_URL,
      apiKey: key().trim() || undefined,
    })
  }

  function save() {
    const items = selected()
    if (items.length === 0) {
      showToast({
        variant: "error",
        title: language.t("common.requestFailed"),
        description: "Select at least one NVIDIA NIM model.",
      })
      return
    }

    vscode.postMessage({
      type: "saveCustomProvider",
      requestId: crypto.randomUUID(),
      providerID: NVIDIA_NIM_PROVIDER_ID,
      config: {
        npm: CUSTOM_PROVIDER_PACKAGE,
        name: NVIDIA_NIM_PROVIDER_NAME,
        options: { baseURL: NVIDIA_NIM_BASE_URL },
        models: Object.fromEntries(items.map((item) => [item.id, model(item)])),
      },
      apiKey: touched() ? key().trim() || undefined : undefined,
      apiKeyChanged: touched(),
    })

    dialog.close()
    showToast({
      variant: "success",
      icon: "circle-check",
      title: language.t("provider.connect.toast.connected.title", { provider: NVIDIA_NIM_PROVIDER_NAME }),
      description: language.t("provider.connect.toast.connected.description", { provider: NVIDIA_NIM_PROVIDER_NAME }),
    })
  }

  function back() {
    if (props.onBack) {
      props.onBack()
      return
    }
    dialog.close()
  }

  return (
    <Dialog
      size="large"
      title={
        <button type="button" onClick={back} style={{ all: "unset", cursor: "pointer" }}>
          Back
        </button>
      }
      transition
    >
      <div class="provider-model-dialog">
        <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
          <ProviderLogo providerID={NVIDIA_NIM_PROVIDER_ID} width={20} height={20} />
          <div style={{ "font-size": "var(--altru-coder-font-size-16)", "font-weight": "500" }}>
            {NVIDIA_NIM_PROVIDER_NAME}
          </div>
        </div>

        <div class="provider-model-picker" style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
          <label
            style={{
              "font-size": "var(--altru-coder-font-size-12)",
              "font-weight": 600,
              color: "var(--text-weak-base, var(--vscode-descriptionForeground))",
            }}
          >
            {language.t("provider.custom.preset.models.label")}
          </label>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--vscode-inputOption-activeBorder, #4c8dff)",
              "border-radius": "8px",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025)), var(--vscode-input-background)",
              color: "var(--vscode-input-foreground)",
              "box-shadow": "inset 0 1px 0 rgba(255,255,255,0.09), 0 10px 28px rgba(0,0,0,0.18)",
              display: "flex",
              "align-items": "center",
              "justify-content": "space-between",
              gap: "10px",
              cursor: "pointer",
              "font-size": "var(--altru-coder-font-size-13)",
            }}
          >
            <span style={{ overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>{label()}</span>
            <span style={{ color: "var(--vscode-descriptionForeground)" }}>{open() ? "Close" : "Open"}</span>
          </button>

          <Show when={open()}>
            <div
              class="provider-model-dropdown"
              style={{
                position: "relative",
                "z-index": 40,
                padding: "10px",
                border: "1px solid var(--vscode-inputOption-activeBorder, #4c8dff)",
                "border-radius": "10px",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)), var(--vscode-editorWidget-background)",
                "backdrop-filter": "blur(18px)",
                "box-shadow": "0 18px 46px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <input
                type="search"
                value={query()}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder={language.t("provider.custom.models.fetch.search")}
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 10px",
                  border: "1px solid var(--border-weak-base, var(--vscode-panel-border))",
                  "border-radius": "7px",
                  background: "var(--vscode-input-background)",
                  color: "var(--vscode-input-foreground)",
                  "margin-bottom": "8px",
                }}
              />
              <div style={{ display: "flex", gap: "8px", "margin-bottom": "8px" }}>
                <Button type="button" size="small" variant="ghost" onClick={refresh} disabled={refreshing()}>
                  {refreshing()
                    ? language.t("provider.custom.models.fetching")
                    : language.t("provider.custom.models.fetch")}
                </Button>
                <Button type="button" size="small" variant="ghost" onClick={select}>
                  {language.t("provider.custom.models.fetch.selectAll")}
                </Button>
                <Button type="button" size="small" variant="ghost" onClick={clear}>
                  {language.t("provider.custom.models.fetch.deselectAll")}
                </Button>
              </div>
              <Show when={refreshError()}>{(err) => <span class="custom-provider-section-error">{err()}</span>}</Show>
              <div
                class="provider-model-list"
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  gap: "4px",
                  "max-height": "260px",
                  overflow: "auto",
                }}
              >
                <For each={filtered()}>
                  {(item) => (
                    <label
                      style={{
                        display: "flex",
                        gap: "8px",
                        "align-items": "center",
                        padding: "7px 8px",
                        "border-radius": "7px",
                        cursor: "pointer",
                        color: "var(--vscode-foreground)",
                        background: chosen().has(item.id) ? "rgba(76, 141, 255, 0.16)" : "transparent",
                      }}
                    >
                      <input type="checkbox" checked={chosen().has(item.id)} onChange={() => toggle(item.id)} />
                      <span style={{ "font-size": "var(--altru-coder-font-size-13)" }}>{item.name ?? item.id}</span>
                      <span
                        style={{
                          "margin-left": "auto",
                          color: "var(--vscode-descriptionForeground)",
                          "font-size": "var(--altru-coder-font-size-11)",
                        }}
                      >
                        {item.id}
                      </span>
                    </label>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>

        <div class="provider-model-api">
          <TextField
            autofocus
            type="password"
            label={language.t("provider.custom.field.apiKey.label")}
            placeholder={language.t("provider.custom.field.apiKey.placeholder")}
            value={key()}
            onChange={(value) => {
              const next = !touched() && key() === MASKED_CUSTOM_PROVIDER_KEY ? value.replace(/^\*+/, "") : value
              setTouched(true)
              setKey(next)
            }}
          />
        </div>

        <Button type="button" size="large" variant="primary" onClick={save}>
          {language.t("common.save")}
        </Button>
      </div>
    </Dialog>
  )
}
