import { useDialog } from "@altru-coder/altru-coder-ui/context/dialog"
import { Dialog } from "@altru-coder/altru-coder-ui/dialog"
import { Tag } from "@altru-coder/altru-coder-ui/tag"
import { For, Show, createMemo, createSignal } from "solid-js"
import { useConfig } from "../../context/config"
import { useLanguage } from "../../context/language"
import { useProvider } from "../../context/provider"
import { useServer } from "../../context/server"
import { ProviderLogo } from "../shared/ProviderLogo"
import { CUSTOM_PROVIDER_ID, isPopularProvider, altruFallbackProvider, popularProviderIndex } from "./provider-catalog"
import CustomProviderDialog from "./CustomProviderDialog"
import { ALTRU_CODER_PROVIDER_ID } from "../../../../src/shared/provider-model"
import { NVIDIA_NIM_PROVIDER_ID } from "../../../../src/shared/nvidia-nim"
import { PROVIDER_PRESETS, type ProviderPreset } from "./provider-presets"
import NvidiaNimDialog from "./NvidiaNimDialog"

type ProviderItem = {
  id: string
  name: string
  note?: string
  preset?: ProviderPreset
  kind: "custom" | "gateway" | "preset"
}

const ProviderSelectDialog = () => {
  const dialog = useDialog()
  const { config } = useConfig()
  const provider = useProvider()
  const server = useServer()
  const language = useLanguage()
  const [query, setQuery] = createSignal("")

  const items = createMemo<ProviderItem[]>(() => {
    language.locale()

    const disabled = new Set(config().disabled_providers ?? [])
    const connected = new Set(provider.connected())
    const all = [altruFallbackProvider(), ...PROVIDER_PRESETS]
    const available = all.filter((item) => !disabled.has(item.id) && !connected.has(item.id))

    return [
      {
        id: CUSTOM_PROVIDER_ID,
        name: language.t("settings.providers.tag.customProvider"),
        note: language.t("settings.providers.custom.description"),
        kind: "custom" as const,
      },
      ...available.map((item) => ({
        id: item.id,
        name: item.name,
        note: "note" in item ? item.note : language.t("dialog.provider.altru-coder.note"),
        preset: "baseURL" in item ? item : undefined,
        kind: item.id === ALTRU_CODER_PROVIDER_ID ? ("gateway" as const) : ("preset" as const),
      })),
    ]
  })

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase()
    const list = items()
    if (!q) return list
    return list.filter((item) => item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q))
  })

  const pinned = createMemo(() => {
    return filtered()
      .filter((item) => item.id === CUSTOM_PROVIDER_ID || isPopularProvider(item.id))
      .sort((a, b) => {
        if (a.id === CUSTOM_PROVIDER_ID) return 1
        if (b.id === CUSTOM_PROVIDER_ID) return -1
        const rank = popularProviderIndex(a.id) - popularProviderIndex(b.id)
        if (rank !== 0) return rank
        return a.name.localeCompare(b.name)
      })
  })

  const other = createMemo(() => {
    return filtered()
      .filter((item) => item.id !== CUSTOM_PROVIDER_ID && !isPopularProvider(item.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  function open(item: ProviderItem) {
    if (item.id === CUSTOM_PROVIDER_ID) {
      dialog.show(() => <CustomProviderDialog onBack={() => dialog.show(() => <ProviderSelectDialog />)} />)
      return
    }

    if (item.preset) {
      if (item.id === NVIDIA_NIM_PROVIDER_ID) {
        dialog.show(() => <NvidiaNimDialog onBack={() => dialog.show(() => <ProviderSelectDialog />)} />)
        return
      }
      dialog.show(() => (
        <CustomProviderDialog preset={item.preset} onBack={() => dialog.show(() => <ProviderSelectDialog />)} />
      ))
      return
    }

    if (item.id === ALTRU_CODER_PROVIDER_ID) {
      dialog.close()
      // Navigate to the Profile view so the full device-auth UI is visible.
      server.goToLogin()
      return
    }
  }

  const ProviderTile = (props: { item: ProviderItem }) => (
    <button type="button" class="provider-picker-tile" title={props.item.name} onClick={() => open(props.item)}>
      <span class="provider-picker-icon">
        <ProviderLogo providerID={props.item.id} width={24} height={24} />
      </span>
      <span class="provider-picker-copy">
        <span class="provider-picker-name">
          {props.item.name}
          <Show when={props.item.id === ALTRU_CODER_PROVIDER_ID}>
            <Tag>{language.t("dialog.provider.tag.recommended")}</Tag>
          </Show>
          <Show when={props.item.id === CUSTOM_PROVIDER_ID}>
            <Tag>{language.t("settings.providers.tag.custom")}</Tag>
          </Show>
        </span>
        <span class="provider-picker-note">{props.item.note ?? language.t("common.connect")}</span>
      </span>
    </button>
  )

  return (
    <Dialog title={language.t("command.provider.connect")} size="large" transition>
      <div class="provider-picker">
        <div class="provider-picker-search-wrap">
          <input
            class="provider-picker-search"
            type="search"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
            placeholder={language.t("dialog.provider.search.placeholder")}
            autofocus
          />
        </div>

        <div class="provider-picker-scroll">
          <Show when={pinned().length > 0}>
            <div class="provider-picker-section">{language.t("dialog.provider.group.recommended")}</div>
            <div class="provider-picker-grid">
              <For each={pinned()}>{(item) => <ProviderTile item={item} />}</For>
            </div>
          </Show>

          <Show when={other().length > 0}>
            <div class="provider-picker-section">{language.t("dialog.provider.group.other")}</div>
            <div class="provider-picker-grid">
              <For each={other()}>{(item) => <ProviderTile item={item} />}</For>
            </div>
          </Show>

          <Show when={filtered().length === 0}>
            <div class="provider-picker-empty">{language.t("dialog.provider.empty")}</div>
          </Show>
        </div>
      </div>
    </Dialog>
  )
}

export default ProviderSelectDialog
