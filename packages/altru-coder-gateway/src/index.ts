// ============================================================================
// Plugin
// ============================================================================
export { AltruCoderAuthPlugin, default } from "./plugin.js"

// ============================================================================
// Provider
// ============================================================================
export { createAltruCoder } from "./provider.js"
export { createAltruCoderDebug } from "./provider-debug.js"
export { altruCustomLoader } from "./loader.js"
export { buildAltruCoderHeaders, getEditorNameHeader, getFeatureHeader, getDefaultHeaders, getUserAgent } from "./headers.js"

// ============================================================================
// Auth
// ============================================================================
export { authenticateWithDeviceAuth } from "./auth/device-auth.js"
export { authenticateWithDeviceAuthTUI } from "./auth/device-auth-tui.js"
export { getAltruCoderUrlFromToken, isValidAltruCoderToken, getApiKey } from "./auth/token.js"
export { poll, formatTimeRemaining } from "./auth/polling.js"
export { migrateLegacyAltruCoderAuth, LEGACY_CONFIG_PATH } from "./auth/legacy-migration.js"

// ============================================================================
// API
// ============================================================================
export {
  fetchProfile,
  fetchBalance,
  fetchProfileWithBalance,
  fetchDefaultModel,
  getAltruCoderProfile,
  getAltruCoderBalance,
  getAltruCoderDefaultModel,
  promptOrganizationSelection,
} from "./api/profile.js"
export { fetchAltruCoderModels } from "./api/models.js"
export {
  EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG,
  fetchAltruCoderEmbeddingModelCatalog,
  type AltruCoderEmbeddingModel,
  type AltruCoderEmbeddingModelCatalog,
} from "./api/embedding-models.js"
export { resolveAltruCoderGatewayBaseUrl, resolveAltruCoderOpenRouterBaseUrl } from "./api/url.js"
export {
  fetchOrganizationModes,
  clearModesCache,
  type OrganizationMode,
  type OrganizationModeConfig,
} from "./api/modes.js"
export { fetchAltruCoderNotifications, type AltruCoderNotification } from "./api/notifications.js"

// ============================================================================
// Server Routes (optional - requires hono and OpenCode dependencies)
// ============================================================================
export { createAltruCoderRoutes } from "./server/routes.js"

// ============================================================================
// Note: TUI exports moved to separate entry point
// ============================================================================
// For TUI components and commands, import from "@altru-coder/altru-coder-gateway/tui"
// This avoids circular dependencies with opencode TUI infrastructure

// ============================================================================
// Types
// ============================================================================
export type {
  // Auth types
  DeviceAuthInitiateResponse,
  DeviceAuthPollResponse,
  Organization,
  AltruCoderProfile,
  AltruCoderBalance,
  PollOptions,
  PollResult,
  // Provider types
  AltruCoderProvider,
  AltruCoderProviderOptions,
  AltruCoderMetadata,
  CustomLoaderResult,
  ProviderInfo,
  LanguageModelV3,
} from "./types.js"

// ============================================================================
// Constants
// ============================================================================
export {
  ENV_ALTRU_CODER_API_URL,
  DEFAULT_ALTRU_CODER_API_URL,
  ALTRU_CODER_API_BASE,
  ALTRU_CODER_OPENROUTER_BASE,
  ENV_NVIDIA_API_KEY,
  NVIDIA_NIM_BASE,
  NVIDIA_NIM_GPT_OSS_120B_MODEL,
  ALTRU_CODER_FREE_CONTEXT_WINDOW,
  ALTRU_CODER_FREE_RESET_MS,
  ALTRU_CODER_FREE_TOKEN_LIMIT,
  OPENCODE_ZEN_PUBLIC_API_KEY,
  OPENCODE_ZEN_PUBLIC_BASE,
  OPENCODE_ZEN_PUBLIC_MODEL_MAP,
  POLL_INTERVAL_MS,
  DEFAULT_MODEL,
  DEFAULT_FREE_MODEL,
  TOKEN_EXPIRATION_MS,
  USER_AGENT_BASE,
  CONTENT_TYPE,
  DEFAULT_PROVIDER_NAME,
  ANONYMOUS_API_KEY,
  MODELS_FETCH_TIMEOUT_MS,
  HEADER_ORGANIZATIONID,
  HEADER_TASKID,
  HEADER_PROJECTID,
  HEADER_TESTER,
  HEADER_EDITORNAME,
  HEADER_MACHINEID,
  HEADER_FEATURE,
  DEFAULT_EDITOR_NAME,
  ENV_EDITOR_NAME,
  ENV_VERSION,
  TESTER_SUPPRESS_VALUE,
  ENV_FEATURE,
  PROMPTS,
  AI_SDK_PROVIDERS,
} from "./api/constants.js"
