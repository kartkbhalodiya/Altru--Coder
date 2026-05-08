/**
 * Authentication handlers.
 *
 * Login prefers the Altru website bridge at https://altrucoder.vercel.app so
 * Google sign-in, email/password OTP, and website fallback UI stay in one place.
 * If that bridge is unavailable, the existing provider device-auth flow remains
 * as a fallback.
 */

import crypto from "node:crypto"
import type { AltruCoderClient } from "@altru-coder/sdk/v2/client"
import { getErrorMessage } from "../../altru-coder-provider-utils"

const WEBSITE_AUTH_BASE = "https://altrucoder.vercel.app"
const WEBSITE_LOGIN_TIMEOUT_MS = 5 * 60 * 1000
const WEBSITE_LOGIN_POLL_MS = 3000
export const WEBSITE_SESSION_KEY = "altru-coder.websiteSession"

export interface WebsiteLoginSession {
  email: string
  name?: string
  method?: string
  picture?: string
  loggedInAt?: string
  token?: string
  access?: string
  accessToken?: string
  apiKey?: string
  altrucoderToken?: string
  refresh?: string
  refreshToken?: string
  expires?: number | string
  expiresAt?: number | string
}

export interface WebsiteProfileData {
  profile: {
    email: string
    name?: string
    organizations?: Array<{ id: string; name: string; role: string }>
  }
  balance: null
  currentOrgId: null
}

export interface AuthContext {
  readonly client: AltruCoderClient | null
  postMessage(msg: unknown): void
  getWorkspaceDirectory(): string
  disposeGlobal(): Promise<void>
  fetchAndSendProviders(): Promise<void>
  fetchAndSendAgents(): Promise<void>
  openExternal(url: string): void | Promise<void>
  getWebsiteSession(): WebsiteLoginSession | undefined
  setWebsiteSession(session: WebsiteLoginSession | undefined): Promise<void>
}

function text(input: unknown) {
  if (typeof input !== "string") return undefined
  const value = input.trim()
  return value || undefined
}

function record(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object") return undefined
  return input as Record<string, unknown>
}

function normalizeWebsiteSession(input: unknown): WebsiteLoginSession | undefined {
  const item = record(input)
  if (!item) return

  const email = text(item.email)?.toLowerCase()
  if (!email || !email.includes("@")) return

  return {
    email,
    ...(text(item.name) && { name: text(item.name) }),
    ...(text(item.method) && { method: text(item.method) }),
    ...(text(item.picture) && { picture: text(item.picture) }),
    ...(text(item.loggedInAt) && { loggedInAt: text(item.loggedInAt) }),
    ...(text(item.token) && { token: text(item.token) }),
    ...(text(item.access) && { access: text(item.access) }),
    ...(text(item.accessToken) && { accessToken: text(item.accessToken) }),
    ...(text(item.apiKey) && { apiKey: text(item.apiKey) }),
    ...(text(item.altrucoderToken) && { altrucoderToken: text(item.altrucoderToken) }),
    ...(text(item.refresh) && { refresh: text(item.refresh) }),
    ...(text(item.refreshToken) && { refreshToken: text(item.refreshToken) }),
    ...((typeof item.expires === "number" || typeof item.expires === "string") && { expires: item.expires }),
    ...((typeof item.expiresAt === "number" || typeof item.expiresAt === "string") && { expiresAt: item.expiresAt }),
  }
}

export function profileFromWebsiteSession(session: WebsiteLoginSession | undefined): WebsiteProfileData | null {
  if (!session) return null
  return {
    profile: {
      email: session.email,
      ...(session.name && { name: session.name }),
      organizations: [],
    },
    balance: null,
    currentOrgId: null,
  }
}

function token(session: WebsiteLoginSession) {
  return session.altrucoderToken ?? session.accessToken ?? session.access ?? session.token ?? session.apiKey
}

function expiry(session: WebsiteLoginSession) {
  const raw = session.expiresAt ?? session.expires
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw
  if (typeof raw === "string") {
    const asNumber = Number(raw)
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber
    const asDate = Date.parse(raw)
    if (Number.isFinite(asDate) && asDate > 0) return asDate
  }
  return Date.now() + 365 * 24 * 60 * 60 * 1000
}

function rand(bytes: number) {
  return crypto.randomBytes(bytes).toString("base64url")
}

function challenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url")
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function readJson(response: Response) {
  const body = await response.text()
  if (!body) return undefined
  try {
    return JSON.parse(body) as unknown
  } catch {
    return undefined
  }
}

function errorMessage(payload: unknown, fallback: string) {
  const item = record(payload)
  return text(item?.error) ?? text(item?.message) ?? fallback
}

async function consumeWebsiteLogin(state: string, verifier: string) {
  const response = await fetch(`${WEBSITE_AUTH_BASE}/api/auth/extension/consume-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, codeVerifier: verifier }),
  })
  const payload = await readJson(response)
  if (response.status === 202) return { status: "pending" as const }
  if (!response.ok) {
    throw new Error(errorMessage(payload, `Website login failed (${response.status})`))
  }

  const session = normalizeWebsiteSession(record(payload)?.session)
  if (!session) throw new Error("Website login did not return a valid session.")
  return { status: "success" as const, session }
}

async function handleWebsiteLogin(ctx: AuthContext, attempt: number, getAttempt: () => number) {
  if (!ctx.client) return

  const state = rand(18)
  const verifier = rand(48)
  const url = new URL("/login.html", WEBSITE_AUTH_BASE)
  url.searchParams.set("source", "vscode")
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", challenge(verifier))

  ctx.postMessage({
    type: "deviceAuthStarted",
    verificationUrl: url.toString(),
    expiresIn: Math.round(WEBSITE_LOGIN_TIMEOUT_MS / 1000),
  })

  await Promise.resolve(ctx.openExternal(url.toString())).catch((err) => {
    console.warn("[Altru Coder New] AltruCoderProvider: Failed to open website login:", err)
  })

  const started = Date.now()
  while (Date.now() - started < WEBSITE_LOGIN_TIMEOUT_MS) {
    if (attempt !== getAttempt()) return
    const result = await consumeWebsiteLogin(state, verifier)
    if (result.status === "pending") {
      await sleep(WEBSITE_LOGIN_POLL_MS)
      continue
    }

    const access = token(result.session)
    if (access) {
      await ctx.client.auth.set(
        {
          providerID: "altru-coder",
          auth: {
            type: "oauth",
            access,
            refresh: result.session.refreshToken ?? result.session.refresh ?? access,
            expires: expiry(result.session),
          },
        },
        { throwOnError: true },
      )
      await ctx.setWebsiteSession(undefined)
    } else {
      await ctx.client.auth.remove({ providerID: "altru-coder" }).catch(() => undefined)
      await ctx.setWebsiteSession(result.session)
    }

    await ctx.disposeGlobal()
    const fallback = profileFromWebsiteSession(result.session)
    const profile = access ? (await ctx.client.altruCoder.profile().catch(() => ({ data: fallback }))).data : fallback
    ctx.postMessage({ type: "profileData", data: profile ?? fallback })
    ctx.postMessage({ type: "deviceAuthComplete" })
    return
  }

  throw new Error("Website login expired before sign-in completed.")
}

async function handleDeviceLogin(ctx: AuthContext, attempt: number, getAttempt: () => number): Promise<void> {
  if (!ctx.client) return

  const dir = ctx.getWorkspaceDirectory()
  const { data: auth } = await ctx.client.provider.oauth.authorize(
    { providerID: "altru-coder", method: 0, directory: dir },
    { throwOnError: true },
  )
  console.log("[Altru Coder New] AltruCoderProvider: got device auth URL:", auth.url)

  const match = auth.instructions?.match(/code:\s*(\S+)/i)
  const code = match ? match[1] : undefined

  ctx.postMessage({
    type: "deviceAuthStarted",
    code,
    verificationUrl: auth.url,
    expiresIn: 900,
  })

  await ctx.client.provider.oauth.callback({ providerID: "altru-coder", method: 0, directory: dir }, { throwOnError: true })
  if (attempt !== getAttempt()) return

  await ctx.setWebsiteSession(undefined)
  await ctx.disposeGlobal()

  const { data: profile } = await ctx.client.altruCoder.profile(undefined, { throwOnError: true })
  ctx.postMessage({ type: "profileData", data: profile })
  ctx.postMessage({ type: "deviceAuthComplete" })
}

/**
 * Handle login through the website bridge first, then fallback to provider device auth.
 *
 * @param attempt - The current login attempt counter value (pre-incremented by caller).
 * @param getAttempt - Returns the latest attempt counter (may have changed if user cancelled).
 */
export async function handleLogin(ctx: AuthContext, attempt: number, getAttempt: () => number): Promise<void> {
  if (!ctx.client) return

  console.log("[Altru Coder New] AltruCoderProvider: starting login flow")

  try {
    await handleWebsiteLogin(ctx, attempt, getAttempt)
  } catch (error) {
    console.warn("[Altru Coder New] AltruCoderProvider: Website login failed, using device fallback:", error)
    try {
      await handleDeviceLogin(ctx, attempt, getAttempt)
    } catch (fallbackError) {
      if (attempt !== getAttempt()) return
      ctx.postMessage({
        type: "deviceAuthFailed",
        error: getErrorMessage(fallbackError) || getErrorMessage(error) || "Login failed",
      })
    }
  }
}

/** Handle logout: remove auth credentials and clear profile. */
export async function handleLogout(ctx: AuthContext): Promise<void> {
  if (!ctx.client) return

  try {
    console.log("[Altru Coder New] AltruCoderProvider: logging out")
    await ctx.client.auth.remove({ providerID: "altru-coder" }, { throwOnError: true })
    await ctx.setWebsiteSession(undefined)
    console.log("[Altru Coder New] AltruCoderProvider: logged out successfully")
    ctx.postMessage({ type: "profileData", data: null })

    await ctx.disposeGlobal()
    await ctx.fetchAndSendProviders()
  } catch (error) {
    console.error("[Altru Coder New] AltruCoderProvider: logout failed:", error)
    ctx.postMessage({
      type: "error",
      message: getErrorMessage(error) || "Failed to logout",
    })
  }
}

/**
 * Handle organization switch.
 * Persists the selection and refreshes profile + providers since both change with org context.
 */
export async function handleSetOrganization(ctx: AuthContext, organizationId: string | null): Promise<void> {
  if (!ctx.client) return

  console.log("[Altru Coder New] AltruCoderProvider: Switching organization:", organizationId ?? "personal")
  try {
    await ctx.client.altruCoder.organization.set({ organizationId }, { throwOnError: true })
  } catch (error) {
    console.error("[Altru Coder New] AltruCoderProvider: Failed to switch organization:", error)
    try {
      const result = await ctx.client.altruCoder.profile()
      ctx.postMessage({ type: "profileData", data: result.data ?? profileFromWebsiteSession(ctx.getWebsiteSession()) })
    } catch (profileError) {
      console.error("[Altru Coder New] AltruCoderProvider: Failed to refresh profile after org switch error:", profileError)
    }
    return
  }

  await ctx.disposeGlobal()

  try {
    const result = await ctx.client.altruCoder.profile()
    ctx.postMessage({ type: "profileData", data: result.data ?? profileFromWebsiteSession(ctx.getWebsiteSession()) })
  } catch (error) {
    console.error("[Altru Coder New] AltruCoderProvider: Failed to refresh profile after org switch:", error)
  }
  try {
    await ctx.fetchAndSendProviders()
  } catch (error) {
    console.error("[Altru Coder New] AltruCoderProvider: Failed to refresh providers after org switch:", error)
  }
  try {
    await ctx.fetchAndSendAgents()
  } catch (error) {
    console.error("[Altru Coder New] AltruCoderProvider: Failed to refresh agents after org switch:", error)
  }
}

/** Handle profile refresh request. */
export async function handleRefreshProfile(ctx: AuthContext): Promise<void> {
  if (!ctx.client) return

  console.log("[Altru Coder New] AltruCoderProvider: refreshing profile")
  const result = await ctx.client.altruCoder.profile().catch(() => ({ data: null }))
  ctx.postMessage({ type: "profileData", data: result.data ?? profileFromWebsiteSession(ctx.getWebsiteSession()) })
}
