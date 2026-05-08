import { Button } from "@altru-coder/altru-coder-ui/button"
import { useDialog } from "@altru-coder/altru-coder-ui/context/dialog"
import { Dialog } from "@altru-coder/altru-coder-ui/dialog"
import { IconButton } from "@altru-coder/altru-coder-ui/icon-button"
import { Select } from "@altru-coder/altru-coder-ui/select"
import { Spinner } from "@altru-coder/altru-coder-ui/spinner"
import { TextField } from "@altru-coder/altru-coder-ui/text-field"
import { showToast } from "@altru-coder/altru-coder-ui/toast"
import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { useConfig } from "../../context/config"
import { useLanguage } from "../../context/language"
import { useProvider } from "../../context/provider"
import { useVSCode } from "../../context/vscode"
import type { ExtensionMessage, ProviderConfig } from "../../types/messages"
import { createProviderAction } from "../../utils/provider-action"
import { MASKED_CUSTOM_PROVIDER_KEY, resolveCustomProviderKey } from "../../../../src/shared/custom-provider"
import { ModelCard } from "./CustomProviderModelCard"
import type {
  ChatTemplateArgsValue,
  ModelEntry,
  ReasoningEffortValue,
  ThinkingTypeValue,
  VariantEntry,
} from "./CustomProviderModelCard"
import { validateCustomProvider } from "./CustomProviderValidation"
import type { FormErrors, FormState, HeaderRow } from "./CustomProviderValidation"
import { ProviderLogo } from "../shared/ProviderLogo"
import type { ProviderPreset, ProviderPresetModel } from "./provider-presets"
import { CUSTOM_PROVIDER_PACKAGE } from "../../../../src/shared/provider-model"
const DEBOUNCE_MS = 500
const SEARCH_DEBOUNCE_MS = 150
const FETCH_ALL_ID = "__altru_fetch_all__"

/** Subsequence fuzzy match — "gpt4o" matches "gpt-4o-mini". */
function fuzzy(query: string, target: string) {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

type FetchedModel = { id: string; name: string }
type PresetOption = { id: string; name: string; fetch?: boolean }
type T = (key: string, args?: Record<string, string>) => string
type Existing = {
  providerID: string
  name: string
  config: ProviderConfig
}

function blank(): ModelEntry {
  return { id: "", name: "", reasoning: false, variants: [] }
}

function entry(item: ProviderPresetModel): ModelEntry {
  return {
    id: item.id,
    name: item.name ?? item.id,
    reasoning: item.reasoning ?? false,
    variants: [],
  }
}

function copy(m: ModelEntry): ModelEntry {
  return {
    id: m.id,
    name: m.name,
    reasoning: m.reasoning,
    variants: m.variants.map((v) => ({ ...v })),
  }
}

function option(m: ModelEntry): PresetOption {
  return { id: m.id, name: m.name || m.id }
}

function fetched(m: FetchedModel): ModelEntry {
  return { id: m.id, name: m.name, reasoning: false, variants: [] }
}

function suggestions(preset: ProviderPreset | undefined) {
  if (!preset?.models?.length) return [blank()]
  return preset.models.map(entry)
}

function localEndpoint(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/|$)/i.test(url.trim())
}

function canFetchModels(fetching: boolean, url: string, key: string) {
  if (fetching) return false
  if (!/^https?:\/\//.test(url.trim())) return false
  return !!key.trim() || localEndpoint(url)
}

function fieldState(error: string | undefined) {
  return error ? ("invalid" as const) : undefined
}

function dialogTitle(editing: boolean, preset: ProviderPreset | undefined, t: T) {
  if (editing) return t("provider.custom.edit.title")
  if (preset) return t("provider.custom.preset.title", { provider: preset.name })
  return t("provider.custom.title")
}

function fetchLabel(fetching: boolean, t: T) {
  if (fetching) return t("provider.custom.models.fetching")
  return t("provider.custom.models.fetch")
}

function submitLabel(saving: boolean, t: T) {
  if (saving) return t("common.saving")
  return t("common.save")
}

function initialAuth(
  existing: Existing | undefined,
  states: Record<string, "api" | "oauth" | "wellknown">,
) {
  if (!existing) return undefined
  if (existing.config.env?.length) return undefined
  return states[existing.providerID]
}

function initialID(existing: Existing | undefined, preset: ProviderPreset | undefined) {
  if (existing?.providerID) return existing.providerID
  if (preset?.id) return preset.id
  return ""
}

function initialName(existing: Existing | undefined, preset: ProviderPreset | undefined) {
  if (existing?.name) return existing.name
  if (preset?.name) return preset.name
  return ""
}

function initialNpm(existing: Existing | undefined, preset: ProviderPreset | undefined) {
  if (existing?.config?.npm) return existing.config.npm
  if (preset?.npm) return preset.npm
  return CUSTOM_PROVIDER_PACKAGE
}

function initialURL(existing: Existing | undefined, preset: ProviderPreset | undefined) {
  const opts = existing?.config?.options as { baseURL?: string } | undefined
  if (opts?.baseURL) return opts.baseURL
  if (preset?.baseURL) return preset.baseURL
  return ""
}

function initialPicked(compact: boolean, models: ModelEntry[]) {
  if (compact) return FETCH_ALL_ID
  return models.find((m) => m.id.trim())?.id ?? ""
}

export interface CustomProviderDialogProps {
  onBack?: () => void
  preset?: ProviderPreset
  /** When set, the dialog opens in edit mode with pre-filled values. */
  existing?: Existing
}

const CustomProviderDialog = (props: CustomProviderDialogProps) => {
  const dialog = useDialog()
  const { config } = useConfig()
  const provider = useProvider()
  const language = useLanguage()
  const vscode = useVSCode()
  const action = createProviderAction(vscode)
  onCleanup(action.dispose)

  const editing = () => !!props.existing
  const compact = () => !!props.preset && !props.existing
  const presets = suggestions(props.preset)
  const [picked, setPicked] = createSignal(initialPicked(compact(), presets))
  const presetOptions = createMemo(() => [
    ...presets.filter((m) => m.id.trim()).map(option),
    { id: FETCH_ALL_ID, name: language.t("provider.custom.preset.models.autofetch"), fetch: true },
  ])
  const currentPreset = createMemo(() => presetOptions().find((o) => o.id === picked()))

  function initModels(): ModelEntry[] {
    if (!props.existing) {
      if (!compact()) return presets.map(copy)
      const local = presets.filter((m) => m.id.trim()).map(copy)
      return local.length > 0 ? local : [blank()]
    }
    const cfg = props.existing.config
    if (!cfg.models || typeof cfg.models !== "object") return [blank()]
    const entries = Object.entries(cfg.models)
    if (entries.length === 0) return [blank()]
    return entries.map(([id, m]) => {
      const raw = m as { name?: string; reasoning?: boolean; variants?: Record<string, Record<string, unknown>> }
      const variants: VariantEntry[] = Object.entries(raw?.variants ?? {}).map(([vname, vcfg]) => ({
        name: vname,
        enableThinking: typeof vcfg.enable_thinking === "boolean" ? (vcfg.enable_thinking as boolean) : undefined,
        thinking:
          typeof vcfg.thinking === "object" && vcfg.thinking !== null
            ? ((vcfg.thinking as { type?: string }).type as ThinkingTypeValue)
            : undefined,
        reasoningEffort:
          typeof vcfg.reasoningEffort === "string" ? (vcfg.reasoningEffort as ReasoningEffortValue) : undefined,
        chatTemplateArgs:
          typeof vcfg.chat_template_args === "object" && vcfg.chat_template_args !== null
            ? ((vcfg.chat_template_args as { enable_thinking?: boolean }).enable_thinking as ChatTemplateArgsValue)
            : undefined,
      }))
      return {
        id,
        name: raw?.name ?? id,
        reasoning: raw?.reasoning ?? false,
        variants,
      }
    })
  }

  function initHeaders(): HeaderRow[] {
    const opts = props.existing?.config?.options as { headers?: Record<string, string> } | undefined
    const headers = opts?.headers ?? props.preset?.headers
    if (!headers || typeof headers !== "object") return [{ key: "", value: "" }]
    const entries = Object.entries(headers)
    if (entries.length === 0) return [{ key: "", value: "" }]
    return entries.map(([key, value]) => ({ key, value }))
  }

  const auth = initialAuth(props.existing, provider.authStates())

  const [form, setForm] = createStore<FormState>({
    providerID: initialID(props.existing, props.preset),
    name: initialName(props.existing, props.preset),
    npm: initialNpm(props.existing, props.preset),
    baseURL: initialURL(props.existing, props.preset),
    apiKey: resolveCustomProviderKey(auth),
    models: initModels(),
    headers: initHeaders(),
    saving: false,
  })

  const [errors, setErrors] = createStore<FormErrors>({
    providerID: undefined,
    name: undefined,
    baseURL: undefined,
    models: form.models.map((m) => ({ variants: m.variants.map(() => ({})) })),
    headers: form.headers.map(() => ({})),
  })
  const [apiTouched, setApiTouched] = createSignal(false)

  // ── Fetch models state ──────────────────────────────────────────────

  const [fetching, setFetching] = createSignal(false)
  const [fetchError, setFetchError] = createSignal<string>()
  const [fetchedModels, setFetchedModels] = createSignal<FetchedModel[]>()
  const [selected, setSelected] = createSignal<Set<string>>(new Set())
  const [fetchStatus, setFetchStatus] = createSignal<string>()

  // Search within fetched models
  const [search, setSearch] = createSignal("")
  const [debouncedSearch, setDebouncedSearch] = createSignal("")

  createEffect(() => {
    const q = search()
    const timer = setTimeout(() => setDebouncedSearch(q), SEARCH_DEBOUNCE_MS)
    onCleanup(() => clearTimeout(timer))
  })

  const filtered = createMemo(() => {
    const models = fetchedModels()
    if (!models) return []
    const q = debouncedSearch()
    if (!q) return models
    return models.filter((m) => fuzzy(q, m.id) || fuzzy(q, m.name))
  })

  // ── Auto-fetch on debounce ──────────────────────────────────────────

  // Dedicated signals for the URL and API key drive the auto-fetch effect.
  // We avoid reading form.baseURL / form.apiKey inside createEffect because
  // SolidJS store proxies track at the property level — any store write
  // (including setForm("models", ...)) invalidates effects that read from
  // the same store, causing unwanted re-runs that wipe the model picker.
  const [fetchURL, setFetchURL] = createSignal(form.baseURL)
  const [fetchKey, setFetchKey] = createSignal("")
  let fetchVersion = 0

  createEffect(() => {
    const url = fetchURL()
    const key = fetchKey().trim()
    const all = compact() && picked() === FETCH_ALL_ID

    // Clear previous results whenever URL or key changes
    setFetchedModels(undefined)
    setFetchError(undefined)
    setFetchStatus(undefined)
    setSearch("")

    if (!/^https?:\/\//.test(url.trim())) return
    if (!key && !localEndpoint(url)) return
    if (compact() && !all) return

    fetchVersion++
    const version = fetchVersion
    const timer = setTimeout(() => {
      if (version === fetchVersion) doFetch(all ? { all: true } : {})
    }, DEBOUNCE_MS)
    onCleanup(() => clearTimeout(timer))
  })

  // ── Core fetch logic ────────────────────────────────────────────────

  function doFetch(opts: { all?: boolean } = {}) {
    // Snapshot all values from signals/store before entering async.
    // This avoids reading the store proxy inside callbacks, which could
    // subscribe to unrelated store properties and cause re-render loops.
    const url = fetchURL().trim()
    const raw = fetchKey().trim()
    const env = raw.match(/^\{env:([^}]+)\}$/)?.[1]?.trim()
    const apiKey = raw && !env ? raw : undefined
    const existing = new Set(form.models.map((m) => m.id.trim()).filter(Boolean))

    if (!canFetchModels(fetching(), url, raw)) {
      setFetchError(language.t("provider.custom.models.fetch.needsApiKey"))
      return
    }

    const hdrs = form.headers
      .map((h) => ({ key: h.key.trim(), value: h.value.trim() }))
      .filter((h) => !!h.key && !!h.value)
    const headers = hdrs.length > 0 ? Object.fromEntries(hdrs.map((h) => [h.key, h.value])) : undefined

    // Bump version so any in-flight response from a previous fetch is ignored
    fetchVersion++
    const version = fetchVersion

    setFetching(true)
    setFetchError(undefined)
    setFetchedModels(undefined)
    setFetchStatus(undefined)
    setSearch("")

    const rid = crypto.randomUUID()

    const unsub = vscode.onMessage((msg: ExtensionMessage) => {
      if (msg.type !== "customProviderModelsFetched") return
      if (!("requestId" in msg) || msg.requestId !== rid) return
      unsub()

      // Stale response — a newer fetch was triggered while this one was in-flight
      if (version !== fetchVersion) return

      setFetching(false)

      if (msg.error) {
        setFetchError(msg.auth ? language.t("provider.custom.models.fetch.authError") : msg.error)
        return
      }

      const models = msg.models ?? []
      if (models.length === 0) {
        setFetchError(language.t("provider.custom.models.fetch.empty"))
        return
      }

      if (opts.all) {
        const merged = models.map(inflate)
        setForm("models", merged)
        setErrors(
          "models",
          merged.map((m) => ({ variants: m.variants.map(() => ({})) })),
        )
        setSelected(new Set<string>())
        setFetchedModels(undefined)
        setFetchStatus(language.t("provider.custom.models.fetch.addedAll", { count: String(merged.length) }))
        return
      }

      // Filter using the snapshot taken at fetch time
      const fresh = models.filter((m) => !existing.has(m.id))
      if (fresh.length === 0) {
        setFetchStatus(language.t("provider.custom.models.fetch.allExist"))
        return
      }

      // Pre-select all and show the picker
      setSelected(new Set(fresh.map((m) => m.id)))
      setFetchedModels(fresh)
    })

    vscode.postMessage({
      type: "fetchCustomProviderModels",
      requestId: rid,
      baseURL: url,
      apiKey,
      headers,
      npm: form.npm,
    })
  }

  // ── Model picker actions ────────────────────────────────────────────

  function toggleModel(id: string) {
    const next = new Set(selected())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function selectAll() {
    const next = new Set(selected())
    for (const m of filtered()) next.add(m.id)
    setSelected(next)
  }

  function deselectAll() {
    const next = new Set(selected())
    for (const m of filtered()) next.delete(m.id)
    setSelected(next)
  }

  function count() {
    return selected().size
  }

  function addSelected() {
    const models = fetchedModels()
    if (!models) return
    const sel = selected()
    const picked = models.filter((m) => sel.has(m.id))
    if (picked.length === 0) return

    // Replace the single empty row or append
    const row = form.models[0]
    const empty = form.models.length === 1 && !!row && !row.id.trim() && !row.name.trim()
    const merged = empty ? picked.map(inflate) : [...form.models, ...picked.map(inflate)]

    setForm("models", merged)
    setErrors(
      "models",
      merged.map((m) => ({ variants: m.variants.map(() => ({})) })),
    )
    setFetchStatus(language.t("provider.custom.models.fetch.added", { count: String(picked.length) }))
    setFetchedModels(undefined)
    setSearch("")
  }

  function selectPreset(item: PresetOption | undefined) {
    if (!item) return
    setFetchedModels(undefined)
    setFetchError(undefined)
    setFetchStatus(undefined)
    setSearch("")

    if (item.fetch) {
      setPicked(item.id)
      return
    }

    const found = presets.find((m) => m.id === item.id)
    if (!found) return

    const presetIDs = new Set(presets.map((m) => m.id))
    const extras = form.models.filter((m) => !presetIDs.has(m.id))
    const merged = [copy(found), ...extras]

    setPicked(item.id)
    setForm("models", merged)
    setErrors(
      "models",
      merged.map((m) => ({ variants: m.variants.map(() => ({})) })),
    )
  }

  function cancelFetch() {
    setFetchedModels(undefined)
    setSearch("")
  }

  function inflate(m: FetchedModel) {
    const preset = presets.find((p) => p.id === m.id)
    const item = fetched(m)
    return {
      ...item,
      name: preset?.name ?? item.name,
      reasoning: preset?.reasoning ?? item.reasoning,
    }
  }

  // ── Form helpers ────────────────────────────────────────────────────

  function goBack() {
    if (props.onBack) {
      props.onBack()
      return
    }
    dialog.close()
  }

  function addModel() {
    setForm("models", (v) => [...v, blank()])
    setErrors("models", (v) => [...v, { variants: [] }])
  }

  function removeModel(index: number) {
    if (form.models.length <= 1) return
    setForm("models", (v) => v.filter((_, i) => i !== index))
    setErrors("models", (v) => v.filter((_, i) => i !== index))
  }

  function addHeader() {
    setForm("headers", (v) => [...v, { key: "", value: "" }])
    setErrors("headers", (v) => [...v, {}])
  }

  function removeHeader(index: number) {
    if (form.headers.length <= 1) return
    setForm("headers", (v) => v.filter((_, i) => i !== index))
    setErrors("headers", (v) => v.filter((_, i) => i !== index))
  }

  function addVariant(mi: number) {
    const blank: VariantEntry = {
      name: "",
      enableThinking: undefined,
      thinking: undefined,
      reasoningEffort: undefined,
      chatTemplateArgs: undefined,
    }
    setForm("models", mi, "variants", (v) => [...v, blank])
    setErrors("models", mi, "variants", (v) => [...(v ?? []), {}])
  }

  function removeVariant(mi: number, vi: number) {
    setForm("models", mi, "variants", (v) => v.filter((_, i) => i !== vi))
    setErrors("models", mi, "variants", (v) => (v ?? []).filter((_, i) => i !== vi))
  }

  function validate() {
    const output = validateCustomProvider({
      form,
      t: language.t,
      editing: editing(),
      allowExistingProviderID: !!props.preset,
      disabledProviders: config().disabled_providers ?? [],
      existingProviderIDs: new Set(Object.keys(provider.providers())),
      existingEnv: props.existing?.config?.env,
    })
    setErrors(reconcile(output.errors))
    return output.result
  }

  function save(e: SubmitEvent) {
    e.preventDefault()
    if (form.saving || fetching()) return

    const result = validate()
    if (!result) return

    setForm("saving", true)

    action.send(
      {
        type: "saveCustomProvider",
        providerID: result.providerID,
        config: result.config,
        apiKey: apiTouched() ? result.key : undefined,
        apiKeyChanged: apiTouched(),
      },
      {
        onConnected: () => {
          setForm("saving", false)
          dialog.close()
          showToast({
            variant: "success",
            icon: "circle-check",
            title: language.t("provider.connect.toast.connected.title", { provider: result.name }),
            description: language.t("provider.connect.toast.connected.description", { provider: result.name }),
          })
        },
        onError: (message) => {
          setForm("saving", false)
          showToast({ title: language.t("common.requestFailed"), description: message.message })
        },
      },
    )
  }

  // ── Render ──────────────────────────────────────────────────────────

  const fetchInfo = createMemo(() => (!fetchError() ? fetchStatus() : undefined))

  function ApiKeyField(p: { autofocus?: boolean }) {
    return (
      <TextField
        autofocus={p.autofocus}
        type="password"
        label={language.t("provider.custom.field.apiKey.label")}
        placeholder={language.t("provider.custom.field.apiKey.placeholder")}
        description={language.t("provider.custom.field.apiKey.description")}
        value={form.apiKey}
        onChange={(v) => {
          const key = !apiTouched() && form.apiKey === MASKED_CUSTOM_PROVIDER_KEY ? v.replace(/^\*+/, "") : v
          setApiTouched(true)
          setForm("apiKey", key)
          setFetchKey(key)
        }}
      />
    )
  }

  function FetchPanel() {
    return (
      <>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "space-between",
            gap: "12px",
            padding: "8px 0 0",
          }}
        >
          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
            <span
              style={{
                "font-size": "var(--altru-coder-font-size-12)",
                "font-weight": "500",
                color: "var(--text-weak-base)",
              }}
            >
              {language.t("provider.custom.models.fetch.title")}
            </span>
            <Show when={fetching()}>
              <Spinner style={{ width: "12px", height: "12px" }} />
            </Show>
          </div>
          <Button
            type="button"
            size="small"
            variant="ghost"
            onClick={() => doFetch()}
            disabled={!canFetchModels(fetching(), fetchURL(), fetchKey())}
          >
            {fetchLabel(fetching(), language.t)}
          </Button>
        </div>

        <Show when={fetchError()}>
          {(err) => (
            <span
              style={{ "font-size": "var(--altru-coder-font-size-12)", color: "var(--vscode-errorForeground, #f14c4c)" }}
            >
              {err()}
            </span>
          )}
        </Show>

        <Show when={fetchInfo()}>
          {(status) => (
            <span
              style={{
                "font-size": "var(--altru-coder-font-size-12)",
                color: "var(--text-weak-base, var(--vscode-descriptionForeground))",
              }}
            >
              {status()}
            </span>
          )}
        </Show>

        <Show when={fetchedModels()}>
          {(models) => (
            <div
              class="custom-provider-fetch-picker"
              style={{
                border: "1px solid var(--border-weak-base, var(--vscode-panel-border))",
                "border-radius": "6px",
                padding: "12px",
                display: "flex",
                "flex-direction": "column",
                gap: "8px",
              }}
            >
              <div
                class="custom-provider-fetch-header"
                style={{
                  display: "flex",
                  "justify-content": "space-between",
                  "align-items": "center",
                }}
              >
                <span
                  style={{
                    "font-size": "var(--altru-coder-font-size-12)",
                    "font-weight": "500",
                    color: "var(--text-weak-base)",
                  }}
                >
                  <Show
                    when={debouncedSearch()}
                    fallback={language.t("provider.custom.models.fetch.found", {
                      count: String(models().length),
                    })}
                  >
                    {language.t("provider.custom.models.fetch.showing", {
                      shown: String(filtered().length),
                      total: String(models().length),
                    })}
                  </Show>
                </span>
                <div class="custom-provider-fetch-actions" style={{ display: "flex", gap: "8px" }}>
                  <Button type="button" size="small" variant="ghost" onClick={selectAll}>
                    {language.t("provider.custom.models.fetch.selectAll")}
                  </Button>
                  <Button type="button" size="small" variant="ghost" onClick={deselectAll}>
                    {language.t("provider.custom.models.fetch.deselectAll")}
                  </Button>
                </div>
              </div>

              <Show when={models().length > 10}>
                <TextField
                  label={language.t("provider.custom.models.fetch.search")}
                  hideLabel
                  placeholder={language.t("provider.custom.models.fetch.search")}
                  value={search()}
                  onChange={setSearch}
                />
              </Show>

              <div
                class="custom-provider-fetch-list"
                style={{
                  "max-height": "200px",
                  "overflow-y": "auto",
                  display: "flex",
                  "flex-direction": "column",
                  gap: "2px",
                }}
              >
                <For each={filtered()}>
                  {(m) => (
                    <label
                      class="custom-provider-fetch-item"
                      style={{
                        display: "flex",
                        "align-items": "center",
                        gap: "8px",
                        padding: "4px 2px",
                        cursor: "pointer",
                        "font-size": "var(--altru-coder-font-size-13)",
                        color: "var(--text-base, var(--vscode-foreground))",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected().has(m.id)}
                        onChange={() => toggleModel(m.id)}
                        style={{ cursor: "pointer" }}
                      />
                      <span class="custom-provider-fetch-model-id">{m.id}</span>
                    </label>
                  )}
                </For>
              </div>

              <div class="custom-provider-fetch-actions" style={{ display: "flex", gap: "8px", "margin-top": "4px" }}>
                <Button type="button" size="small" variant="primary" onClick={addSelected} disabled={count() === 0}>
                  {language.t("provider.custom.models.fetch.add", { count: String(count()) })}
                </Button>
                <Button type="button" size="small" variant="ghost" onClick={cancelFetch}>
                  {language.t("common.cancel")}
                </Button>
              </div>
            </div>
          )}
        </Show>
      </>
    )
  }

  function CompactFetchState() {
    return (
      <>
        <Show when={fetching()}>
          <span class="custom-provider-section-note">
            <Spinner style={{ width: "12px", height: "12px" }} />
            {language.t("provider.custom.models.fetching")}
          </span>
        </Show>
        <Show when={fetchError()}>
          {(err) => <span class="custom-provider-section-error">{err()}</span>}
        </Show>
        <Show when={fetchInfo()}>
          {(status) => <span class="custom-provider-section-note">{status()}</span>}
        </Show>
      </>
    )
  }

  return (
    <Dialog
      title={
        <IconButton
          tabIndex={-1}
          icon="arrow-left"
          variant="ghost"
          onClick={goBack}
          aria-label={language.t("common.goBack")}
        />
      }
      transition
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "24px",
          padding: "0 10px 12px 10px",
          "overflow-y": "auto",
          "max-height": "60vh",
        }}
      >
        <div style={{ padding: "0 10px", display: "flex", gap: "16px", "align-items": "center" }}>
          <ProviderLogo providerID={form.providerID || "_custom"} width={20} height={20} />
          <div
            style={{ "font-size": "var(--altru-coder-font-size-16)", "font-weight": "500", color: "var(--vscode-foreground)" }}
          >
            {dialogTitle(editing(), props.preset, language.t)}
          </div>
        </div>

        <form
          onSubmit={save}
          style={{ padding: "0 10px 24px 10px", display: "flex", "flex-direction": "column", gap: "24px" }}
        >
          <Show when={!compact()}>
            <div style={{ "font-size": "var(--altru-coder-font-size-14)", color: "var(--text-base)" }}>
              {language.t("provider.custom.description.prefix")}
              <a
                href="https://altrucoder.vercel.app/docs.html"
                onClick={(e) => {
                  e.preventDefault()
                  vscode.postMessage({
                    type: "openExternal",
                    url: "https://altrucoder.vercel.app/docs.html",
                  })
                }}
              >
                {language.t("provider.custom.description.link")}
              </a>
              {language.t("provider.custom.description.suffix")}
            </div>
          </Show>

          <Show when={!compact()}>
            <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
              <TextField
                autofocus={!editing()}
                label={language.t("provider.custom.field.providerID.label")}
                placeholder={language.t("provider.custom.field.providerID.placeholder")}
                description={language.t("provider.custom.field.providerID.description")}
                value={form.providerID}
                onChange={(v) => setForm("providerID", v)}
                validationState={fieldState(errors.providerID)}
                error={errors.providerID}
                disabled={editing()}
              />
              <TextField
                label={language.t("provider.custom.field.name.label")}
                placeholder={language.t("provider.custom.field.name.placeholder")}
                value={form.name}
                onChange={(v) => setForm("name", v)}
                validationState={fieldState(errors.name)}
                error={errors.name}
              />
              <TextField
                label={language.t("provider.custom.field.baseURL.label")}
                placeholder={language.t("provider.custom.field.baseURL.placeholder")}
                value={form.baseURL}
                onChange={(v) => {
                  setForm("baseURL", v)
                  setFetchURL(v)
                }}
                validationState={fieldState(errors.baseURL)}
                error={errors.baseURL}
              />
              <ApiKeyField />
            </div>
          </Show>

          <Show when={compact()}>
            <div class="custom-provider-compact">
              <div class="custom-provider-section">
                <label class="custom-provider-section-title">{language.t("provider.custom.preset.models.label")}</label>
                <Select
                  options={presetOptions()}
                  current={currentPreset()}
                  value={(o) => o.id}
                  label={(o) => o.name}
                  onSelect={selectPreset}
                  placeholder={language.t("provider.custom.preset.models.placeholder")}
                  variant="secondary"
                  size="small"
                  triggerVariant="settings"
                  triggerStyle={{ width: "100%" }}
                />
                <CompactFetchState />
              </div>
              <div class="custom-provider-section">
                <ApiKeyField autofocus />
              </div>
            </div>
          </Show>

          <Show when={!compact()}>
          {/* Models */}
          <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
            <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
              <label
                style={{
                  "font-size": "var(--altru-coder-font-size-12)",
                  "font-weight": "500",
                  color: "var(--text-weak-base)",
                }}
              >
                {language.t("provider.custom.models.label")}
              </label>
            </div>
            <For each={form.models}>
              {(m, i) => (
                <ModelCard
                  m={m}
                  i={i}
                  errors={errors.models[i()] ?? {}}
                  t={language.t}
                  canRemove={form.models.length > 1}
                  onChangeId={(v) => setForm("models", i(), "id", v)}
                  onChangeName={(v) => setForm("models", i(), "name", v)}
                  onChangeReasoning={(v) => setForm("models", i(), "reasoning", v)}
                  onRemove={() => removeModel(i())}
                  onAddVariant={() => addVariant(i())}
                  onRemoveVariant={(vi) => removeVariant(i(), vi)}
                  onChangeVariantName={(vi, val) => setForm("models", i(), "variants", vi, "name", val)}
                  onChangeVariantEnableThinking={(vi, val) =>
                    setForm("models", i(), "variants", vi, "enableThinking", val)
                  }
                  onChangeVariantThinking={(vi, val) => setForm("models", i(), "variants", vi, "thinking", val)}
                  onChangeVariantReasoningEffort={(vi, val) =>
                    setForm("models", i(), "variants", vi, "reasoningEffort", val)
                  }
                  onChangeVariantChatTemplateArgs={(vi, val) =>
                    setForm("models", i(), "variants", vi, "chatTemplateArgs", val)
                  }
                />
              )}
            </For>
            <Button type="button" size="small" variant="ghost" icon="plus-small" onClick={addModel}>
              {language.t("provider.custom.models.add")}
            </Button>
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
                gap: "12px",
                padding: "8px 0 0",
              }}
            >
              <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                <span
                  style={{
                    "font-size": "var(--altru-coder-font-size-12)",
                    "font-weight": "500",
                    color: "var(--text-weak-base)",
                  }}
                >
                  {language.t("provider.custom.models.fetch.title")}
                </span>
                <Show when={fetching()}>
                  <Spinner style={{ width: "12px", height: "12px" }} />
                </Show>
              </div>
              <Button
                type="button"
                size="small"
                variant="ghost"
                onClick={() => doFetch()}
                disabled={!canFetchModels(fetching(), fetchURL(), fetchKey())}
              >
                {fetchLabel(fetching(), language.t)}
              </Button>
            </div>

            {/* Fetch error */}
            <Show when={fetchError()}>
              {(err) => (
                <span
                  style={{ "font-size": "var(--altru-coder-font-size-12)", color: "var(--vscode-errorForeground, #f14c4c)" }}
                >
                  {err()}
                </span>
              )}
            </Show>

            {/* Fetch status (success/info messages) */}
            <Show when={fetchInfo()}>
              {(status) => (
                <span
                  style={{
                    "font-size": "var(--altru-coder-font-size-12)",
                    color: "var(--text-weak-base, var(--vscode-descriptionForeground))",
                  }}
                >
                  {status()}
                </span>
              )}
            </Show>

            {/* Model selection picker */}
            <Show when={fetchedModels()}>
              {(models) => (
                <div
                  class="custom-provider-fetch-picker"
                  style={{
                    border: "1px solid var(--border-weak-base, var(--vscode-panel-border))",
                    "border-radius": "6px",
                    padding: "12px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "8px",
                  }}
                >
                  {/* Header with count + toggle */}
                  <div
                    class="custom-provider-fetch-header"
                    style={{
                      display: "flex",
                      "justify-content": "space-between",
                      "align-items": "center",
                    }}
                  >
                    <span
                      style={{
                        "font-size": "var(--altru-coder-font-size-12)",
                        "font-weight": "500",
                        color: "var(--text-weak-base)",
                      }}
                    >
                      <Show
                        when={debouncedSearch()}
                        fallback={language.t("provider.custom.models.fetch.found", {
                          count: String(models().length),
                        })}
                      >
                        {language.t("provider.custom.models.fetch.showing", {
                          shown: String(filtered().length),
                          total: String(models().length),
                        })}
                      </Show>
                    </span>
                    <div class="custom-provider-fetch-actions" style={{ display: "flex", gap: "8px" }}>
                      <Button type="button" size="small" variant="ghost" onClick={selectAll}>
                        {language.t("provider.custom.models.fetch.selectAll")}
                      </Button>
                      <Button type="button" size="small" variant="ghost" onClick={deselectAll}>
                        {language.t("provider.custom.models.fetch.deselectAll")}
                      </Button>
                    </div>
                  </div>

                  {/* Search */}
                  <Show when={models().length > 10}>
                    <TextField
                      label={language.t("provider.custom.models.fetch.search")}
                      hideLabel
                      placeholder={language.t("provider.custom.models.fetch.search")}
                      value={search()}
                      onChange={setSearch}
                    />
                  </Show>

                  {/* Model list */}
                  <div
                    class="custom-provider-fetch-list"
                    style={{
                      "max-height": "200px",
                      "overflow-y": "auto",
                      display: "flex",
                      "flex-direction": "column",
                      gap: "2px",
                    }}
                  >
                    <For each={filtered()}>
                      {(m) => (
                        <label
                          class="custom-provider-fetch-item"
                          style={{
                            display: "flex",
                            "align-items": "center",
                            gap: "8px",
                            padding: "4px 2px",
                            cursor: "pointer",
                            "font-size": "var(--altru-coder-font-size-13)",
                            color: "var(--text-base, var(--vscode-foreground))",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected().has(m.id)}
                            onChange={() => toggleModel(m.id)}
                            style={{ cursor: "pointer" }}
                          />
                          <span class="custom-provider-fetch-model-id">{m.id}</span>
                        </label>
                      )}
                    </For>
                  </div>

                  {/* Actions */}
                  <div class="custom-provider-fetch-actions" style={{ display: "flex", gap: "8px", "margin-top": "4px" }}>
                    <Button type="button" size="small" variant="primary" onClick={addSelected} disabled={count() === 0}>
                      {language.t("provider.custom.models.fetch.add", { count: String(count()) })}
                    </Button>
                    <Button type="button" size="small" variant="ghost" onClick={cancelFetch}>
                      {language.t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </Show>
          </div>

          </Show>

          <Show when={!compact()}>
          {/* Headers */}
          <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
            <label
              style={{ "font-size": "var(--altru-coder-font-size-12)", "font-weight": "500", color: "var(--text-weak-base)" }}
            >
              {language.t("provider.custom.headers.label")}
            </label>
            <For each={form.headers}>
              {(h, i) => (
                <div style={{ display: "flex", gap: "8px", "align-items": "start", "flex-wrap": "wrap", "min-width": 0 }}>
                  <div style={{ flex: "1 1 180px", "min-width": 0 }}>
                    <TextField
                      label={language.t("provider.custom.headers.key.label")}
                      hideLabel
                      placeholder={language.t("provider.custom.headers.key.placeholder")}
                      value={h.key}
                      onChange={(v) => setForm("headers", i(), "key", v)}
                      validationState={fieldState(errors.headers[i()]?.key)}
                      error={errors.headers[i()]?.key}
                    />
                  </div>
                  <div style={{ flex: "1 1 180px", "min-width": 0 }}>
                    <TextField
                      label={language.t("provider.custom.headers.value.label")}
                      hideLabel
                      placeholder={language.t("provider.custom.headers.value.placeholder")}
                      value={h.value}
                      onChange={(v) => setForm("headers", i(), "value", v)}
                      validationState={fieldState(errors.headers[i()]?.value)}
                      error={errors.headers[i()]?.value}
                    />
                  </div>
                  <IconButton
                    type="button"
                    icon="trash"
                    variant="ghost"
                    onClick={() => removeHeader(i())}
                    disabled={form.headers.length <= 1}
                    aria-label={language.t("provider.custom.headers.remove")}
                    style={{ "margin-top": "6px" }}
                  />
                </div>
              )}
            </For>
            <Button type="button" size="small" variant="ghost" icon="plus-small" onClick={addHeader}>
              {language.t("provider.custom.headers.add")}
            </Button>
          </div>

          </Show>

          <Button type="submit" size="large" variant="primary" disabled={form.saving || fetching()}>
            {submitLabel(form.saving, language.t)}
          </Button>
        </form>
      </div>
    </Dialog>
  )
}

export default CustomProviderDialog
