import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createAlibaba } from "@ai-sdk/alibaba"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { AltruCoderProvider, AltruCoderProviderOptions } from "./types.js"
import { getApiKey } from "./auth/token.js"
import { buildAltruCoderHeaders, getDefaultHeaders } from "./headers.js"
import { ANONYMOUS_API_KEY } from "./api/constants.js"
import { resolveAltruCoderOpenRouterBaseUrl } from "./api/url.js"

/**
 * Create a AltruCoder provider instance
 *
 * This provider wraps the OpenRouter SDK with AltruCoder-specific configuration
 * including custom authentication, headers, and base URL.
 *
 * @example
 * ```typescript
 * const provider = createAltruCoder({
 *   altrucoderToken: "your-token-here",
 *   altrucoderOrganizationId: "org-123"
 * })
 *
 * const model = provider.languageModel("anthropic/claude-sonnet-4")
 * ```
 */
export function createAltruCoder(options: AltruCoderProviderOptions = {}): AltruCoderProvider {
  // Get API key from options or environment
  const apiKey = getApiKey(options)

  const openRouterUrl = resolveAltruCoderOpenRouterBaseUrl({ baseURL: options.baseURL, token: apiKey })

  // Merge custom headers with defaults
  const customHeaders = {
    ...getDefaultHeaders(),
    ...buildAltruCoderHeaders(undefined, {
      altrucoderOrganizationId: options.altrucoderOrganizationId,
      altrucoderTesterWarningsDisabledUntil: undefined,
    }),
    ...options.headers,
  }

  // Create custom fetch wrapper to add dynamic headers
  const originalFetch = options.fetch ?? fetch
  const wrappedFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers)

    // Add custom headers
    Object.entries(customHeaders).forEach(([key, value]) => {
      headers.set(key, value)
    })

    // Add authorization if API key exists
    if (apiKey) {
      headers.set("Authorization", `Bearer ${apiKey}`)
    }

    return originalFetch(input, {
      ...init,
      headers,
    })
  }

  const sdkOptions = {
    baseURL: openRouterUrl,
    apiKey: apiKey ?? ANONYMOUS_API_KEY,
    headers: customHeaders,
    fetch: wrappedFetch as typeof fetch,
  }

  const openrouter = createOpenRouter(sdkOptions)
  const alibaba = createAlibaba(sdkOptions)
  const anthropic = createAnthropic(sdkOptions)
  const openai = createOpenAI(sdkOptions)
  const openaiCompatible = createOpenAICompatible({ ...sdkOptions, name: "openaiCompatible" })

  return {
    languageModel(modelId) {
      return openrouter(modelId)
    },
    embeddingModel(modelId: string) {
      return openrouter.textEmbeddingModel(modelId)
    },
    rerankingModel(modelId: string): never {
      throw new Error(`Reranking model not supported: ${modelId}`)
    },
    imageModel(modelId) {
      return openrouter.imageModel(modelId)
    },
    alibaba(modelId) {
      return alibaba(modelId)
    },
    anthropic(modelId) {
      return anthropic(modelId)
    },
    openai(modelId) {
      return openai(modelId)
    },
    openaiCompatible(modelId) {
      return openaiCompatible(modelId)
    },
  }
}
