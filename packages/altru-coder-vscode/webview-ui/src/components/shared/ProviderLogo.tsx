import type { Component } from "solid-js"
import { ProviderIcon } from "@altru-coder/altru-coder-ui/provider-icon"
import { ALTRU_CODER_PROVIDER_ID } from "../../../../src/shared/provider-model"
import { providerIcon } from "../settings/provider-catalog"

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
}

interface ProviderLogoProps {
  providerID: string
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

  if (props.providerID === ALTRU_CODER_PROVIDER_ID) {
    return (
      <img
        data-component="provider-logo"
        data-provider={props.providerID}
        data-slot={slot()}
        class={props.class}
        src={`${icons()}/altru-logo.png`}
        alt=""
        width={width()}
        height={height()}
        title={props.title}
      />
    )
  }

  const asset = ASSETS[props.providerID]
  if (asset) {
    return (
      <img
        data-component="provider-logo"
        data-provider={props.providerID}
        data-slot={slot()}
        class={props.class}
        src={`${icons()}/provider-logos/${asset}`}
        alt=""
        width={width()}
        height={height()}
        title={props.title}
      />
    )
  }

  return (
    <ProviderIcon
      id={providerIcon(props.providerID)}
      width={width()}
      height={height()}
      class={props.class}
    />
  )
}
