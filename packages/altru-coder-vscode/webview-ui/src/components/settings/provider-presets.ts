import { ANTHROPIC_PROVIDER_PACKAGE } from "../../../../src/shared/provider-model"

export type ProviderPreset = {
  id: string
  name: string
  baseURL: string
  note: string
  npm?: string
  models?: ProviderPresetModel[]
  local?: boolean
  headers?: Record<string, string>
}

export type ProviderPresetModel = {
  id: string
  name?: string
  reasoning?: boolean
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    note: "Fetch GPT and Codex models from your OpenAI account.",
    models: [
      { id: "gpt-5-codex", name: "GPT-5 Codex", reasoning: true },
      { id: "gpt-5.2", name: "GPT-5.2", reasoning: true },
      { id: "gpt-5", name: "GPT-5", reasoning: true },
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "o3", name: "o3", reasoning: true },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseURL: "https://api.anthropic.com/v1",
    note: "Use Claude directly from Anthropic with your API key.",
    npm: ANTHROPIC_PROVIDER_PACKAGE,
    models: [
      { id: "claude-opus-4-7", name: "Claude Opus 4.7", reasoning: true },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", reasoning: true },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", reasoning: true },
      { id: "claude-opus-4-1", name: "Claude Opus 4.1", reasoning: true },
      { id: "claude-opus-4-0", name: "Claude Opus 4", reasoning: true },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", reasoning: true },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", reasoning: true },
      { id: "claude-sonnet-4-0", name: "Claude Sonnet 4", reasoning: true },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", reasoning: true },
      { id: "claude-3-7-sonnet-20250219", name: "Claude Sonnet 3.7", reasoning: true },
      { id: "claude-3-5-sonnet-20241022", name: "Claude Sonnet 3.5 v2" },
      { id: "claude-3-5-haiku-latest", name: "Claude Haiku 3.5" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    note: "Fetch models from one OpenRouter API key.",
    models: [
      { id: "openrouter/auto", name: "OpenRouter Auto" },
      { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", reasoning: true },
      { id: "openai/gpt-5", name: "GPT-5", reasoning: true },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", reasoning: true },
      { id: "deepseek/deepseek-r1", name: "DeepSeek R1", reasoning: true },
    ],
  },
  {
    id: "clawrouter",
    name: "ClawRouter",
    baseURL: "http://localhost:1337/v1",
    note: "Fetch locally routed ClawRouter models.",
    models: [
      { id: "blockrun/free", name: "BlockRun Free" },
      { id: "auto", name: "Auto Router" },
    ],
    local: true,
  },
  {
    id: "cometapi",
    name: "CometAPI",
    baseURL: "https://api.cometapi.com/v1",
    note: "Fetch routed models from CometAPI.",
    models: [
      { id: "gpt-5-chat-latest", name: "GPT-5 Chat Latest", reasoning: true },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", reasoning: true },
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", reasoning: true },
      { id: "deepseek-v3.1", name: "DeepSeek V3.1", reasoning: true },
      { id: "qwen3-coder-plus-2025-07-22", name: "Qwen3 Coder Plus" },
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    note: "Use Gemini through Google's OpenAI-compatible endpoint.",
    models: [
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", reasoning: true },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", reasoning: true },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", reasoning: true },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    note: "Fetch fast hosted open-weight models.",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    note: "Fetch Mistral and Codestral models.",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "devstral-medium-latest", name: "Devstral Medium" },
      { id: "magistral-medium-latest", name: "Magistral Medium", reasoning: true },
      { id: "codestral-latest", name: "Codestral" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    note: "Fetch DeepSeek chat and reasoning models.",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner", reasoning: true },
    ],
  },
  {
    id: "inception",
    name: "Inception Labs",
    baseURL: "https://api.inceptionlabs.ai/v1",
    note: "Fetch Inception OpenAI-compatible models.",
    models: [
      { id: "mercury-2", name: "Mercury 2", reasoning: true },
      { id: "mercury-edit-2", name: "Mercury Edit 2" },
      { id: "mercury-coder-small", name: "Mercury Coder Small" },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    baseURL: "https://api.x.ai/v1",
    note: "Fetch Grok models from xAI.",
    models: [
      { id: "grok-code-fast-1", name: "Grok Code Fast 1" },
      { id: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast Reasoning", reasoning: true },
      { id: "grok-4-fast", name: "Grok 4 Fast" },
      { id: "grok-3", name: "Grok 3" },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    note: "Fetch Cerebras hosted inference models.",
    models: [
      { id: "llama3.1-70b", name: "Llama 3.1 70B" },
      { id: "llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout" },
    ],
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    baseURL: "https://api.fireworks.ai/inference/v1",
    note: "Fetch Fireworks serverless models.",
    models: [
      { id: "accounts/fireworks/models/starcoder-7b", name: "StarCoder 7B" },
      { id: "accounts/fireworks/models/llama-v3p1-405b-instruct", name: "Llama 3.1 405B" },
    ],
  },
  {
    id: "function-network",
    name: "Function Network",
    baseURL: "https://api.function.network/v1",
    note: "Fetch Function Network OpenAI-compatible models.",
    models: [
      { id: "deepseek-r1", name: "DeepSeek R1", reasoning: true },
      { id: "qwen2.5-coder-32b", name: "Qwen2.5 Coder 32B" },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    note: "Fetch Together hosted open models.",
    models: [
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B Turbo" },
      { id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", name: "Llama 3.1 70B Turbo" },
      { id: "codellama/CodeLlama-70b-Instruct-hf", name: "CodeLlama 70B" },
      { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", name: "Mixtral 8x7B" },
    ],
  },
  {
    id: "deepinfra",
    name: "DeepInfra",
    baseURL: "https://api.deepinfra.com/v1/openai",
    note: "Fetch DeepInfra OpenAI-compatible models.",
    models: [
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct", name: "Llama 3.1 405B" },
    ],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    baseURL: "https://api.perplexity.ai",
    note: "Fetch Perplexity online models.",
    models: [
      { id: "sonar-deep-research", name: "Sonar Deep Research", reasoning: true },
      { id: "sonar-reasoning-pro", name: "Sonar Reasoning Pro", reasoning: true },
      { id: "sonar-pro", name: "Sonar Pro" },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    baseURL: "https://api.cohere.com/compatibility/v1",
    note: "Use Cohere through the compatibility endpoint.",
    models: [
      { id: "command-a-reasoning-08-2025", name: "Command A Reasoning", reasoning: true },
      { id: "command-a-03-2025", name: "Command A" },
      { id: "command-a-vision-07-2025", name: "Command A Vision" },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot AI",
    baseURL: "https://api.moonshot.cn/v1",
    note: "Fetch Kimi and Moonshot models.",
    models: [
      { id: "moonshot-v1-128k", name: "Moonshot 128K" },
      { id: "moonshot-v1-32k", name: "Moonshot 32K" },
    ],
  },
  {
    id: "minimax",
    name: "MiniMax",
    baseURL: "https://api.minimax.io/v1",
    note: "Fetch MiniMax OpenAI-compatible models.",
    models: [
      { id: "MiniMax-M2.7", name: "MiniMax M2.7", reasoning: true },
      { id: "MiniMax-M2.7-highspeed", name: "MiniMax M2.7 Highspeed" },
      { id: "MiniMax-M2.5", name: "MiniMax M2.5", reasoning: true },
    ],
  },
  {
    id: "mimo",
    name: "Mimo",
    baseURL: "https://api.xiaomimimo.com/v1",
    note: "Fetch Xiaomi Mimo OpenAI-compatible models.",
    models: [
      { id: "mimo-vl-7b-rl", name: "Mimo VL 7B" },
      { id: "mimo-embedding", name: "Mimo Embedding" },
    ],
  },
  {
    id: "novita",
    name: "Novita AI",
    baseURL: "https://api.novita.ai/v3/openai",
    note: "Fetch Novita OpenAI-compatible models.",
    models: [
      { id: "deepseek-r1", name: "DeepSeek R1", reasoning: true },
      { id: "deepseek_v3", name: "DeepSeek V3" },
      { id: "llama3.1-405b", name: "Llama 3.1 405B" },
      { id: "llama3.3-70b", name: "Llama 3.3 70B" },
    ],
  },
  {
    id: "nebius",
    name: "Nebius AI Studio",
    baseURL: "https://api.studio.nebius.ai/v1",
    note: "Fetch Nebius hosted models.",
    models: [
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct", name: "Llama 3.1 405B" },
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    baseURL: "https://integrate.api.nvidia.com/v1",
    note: "Fetch NVIDIA-hosted NIM models from your NVIDIA API key.",
    models: [
      { id: "qwen/qwen3-coder-480b-a35b-instruct", name: "Qwen3 Coder 480B A35B" },
      { id: "z-ai/glm4.7", name: "GLM-4.7", reasoning: true },
      { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2 Instruct 0905" },
    ],
  },
  {
    id: "ncompass",
    name: "NCompass",
    baseURL: "https://api.ncompass.tech/v1",
    note: "Fetch NCompass OpenAI-compatible models.",
    models: [
      { id: "qwen2.5-coder-32b", name: "Qwen2.5 Coder 32B" },
      { id: "qwen2.5-72b", name: "Qwen2.5 72B" },
      { id: "llama3.3-70b", name: "Llama 3.3 70B" },
    ],
  },
  {
    id: "sambanova",
    name: "SambaNova",
    baseURL: "https://api.sambanova.ai/v1",
    note: "Fetch SambaNova cloud models.",
    models: [
      { id: "Llama-4-Maverick-17B-128E-Instruct", name: "Llama 4 Maverick" },
      { id: "Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B" },
      { id: "DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
      { id: "QwQ-32B", name: "QwQ 32B", reasoning: true },
    ],
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    baseURL: "https://api.siliconflow.cn/v1",
    note: "Fetch SiliconFlow models.",
    models: [
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
      { id: "nvidia/Llama-3.1-Nemotron-70B-Instruct", name: "Nemotron 70B" },
    ],
  },
  {
    id: "tensorix",
    name: "Tensorix",
    baseURL: "https://api.tensorix.ai/v1",
    note: "Fetch Tensorix OpenAI-compatible models.",
    models: [
      { id: "z-ai/glm-5", name: "GLM-5", reasoning: true },
      { id: "z-ai/glm-4.7", name: "GLM-4.7", reasoning: true },
      { id: "minimax/minimax-m2.5", name: "MiniMax M2.5", reasoning: true },
      { id: "deepseek/deepseek-v3.1", name: "DeepSeek V3.1", reasoning: true },
    ],
  },
  {
    id: "ovhcloud",
    name: "OVHcloud",
    baseURL: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    note: "Fetch OVHcloud OpenAI-compatible models.",
    models: [
      { id: "Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
      { id: "Qwen3-Coder-30B-A3B-Instruct", name: "Qwen3 Coder 30B" },
      { id: "gpt-oss-120b", name: "GPT OSS 120B" },
      { id: "DeepSeek-R1-Distill-Llama-70B", name: "DeepSeek R1 Distill 70B", reasoning: true },
    ],
  },
  {
    id: "nous",
    name: "Nous Research",
    baseURL: "https://inference-api.nousresearch.com/v1",
    note: "Fetch Nous Research inference models.",
    models: [
      { id: "Hermes-3-Llama-3.1-405B", name: "Hermes 3 Llama 405B" },
      { id: "DeepHermes-3-Mistral-24B-Preview", name: "DeepHermes 3 Mistral 24B", reasoning: true },
    ],
  },
  {
    id: "kindo",
    name: "Kindo",
    baseURL: "https://llm.kindo.ai/v1",
    note: "Fetch Kindo OpenAI-compatible models.",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "gemini-pro", name: "Gemini Pro" },
    ],
  },
  {
    id: "alibaba-cn",
    name: "Alibaba DashScope",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    note: "Fetch Qwen models from DashScope.",
    models: [
      { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus" },
      { id: "qwen3-max", name: "Qwen3 Max", reasoning: true },
      { id: "qwen-plus", name: "Qwen Plus" },
      { id: "qwen-turbo", name: "Qwen Turbo" },
    ],
  },
  {
    id: "zai",
    name: "Z.ai",
    baseURL: "https://api.z.ai/api/paas/v4",
    note: "Fetch GLM models from Z.ai.",
    models: [
      { id: "glm-5", name: "GLM-5", reasoning: true },
      { id: "glm-4.7", name: "GLM-4.7", reasoning: true },
      { id: "glm-4-plus", name: "GLM-4 Plus" },
      { id: "glm-4.5", name: "GLM-4.5" },
    ],
  },
  {
    id: "morph",
    name: "Morph",
    baseURL: "https://api.morphllm.com/v1",
    note: "Fetch Morph OpenAI-compatible apply models.",
    models: [
      { id: "auto", name: "Auto", reasoning: true },
      { id: "morph-v3-fast", name: "Morph V3 Fast" },
      { id: "morph-v3-large", name: "Morph V3 Large", reasoning: true },
    ],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    baseURL: "https://router.huggingface.co/v1",
    note: "Fetch models from the Hugging Face router.",
    models: [
      { id: "openai/gpt-oss-120b", name: "GPT OSS 120B" },
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", reasoning: true },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
    ],
  },
  {
    id: "venice",
    name: "Venice",
    baseURL: "https://api.venice.ai/api/v1",
    note: "Fetch Venice OpenAI-compatible models.",
    models: [
      { id: "llama-3.3-70b", name: "Llama 3.3 70B" },
      { id: "qwen-2.5-coder-32b", name: "Qwen2.5 Coder 32B" },
      { id: "deepseek-r1", name: "DeepSeek R1", reasoning: true },
    ],
  },
  {
    id: "scaleway",
    name: "Scaleway",
    baseURL: "https://api.scaleway.ai/v1",
    note: "Fetch Scaleway generative APIs models.",
    models: [
      { id: "qwen3-coder-30b-a3b-instruct", name: "Qwen3 Coder 30B" },
      { id: "qwen2.5-coder-32b-instruct", name: "Qwen2.5 Coder 32B" },
      { id: "gpt-oss-120b", name: "GPT OSS 120B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B", reasoning: true },
    ],
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    baseURL: "http://localhost:1234/v1",
    note: "Fetch models from your local LM Studio server.",
    models: [
      { id: "qwen2.5-coder-32b-instruct", name: "Qwen2.5 Coder 32B" },
      { id: "llama-3.1-8b-instruct", name: "Llama 3.1 8B" },
    ],
    local: true,
  },
  {
    id: "ollama",
    name: "Ollama",
    baseURL: "http://localhost:11434/v1",
    note: "Fetch models from your local Ollama server.",
    models: [
      { id: "llama3.1:8b", name: "Llama 3.1 8B" },
      { id: "qwen2.5-coder:7b", name: "Qwen2.5 Coder 7B" },
      { id: "qwen2.5-coder:32b", name: "Qwen2.5 Coder 32B" },
    ],
    local: true,
  },
  {
    id: "llamacpp",
    name: "llama.cpp",
    baseURL: "http://localhost:8080/v1",
    note: "Fetch models from a local llama.cpp server.",
    models: [
      { id: "qwen2.5-coder:7b", name: "Qwen2.5 Coder 7B" },
      { id: "llama3.1:8b", name: "Llama 3.1 8B" },
    ],
    local: true,
  },
  {
    id: "llamafile",
    name: "Llamafile",
    baseURL: "http://localhost:8080/v1",
    note: "Fetch models from a local llamafile server.",
    models: [
      { id: "llama3.1:8b", name: "Llama 3.1 8B" },
      { id: "codellama:7b-instruct", name: "CodeLlama 7B" },
    ],
    local: true,
  },
  {
    id: "lemonade",
    name: "Lemonade",
    baseURL: "http://localhost:8000/api/v1",
    note: "Fetch models from a local Lemonade server.",
    models: [
      { id: "llama3.1:8b", name: "Llama 3.1 8B" },
      { id: "qwen2.5-coder:7b", name: "Qwen2.5 Coder 7B" },
    ],
    local: true,
  },
  {
    id: "text-gen-webui",
    name: "Text Generation WebUI",
    baseURL: "http://localhost:5000/v1",
    note: "Fetch models from a local text-generation-webui server.",
    models: [
      { id: "mistral-7b", name: "Mistral 7B" },
      { id: "codellama-34b", name: "CodeLlama 34B" },
    ],
    local: true,
  },
  {
    id: "llamastack",
    name: "Llama Stack",
    baseURL: "http://localhost:8321/v1/openai/v1",
    note: "Fetch models from a local Llama Stack server.",
    models: [
      { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama 3.1 8B" },
      { id: "meta-llama/Llama-3.1-70B-Instruct", name: "Llama 3.1 70B" },
    ],
    local: true,
  },
  {
    id: "vllm",
    name: "vLLM",
    baseURL: "http://localhost:8000/v1",
    note: "Fetch models from a local vLLM OpenAI server.",
    models: [
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B" },
      { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B" },
    ],
    local: true,
  },
  {
    id: "docker",
    name: "Docker Model Runner",
    baseURL: "http://localhost:12434/engines/v1",
    note: "Fetch local Docker model runner models.",
    models: [
      { id: "ai/llama3.1", name: "Llama 3.1" },
      { id: "ai/qwen2.5-coder", name: "Qwen2.5 Coder" },
    ],
    local: true,
  },
]

export const PROVIDER_PRESET_IDS = new Set(PROVIDER_PRESETS.map((item) => item.id))

export function providerPreset(providerID: string) {
  return PROVIDER_PRESETS.find((item) => item.id === providerID)
}
