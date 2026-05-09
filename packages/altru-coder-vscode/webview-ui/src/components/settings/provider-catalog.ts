import { iconNames, type IconName } from "@opencode-ai/ui/icons/provider"
import {
  ALTRU_CODER_PROVIDER_ID,
  PROVIDER_PRIORITY as POPULAR_PROVIDER_IDS,
  createAltruCoderFallbackProvider,
  isAltruCoderBuiltinModel,
  providerOrderIndex,
} from "../../../../src/shared/provider-model"

export const CUSTOM_PROVIDER_ID = "_custom"
export { POPULAR_PROVIDER_IDS }

const POPULAR_PROVIDER_SET = new Set<string>(POPULAR_PROVIDER_IDS)

export function isPopularProvider(providerID: string) {
  return POPULAR_PROVIDER_SET.has(providerID)
}

export function popularProviderIndex(providerID: string) {
  return providerOrderIndex(providerID, POPULAR_PROVIDER_IDS)
}

export function providerIcon(providerID: string): IconName {
  if (providerID === ALTRU_CODER_PROVIDER_ID) return "altru-coder"
  const aliases: Record<string, IconName> = {
    "amazon-bedrock": "amazon-bedrock",
    "alibaba-cn": "alibaba-cn",
    "ask-sage": "synthetic",
    aihubmix: "synthetic",
    asksage: "synthetic",
    baseten: "synthetic",
    bedrock: "amazon-bedrock",
    "claude-code": "anthropic",
    cometapi: "openrouter",
    docker: "llama",
    doubao: "synthetic",
    fireworks: "fireworks-ai",
    "function-network": "inference",
    gemini: "google",
    google: "google",
    "github-copilot": "github-copilot",
    "huawei-cloud-maas": "synthetic",
    huggingface: "huggingface",
    hicap: "synthetic",
    kindo: "synthetic",
    lemonade: "llama",
    litellm: "synthetic",
    llamafile: "llama",
    llamacpp: "llama",
    llamastack: "llama",
    mimo: "xiaomi",
    moonshot: "moonshotai",
    ncompass: "synthetic",
    "openai-compatible": "openai",
    novita: "novita-ai",
    nous: "synthetic",
    ollama: "ollama-cloud",
    oca: "synthetic",
    qwen: "alibaba-cn",
    requesty: "openrouter",
    sambanova: "llama",
    sapaicore: "synthetic",
    "text-gen-webui": "llama",
    together: "togetherai",
    "vercel-ai-gateway": "synthetic",
    vertex: "google-vertex",
    vertexai: "google-vertex",
    vllm: "llama",
    wandb: "synthetic",
    watsonx: "synthetic",
    xAI: "xai",
    xai: "xai",
    "zai-cn": "synthetic",
  }
  const alias = aliases[providerID]
  if (alias) return alias
  if (iconNames.includes(providerID as IconName)) return providerID as IconName
  return "synthetic"
}

const LOGO_ALIASES: Record<string, string> = {
  "amazon-bedrock": "amazon-bedrock",
  "anthropic": "anthropic",
  "claude": "anthropic",
  "deepseek": "deepseek",
  "gemini": "google",
  "google": "google",
  "google-gemini": "google",
  "meta": "llama",
  "meta-llama": "llama",
  "mistral": "mistral",
  "mistralai": "mistral",
  "moonshot": "moonshot",
  "moonshotai": "moonshot",
  "nvidia": "nvidia",
  "openai": "openai",
  "openrouter": "openrouter",
  "qwen": "qwen",
  "x-ai": "xai",
  "xai": "xai",
  "z-ai": "zai",
  "zai": "zai",
  "zai-cn": "zai",
}

function alias(value: string | undefined): string | undefined {
  if (!value) return undefined
  const key = value.trim().toLowerCase().replace(/\s+/g, "-")
  return LOGO_ALIASES[key] ?? key
}

export function providerLogoID(providerID: string, modelID?: string, name?: string): string {
  if (providerID !== ALTRU_CODER_PROVIDER_ID) return providerID
  if (!modelID || isAltruCoderBuiltinModel(providerID, modelID)) return providerID
  const slash = modelID.indexOf("/")
  const id = slash > 0 ? alias(modelID.slice(0, slash)) : undefined
  if (id) return id
  const colon = name?.indexOf(": ") ?? -1
  const prefix = colon > 0 ? alias(name?.slice(0, colon)) : undefined
  return prefix ?? providerID
}

export function altruFallbackProvider() {
  return createAltruCoderFallbackProvider()
}
