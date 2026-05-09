import { Button } from "@altru-coder/altru-coder-ui/button"
import { useDialog } from "@altru-coder/altru-coder-ui/context/dialog"
import { Dialog } from "@altru-coder/altru-coder-ui/dialog"
import { TextField } from "@altru-coder/altru-coder-ui/text-field"
import { showToast } from "@altru-coder/altru-coder-ui/toast"
import { createSignal } from "solid-js"
import { CUSTOM_PROVIDER_PACKAGE } from "../../../../src/shared/provider-model"
import {
  NVIDIA_KIMI_MODEL_ID,
  NVIDIA_KIMI_MODEL_NAME,
  NVIDIA_NIM_BASE_URL,
  NVIDIA_NIM_PROVIDER_ID,
  NVIDIA_NIM_PROVIDER_NAME,
  nvidiaKimiModel,
} from "../../../../src/shared/nvidia-nim"
import { useLanguage } from "../../context/language"
import { useVSCode } from "../../context/vscode"
import { ProviderLogo } from "../shared/ProviderLogo"

export default function NvidiaNimDialog(props: { onBack?: () => void }) {
  const dialog = useDialog()
  const language = useLanguage()
  const vscode = useVSCode()
  const [key, setKey] = createSignal("")

  function save() {
    const model = nvidiaKimiModel()
    vscode.postMessage({
      type: "saveCustomProvider",
      requestId: crypto.randomUUID(),
      providerID: NVIDIA_NIM_PROVIDER_ID,
      config: {
        npm: CUSTOM_PROVIDER_PACKAGE,
        name: NVIDIA_NIM_PROVIDER_NAME,
        options: { baseURL: NVIDIA_NIM_BASE_URL },
        models: {
          [model.id]: {
            name: model.name,
            reasoning: model.reasoning,
            variants: model.variants,
          },
        },
      },
      apiKey: key().trim() || undefined,
      apiKeyChanged: true,
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
      title={
        <button type="button" onClick={back} style={{ all: "unset", cursor: "pointer" }}>
          Back
        </button>
      }
      transition
    >
      <div style={{ display: "flex", "flex-direction": "column", gap: "22px", padding: "0 20px 24px" }}>
        <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
          <ProviderLogo providerID={NVIDIA_NIM_PROVIDER_ID} width={20} height={20} />
          <div style={{ "font-size": "var(--altru-coder-font-size-16)", "font-weight": "500" }}>
            {NVIDIA_NIM_PROVIDER_NAME}
          </div>
        </div>

        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--border-weak-base, var(--vscode-panel-border))",
            "border-radius": "6px",
            "font-size": "var(--altru-coder-font-size-13)",
          }}
        >
          {NVIDIA_KIMI_MODEL_NAME} - {NVIDIA_KIMI_MODEL_ID}
        </div>

        <TextField
          autofocus
          type="password"
          label={language.t("provider.custom.field.apiKey.label")}
          placeholder={language.t("provider.custom.field.apiKey.placeholder")}
          value={key()}
          onChange={setKey}
        />

        <Button type="button" size="large" variant="primary" onClick={save}>
          {language.t("common.save")}
        </Button>
      </div>
    </Dialog>
  )
}
