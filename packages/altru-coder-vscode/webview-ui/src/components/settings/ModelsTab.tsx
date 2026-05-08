import { Component, For, createMemo } from "solid-js"
import { Card } from "@altru-coder/altru-coder-ui/card"
import { Button } from "@altru-coder/altru-coder-ui/button"
import { useDialog } from "@altru-coder/altru-coder-ui/context/dialog"
import { useConfig } from "../../context/config"
import { useLanguage } from "../../context/language"
import { useSession } from "../../context/session"
import { parseModelString } from "../../../../src/shared/provider-model"
import { DEFAULT_AUTOCOMPLETE_MODEL } from "../../../../src/shared/autocomplete-models"
import { ModelSelectorBase } from "../shared/ModelSelector"
import SettingsRow from "./SettingsRow"
import { AUTOCOMPLETE_PROVIDER_ID, AUTOCOMPLETE_SELECTOR_MODELS } from "./autocomplete-model-selector"
import ProviderSelectDialog from "./ProviderSelectDialog"

const ModelsTab: Component = () => {
  const dialog = useDialog()
  const { config, settings, updateConfig, updateSetting } = useConfig()
  const language = useLanguage()
  const session = useSession()

  const autocompleteModel = () => String(settings()["autocomplete.model"] ?? DEFAULT_AUTOCOMPLETE_MODEL.id)

  function handleModelSelect(configKey: "model" | "small_model") {
    return (providerID: string, modelID: string) => {
      if (!providerID || !modelID) {
        updateConfig({ [configKey]: null })
        return
      }
      updateConfig({ [configKey]: `${providerID}/${modelID}` })
    }
  }

  const allAgents = createMemo(() => session.agents())

  function handleModeModelSelect(agentName: string) {
    return (providerID: string, modelID: string) => {
      if (!providerID || !modelID) {
        updateConfig({ agent: { [agentName]: { model: null } } })
        return
      }
      updateConfig({ agent: { [agentName]: { model: `${providerID}/${modelID}` } } })
    }
  }

  function handleAutocompleteModelSelect(providerID: string, modelID: string) {
    if (providerID !== AUTOCOMPLETE_PROVIDER_ID || !modelID) return
    updateSetting("autocomplete.model", modelID)
  }

  return (
    <div>
      <Card>
        <SettingsRow
          title={language.t("settings.models.addModel.title")}
          description={language.t("settings.models.addModel.description")}
        >
          <Button
            type="button"
            size="small"
            variant="secondary"
            icon="plus-small"
            onClick={() => dialog.show(() => <ProviderSelectDialog />)}
          >
            {language.t("provider.custom.models.add")}
          </Button>
        </SettingsRow>
        <SettingsRow
          title={language.t("settings.providers.defaultModel.title")}
          description={language.t("settings.providers.defaultModel.description")}
        >
          <ModelSelectorBase
            value={parseModelString(config().model ?? undefined)}
            onSelect={handleModelSelect("model")}
            placement="bottom-start"
            allowClear
            clearLabel={language.t("settings.providers.notSet")}
          />
        </SettingsRow>
        <SettingsRow
          title={language.t("settings.providers.smallModel.title")}
          description={language.t("settings.providers.smallModel.description")}
        >
          <ModelSelectorBase
            value={parseModelString(config().small_model ?? undefined)}
            onSelect={handleModelSelect("small_model")}
            placement="bottom-start"
            allowClear
            clearLabel={language.t("settings.providers.notSet")}
            includeAutoSmall
          />
        </SettingsRow>
        <SettingsRow
          title={language.t("settings.autocomplete.model.title")}
          description={language.t("settings.autocomplete.model.description")}
          last
        >
          <ModelSelectorBase
            value={{ providerID: AUTOCOMPLETE_PROVIDER_ID, modelID: autocompleteModel() }}
            onSelect={handleAutocompleteModelSelect}
            placement="bottom-start"
            models={AUTOCOMPLETE_SELECTOR_MODELS}
            favorites={false}
          />
        </SettingsRow>
      </Card>

      <h4 style={{ "margin-top": "24px", "margin-bottom": "8px" }}>{language.t("settings.providers.modeModels")}</h4>
      <Card>
        <For each={allAgents()}>
          {(agent, index) => (
            <SettingsRow
              title={agent.name.charAt(0).toUpperCase() + agent.name.slice(1)}
              last={index() === allAgents().length - 1}
            >
              <ModelSelectorBase
                value={parseModelString(config().agent?.[agent.name]?.model ?? undefined)}
                onSelect={handleModeModelSelect(agent.name)}
                placement="bottom-start"
                allowClear
                clearLabel={language.t("settings.providers.notSet")}
              />
            </SettingsRow>
          )}
        </For>
      </Card>
    </div>
  )
}

export default ModelsTab
