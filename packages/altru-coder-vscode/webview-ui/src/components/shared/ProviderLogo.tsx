import { Show, type Component } from "solid-js"
import { ProviderIcon } from "@altru-coder/altru-coder-ui/provider-icon"
import { ALTRU_CODER_PROVIDER_ID } from "../../../../src/shared/provider-model"
import { providerIcon, providerLogoID } from "../settings/provider-catalog"

const ASSETS: Record<string, string> = {
  "alibaba-cn": "alibaba-cn.png",
  anthropic: "anthropic.png",
  "ask-sage": "ask-sage.png",
  azure: "azure.png",
  cerebras: "cerebras.png",
  clawrouter: "clawrouter.png",
  cohere: "cohere.png",
  cometapi: "cometapi.png",
  deepseek: "deepseek.png",
  docker: "docker.png",
  fireworks: "fireworks.png",
  "function-network": "function-network.png",
  google: "google.png",
  groq: "groq.png",
  inception: "inception.png",
  lemonade: "lemonade.png",
  "llama.cpp": "llama.cpp.png",
  llamacpp: "llamacpp.png",
  llamafile: "llamafile.png",
  lmstudio: "lmstudio.png",
  mimo: "mimo.png",
  mistral: "mistral.png",
  morph: "morph.ico",
  moonshot: "moonshot.png",
  ncompass: "ncompass.png",
  nebius: "nebius.png",
  novita: "novita.png",
  nvidia: "nvidia.png",
  ollama: "ollama.png",
  openai: "openai.png",
  openrouter: "openrouter.png",
  ovhcloud: "ovhcloud.png",
  qwen: "qwen.png",
  replicate: "replicate.png",
  sambanova: "sambanova.png",
  scaleway: "scaleway.png",
  siliconflow: "siliconflow.png",
  tensorix: "tensorix.ico",
  together: "together.png",
  venice: "venice.png",
  xai: "xAI.png",
  zai: "zai.svg",
  "zai-cn": "zai.svg",
}

interface ProviderLogoProps {
  providerID: string
  modelID?: string
  modelName?: string
  width?: number
  height?: number
  class?: string
  title?: string
  "data-slot"?: string
}

export const ProviderLogo: Component<ProviderLogoProps> = (props) => {
  const width = () => props.width ?? 20
  const height = () => props.height ?? width()
  const slot = () => props["data-slot"]
  const icons = () => (window as { ICONS_BASE_URI?: string }).ICONS_BASE_URI || ""
  const id = () => providerLogoID(props.providerID, props.modelID, props.modelName)
  const asset = () => ASSETS[id()]

  return (
    <Show
      when={id() === ALTRU_CODER_PROVIDER_ID}
      fallback={
        <Show
          when={asset()}
          fallback={<ProviderIcon id={providerIcon(id())} width={width()} height={height()} class={props.class} />}
        >
          {(file) => (
            <img
              data-component="provider-logo"
              data-provider={id()}
              data-slot={slot()}
              class={props.class}
              src={`${icons()}/provider-logos/${file()}`}
              alt=""
              width={width()}
              height={height()}
              title={props.title}
            />
          )}
        </Show>
      }
    >
      <img
        data-component="provider-logo"
        data-provider={id()}
        data-slot={slot()}
        class={props.class}
        src={`${icons()}/altru-logo.png`}
        alt=""
        width={width()}
        height={height()}
        title={props.title}
      />
    </Show>
  )
}
