/**
 * Altru Coder Gateway Configuration Constants
 * Centralized configuration for all API endpoints, headers, and settings
 */

/** Environment variable for custom Altru Coder API URL */
export const ENV_ALTRU_CODER_API_URL = "ALTRU_CODER_API_URL"

/** Default Altru Coder API URL */
export const DEFAULT_ALTRU_CODER_API_URL = "https://api.altru-coder.ai"

/** Base URL for Altru Coder API - can be overridden by ALTRU_CODER_API_URL env var */
export const ALTRU_CODER_API_BASE = process.env[ENV_ALTRU_CODER_API_URL] || DEFAULT_ALTRU_CODER_API_URL

/** Environment variable for custom Altru Coder Chat URL */
export const ALTRU_CODER_CHAT_URL_ENV = "ALTRU_CODER_CHAT_URL"

/** Default Altru Coder Chat URL (REST endpoint for messages, conversations, etc.) */
export const ALTRU_CODER_DEFAULT_CHAT_URL = "https://chat.altru-coderapps.io"

/** Base URL for Altru Coder Chat - can be overridden by ALTRU_CODER_CHAT_URL env var */
export const ALTRU_CODER_CHAT_URL = process.env[ALTRU_CODER_CHAT_URL_ENV] || ALTRU_CODER_DEFAULT_CHAT_URL

/** Environment variable for custom Event Service URL */
export const ALTRU_CODER_EVENT_SERVICE_URL_ENV = "EVENT_SERVICE_URL"

/** Default Event Service URL (WebSocket endpoint for altru-coder-chat events) */
export const ALTRU_CODER_DEFAULT_EVENT_SERVICE_URL = "wss://events.altru-coderapps.io"

/** Base URL for Event Service - can be overridden by EVENT_SERVICE_URL env var */
export const ALTRU_CODER_EVENT_SERVICE_URL = process.env[ALTRU_CODER_EVENT_SERVICE_URL_ENV] || ALTRU_CODER_DEFAULT_EVENT_SERVICE_URL

/** Default base URL for OpenRouter-compatible endpoint */
export const ALTRU_CODER_OPENROUTER_BASE = `${ALTRU_CODER_API_BASE}/api/openrouter`

/** Environment variable for NVIDIA NIM API key */
export const ENV_NVIDIA_API_KEY = "NVIDIA_API_KEY"

/** Official NVIDIA NIM OpenAI-compatible endpoint */
export const NVIDIA_NIM_BASE = "https://integrate.api.nvidia.com/v1"

/** Altru built-in GPT OSS model routed through NVIDIA NIM */
export const NVIDIA_NIM_GPT_OSS_120B_MODEL = "openai/gpt-oss-120b"

/** OpenCode Zen public OpenAI-compatible endpoint for free Altru built-ins */
export const OPENCODE_ZEN_PUBLIC_BASE = "https://opencode.ai/zen/v1"

/** Public token used by OpenCode for zero-cost Zen models */
export const OPENCODE_ZEN_PUBLIC_API_KEY = "public"

/** Altru-branded model IDs routed through OpenCode Zen public free models */
export const OPENCODE_ZEN_PUBLIC_MODEL_MAP = {
  "altru-coder-auto/free": "nemotron-3-super-free",
  "altru-coder/big-pickle-free": "big-pickle",
  "altru-coder/hy3-preview-free": "hy3-preview-free",
  "altru-coder/minimax-m2.5-free": "minimax-m2.5-free",
  "altru-coder/nemotron-3-super-free": "nemotron-3-super-free",
} as const

/** Free tier usage window before quota reset */
export const ALTRU_CODER_FREE_RESET_MS = 48 * 60 * 60 * 1000

/** Free tier token budget per reset window */
export const ALTRU_CODER_FREE_TOKEN_LIMIT = 200_000

/** Target context window for the default free auto model */
export const ALTRU_CODER_FREE_CONTEXT_WINDOW = 1_000_000

/** Device auth polling interval in milliseconds */
export const POLL_INTERVAL_MS = 3000

/** Default model for authenticated users */
export const DEFAULT_MODEL = "altru-coder-auto/balanced"

/** Default model for anonymous/free usage */
export const DEFAULT_FREE_MODEL = "altru-coder-auto/free"

/** Token expiration duration in milliseconds (1 year) */
export const TOKEN_EXPIRATION_MS = 365 * 24 * 60 * 60 * 1000

/** User-Agent header base value for requests */
export const USER_AGENT_BASE = "opencode-altru-coder-provider"

/** Content-Type header value for requests */
export const CONTENT_TYPE = "application/json"

/** Default provider name */
export const DEFAULT_PROVIDER_NAME = "altru-coder"

/** Default API key for anonymous requests */
export const ANONYMOUS_API_KEY = "anonymous"

/** Fetch timeout for model requests in milliseconds (10 seconds) */
export const MODELS_FETCH_TIMEOUT_MS = 10 * 1000

/**
 * Header constants for AltruCoder API requests
 */
export const HEADER_ORGANIZATIONID = "X-ALTRUCODER-ORGANIZATIONID"
export const HEADER_TASKID = "X-ALTRUCODER-TASKID"
export const HEADER_PROJECTID = "X-ALTRUCODER-PROJECTID"
export const HEADER_TESTER = "X-ALTRUCODER-TESTER"
export const HEADER_EDITORNAME = "X-ALTRUCODER-EDITORNAME"
export const HEADER_MACHINEID = "X-ALTRUCODER-MACHINEID"

/** Default editor name value */
export const DEFAULT_EDITOR_NAME = "Altru Coder CLI"

/** Environment variable name for custom editor name */
export const ENV_EDITOR_NAME = "ALTRUCODER_EDITOR_NAME"

/** Environment variable name for version (set by CLI at startup) */
export const ENV_VERSION = "ALTRUCODER_VERSION"

/** Tester header value for suppressing warnings */
export const TESTER_SUPPRESS_VALUE = "SUPPRESS"

/** Header name for feature tracking */
export const HEADER_FEATURE = "X-ALTRUCODER-FEATURE"

/** Environment variable name for feature override */
export const ENV_FEATURE = "ALTRUCODER_FEATURE"

export const PROMPTS = [
  "codex",
  "gemini",
  "beast",
  "anthropic",
  "trinity",
  "anthropic_without_todo",
  "ling",
  "gpt55",
] as const

export const AI_SDK_PROVIDERS = ["alibaba", "anthropic", "openai", "openai-compatible", "openrouter"] as const
