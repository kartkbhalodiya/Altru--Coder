export const NVIDIA_NIM_PROVIDER_ID = "nvidia"
export const NVIDIA_NIM_PROVIDER_NAME = "NVIDIA NIM"
export const NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
export const NVIDIA_KIMI_MODEL_ID = "moonshotai/kimi-k2.6"
export const NVIDIA_KIMI_MODEL_NAME = "Kimi K2.6"

const EFFORTS = ["low", "medium", "high", "xhigh"] as const

export const NVIDIA_NIM_MODEL_IDS = [
  "01-ai/yi-large",
  "abacusai/dracarys-llama-3.1-70b-instruct",
  "adept/fuyu-8b",
  "ai21labs/jamba-1.5-large-instruct",
  "aisingapore/sea-lion-7b-instruct",
  "baai/bge-m3",
  "bigcode/starcoder2-15b",
  "bytedance/seed-oss-36b-instruct",
  "databricks/dbrx-instruct",
  "deepseek-ai/deepseek-coder-6.7b-instruct",
  "deepseek-ai/deepseek-v4-flash",
  "deepseek-ai/deepseek-v4-pro",
  "google/codegemma-1.1-7b",
  "google/codegemma-7b",
  "google/deplot",
  "google/gemma-2-2b-it",
  "google/gemma-2b",
  "google/gemma-3-12b-it",
  "google/gemma-3-27b-it",
  "google/gemma-3-4b-it",
  "google/gemma-3n-e2b-it",
  "google/gemma-3n-e4b-it",
  "google/gemma-4-31b-it",
  "google/recurrentgemma-2b",
  "ibm/granite-3.0-3b-a800m-instruct",
  "ibm/granite-3.0-8b-instruct",
  "ibm/granite-34b-code-instruct",
  "ibm/granite-8b-code-instruct",
  "meta/codellama-70b",
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-1b-instruct",
  "meta/llama-3.2-3b-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "meta/llama-3.3-70b-instruct",
  "meta/llama-4-maverick-17b-128e-instruct",
  "meta/llama-guard-4-12b",
  "meta/llama2-70b",
  "microsoft/kosmos-2",
  "microsoft/phi-3-vision-128k-instruct",
  "microsoft/phi-3.5-moe-instruct",
  "microsoft/phi-4-mini-instruct",
  "microsoft/phi-4-multimodal-instruct",
  "minimaxai/minimax-m2.5",
  "minimaxai/minimax-m2.7",
  "mistralai/codestral-22b-instruct-v0.1",
  "mistralai/devstral-2-123b-instruct-2512",
  "mistralai/magistral-small-2506",
  "mistralai/ministral-14b-instruct-2512",
  "mistralai/mistral-7b-instruct-v0.3",
  "mistralai/mistral-large",
  "mistralai/mistral-large-2-instruct",
  "mistralai/mistral-large-3-675b-instruct-2512",
  "mistralai/mistral-medium-3-instruct",
  "mistralai/mistral-medium-3.5-128b",
  "mistralai/mistral-nemotron",
  "mistralai/mistral-small-4-119b-2603",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "mistralai/mixtral-8x22b-v0.1",
  "mistralai/mixtral-8x7b-instruct-v0.1",
  "moonshotai/kimi-k2-instruct",
  "moonshotai/kimi-k2-thinking",
  "moonshotai/kimi-k2.6",
  "nv-mistralai/mistral-nemo-12b-instruct",
  "nvidia/ai-synthetic-video-detector",
  "nvidia/cosmos-reason2-8b",
  "nvidia/embed-qa-4",
  "nvidia/gliner-pii",
  "nvidia/ising-calibration-1-35b-a3b",
  "nvidia/llama-3.1-nemoguard-8b-content-safety",
  "nvidia/llama-3.1-nemoguard-8b-topic-control",
  "nvidia/llama-3.1-nemotron-51b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "nvidia/llama-3.1-nemotron-nano-8b-v1",
  "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
  "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
  "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1",
  "nvidia/llama-3.2-nemoretriever-300m-embed-v1",
  "nvidia/llama-3.2-nv-embedqa-1b-v1",
  "nvidia/llama-3.2-nv-embedqa-1b-v2",
  "nvidia/llama-3.3-nemotron-super-49b-v1",
  "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  "nvidia/llama-nemotron-embed-1b-v2",
  "nvidia/llama-nemotron-embed-vl-1b-v2",
  "nvidia/llama3-chatqa-1.5-70b",
  "nvidia/mistral-nemo-minitron-8b-8k-instruct",
  "nvidia/nemoretriever-parse",
  "nvidia/nemotron-3-content-safety",
  "nvidia/nemotron-3-nano-30b-a3b",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/nemotron-4-340b-instruct",
  "nvidia/nemotron-4-340b-reward",
  "nvidia/nemotron-content-safety-reasoning-4b",
  "nvidia/nemotron-mini-4b-instruct",
  "nvidia/nemotron-nano-12b-v2-vl",
  "nvidia/nemotron-nano-3-30b-a3b",
  "nvidia/nemotron-parse",
  "nvidia/neva-22b",
  "nvidia/nv-embed-v1",
  "nvidia/nv-embedcode-7b-v1",
  "nvidia/nv-embedqa-e5-v5",
  "nvidia/nv-embedqa-mistral-7b-v2",
  "nvidia/nvclip",
  "nvidia/nvidia-nemotron-nano-9b-v2",
  "nvidia/riva-translate-4b-instruct",
  "nvidia/riva-translate-4b-instruct-v1.1",
  "nvidia/vila",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen2.5-coder-32b-instruct",
  "qwen/qwen3-coder-480b-a35b-instruct",
  "qwen/qwen3-next-80b-a3b-instruct",
  "qwen/qwen3-next-80b-a3b-thinking",
  "qwen/qwen3.5-122b-a10b",
  "qwen/qwen3.5-397b-a17b",
  "sarvamai/sarvam-m",
  "snowflake/arctic-embed-l",
  "stepfun-ai/step-3.5-flash",
  "stockmark/stockmark-2-100b-instruct",
  "upstage/solar-10.7b-instruct",
  "writer/palmyra-creative-122b",
  "writer/palmyra-fin-70b-32k",
  "writer/palmyra-med-70b",
  "writer/palmyra-med-70b-32k",
  "z-ai/glm-5.1",
  "z-ai/glm4.7",
  "z-ai/glm5",
  "zyphra/zamba2-7b-instruct",
] as const

const THINKING_IDS = new Set(["moonshotai/kimi-k2-thinking", NVIDIA_KIMI_MODEL_ID])

function name(id: string) {
  if (id === NVIDIA_KIMI_MODEL_ID) return NVIDIA_KIMI_MODEL_NAME
  return id
    .split("/")
    .map((part) => part.replace(/[._-]+/g, " ").replace(/\b\w/g, (item) => item.toUpperCase()))
    .join(" / ")
}

function reasoning(id: string) {
  const value = id.toLowerCase()
  return (
    THINKING_IDS.has(id) ||
    value.includes("reasoning") ||
    value.includes("thinking") ||
    value.includes("gpt-oss") ||
    value.includes("qwen3.5") ||
    value.includes("qwen3-next") ||
    value.includes("nemotron-3") ||
    value.includes("minimax-m2") ||
    value.includes("magistral") ||
    value.includes("deepseek-v4") ||
    value.includes("glm5") ||
    value.includes("glm-5") ||
    value.includes("glm4.7")
  )
}

function thinkingVariants() {
  return {
    normal: {},
    ...Object.fromEntries(EFFORTS.map((item) => [item, { chat_template_kwargs: { thinking: true } }])),
  }
}

export function nvidiaKimiModel() {
  return {
    id: NVIDIA_KIMI_MODEL_ID,
    name: NVIDIA_KIMI_MODEL_NAME,
    reasoning: true,
    variants: thinkingVariants(),
  }
}

export function nvidiaNimModels() {
  return NVIDIA_NIM_MODEL_IDS.map((id) => {
    if (id === NVIDIA_KIMI_MODEL_ID) return nvidiaKimiModel()
    const supports = reasoning(id)
    return {
      id,
      name: name(id),
      ...(supports ? { reasoning: true as const } : {}),
      ...(THINKING_IDS.has(id) ? { variants: thinkingVariants() } : {}),
    }
  })
}
