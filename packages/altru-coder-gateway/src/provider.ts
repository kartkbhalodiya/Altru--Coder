import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createAlibaba } from "@ai-sdk/alibaba"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { AltruCoderProvider, AltruCoderProviderOptions } from "./types.js"
import { getApiKey } from "./auth/token.js"
import { buildAltruCoderHeaders, getDefaultHeaders } from "./headers.js"
import {
  ANONYMOUS_API_KEY,
  ENV_NVIDIA_API_KEY,
  NVIDIA_NIM_BASE,
  NVIDIA_NIM_GPT_OSS_120B_MODEL,
  OPENCODE_ZEN_PUBLIC_API_KEY,
  OPENCODE_ZEN_PUBLIC_BASE,
  OPENCODE_ZEN_PUBLIC_MODEL_MAP,
} from "./api/constants.js"
import { resolveAltruCoderOpenRouterBaseUrl } from "./api/url.js"

const REASONING_KEYS = new Set([
  "reasoning",
  "reasoning_content",
  "reasoning_details",
  "reasoning_text",
  "reasoning_tokens",
])

function clean(value: unknown): unknown {
  if (!value || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(clean)
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !REASONING_KEYS.has(key))
      .map(([key, item]) => [key, clean(item)]),
  )
}

function headers(source: Headers) {
  const next = new Headers(source)
  next.delete("content-length")
  return next
}

function line(value: string) {
  if (!value.startsWith("data:")) return value
  const raw = value.slice(5).trim()
  if (!raw || raw === "[DONE]") return value
  try {
    return `data: ${JSON.stringify(clean(JSON.parse(raw)))}`
  } catch {
    return value
  }
}

async function strip(response: Response) {
  const type = response.headers.get("content-type") ?? ""
  if (type.includes("text/event-stream") && response.body) {
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    let buffer = ""
    const stream = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          buffer += decoder.decode(chunk, { stream: true })
          const rows = buffer.split(/\r?\n/)
          buffer = rows.pop() ?? ""
          for (const row of rows) {
            controller.enqueue(encoder.encode(`${line(row)}\n`))
          }
        },
        flush(controller) {
          buffer += decoder.decode()
          if (buffer) controller.enqueue(encoder.encode(line(buffer)))
        },
      }),
    )
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: headers(response.headers),
    })
  }

  if (!type.includes("application/json")) return response
  const raw = await response.text()
  try {
    return new Response(JSON.stringify(clean(JSON.parse(raw))), {
      status: response.status,
      statusText: response.statusText,
      headers: headers(response.headers),
    })
  } catch {
    return new Response(raw, {
      status: response.status,
      statusText: response.statusText,
      headers: headers(response.headers),
    })
  }
}

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
  const bearerFetch = (key: string | undefined, scrub = false) => {
    return async (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      if (key) headers.set("Authorization", `Bearer ${key}`)
      const response = await originalFetch(input, {
        ...init,
        headers,
      })
      return scrub ? strip(response) : response
    }
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
  const nvidiaKey = options.nvidiaApiKey ?? process.env[ENV_NVIDIA_API_KEY]
  const nvidiaFetch = bearerFetch(nvidiaKey, true)
  const publicFetch = bearerFetch(OPENCODE_ZEN_PUBLIC_API_KEY, true)
  const nvidia = createOpenAICompatible({
    baseURL: NVIDIA_NIM_BASE,
    apiKey: nvidiaKey,
    name: "openaiCompatible",
    fetch: nvidiaFetch as typeof fetch,
    transformRequestBody(body) {
      return { ...body, reasoning: { exclude: true } }
    },
  })
  const opencode = createOpenAICompatible({
    baseURL: OPENCODE_ZEN_PUBLIC_BASE,
    apiKey: OPENCODE_ZEN_PUBLIC_API_KEY,
    name: "openaiCompatible",
    fetch: publicFetch as typeof fetch,
    transformRequestBody(body) {
      return { ...body, reasoning: { exclude: true } }
    },
  })

  return {
    languageModel(modelId) {
      const publicId = OPENCODE_ZEN_PUBLIC_MODEL_MAP[modelId as keyof typeof OPENCODE_ZEN_PUBLIC_MODEL_MAP]
      if (publicId) return opencode(publicId)
      if (modelId === NVIDIA_NIM_GPT_OSS_120B_MODEL && nvidiaKey) return nvidia(modelId)
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
