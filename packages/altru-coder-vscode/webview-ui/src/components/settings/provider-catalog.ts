import { iconNames, type IconName } from "@opencode-ai/ui/icons/provider"
import {
  ALTRU_CODER_PROVIDER_ID,
  PROVIDER_PRIORITY as POPULAR_PROVIDER_IDS,
  createAltruCoderFallbackProvider,
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
    bedrock: "amazon-bedrock",
    cometapi: "openrouter",
    docker: "llama",
    fireworks: "fireworks-ai",
    "function-network": "inference",
    gemini: "google",
    google: "google",
    "github-copilot": "github-copilot",
    huggingface: "huggingface",
    kindo: "synthetic",
    lemonade: "llama",
    llamafile: "llama",
    llamacpp: "llama",
    llamastack: "llama",
    mimo: "xiaomi",
    moonshot: "moonshotai",
    ncompass: "synthetic",
    "openai-compatible": "openai",
    "text-gen-webui": "llama",
    novita: "novita-ai",
    nous: "synthetic",
    ollama: "ollama-cloud",
    sambanova: "llama",
    together: "togetherai",
    vertex: "google-vertex",
    vertexai: "google-vertex",
    vllm: "llama",
    watsonx: "synthetic",
    xAI: "xai",
    xai: "xai",
  }
  const alias = aliases[providerID]
  if (alias) return alias
  if (iconNames.includes(providerID as IconName)) return providerID as IconName
  return "synthetic"
}

export function altruFallbackProvider() {
  return createAltruCoderFallbackProvider()
}
