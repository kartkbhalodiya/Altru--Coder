/**
 * Legacy Altru Coder CLI migration module
 *
 * Migrates authentication from the legacy Altru Coder VS Code extension CLI
 * config path (~/.altrucoder/cli/config.json) to the new auth.json format.
 */
import fs from "fs/promises"
import os from "os"
import path from "path"

export const LEGACY_CONFIG_PATH = path.join(os.homedir(), ".altrucoder", "cli", "config.json")

interface LegacyProvider {
  id: string
  provider: string
  altrucoderToken?: string
  altrucoderModel?: string
  altrucoderOrganizationId?: string
}

interface LegacyConfig {
  providers?: LegacyProvider[]
}

interface LegacyAltruCoderAuth {
  token: string
  organizationId?: string
}

// Auth info types matching opencode's Auth module
type ApiAuth = { type: "api"; key: string }
type OAuthAuth = { type: "oauth"; access: string; refresh: string; expires: number; accountId?: string }
type AuthInfo = ApiAuth | OAuthAuth

/**
 * Extract altru-coder auth from legacy config
 */
function extractAltruCoderAuth(config: LegacyConfig): LegacyAltruCoderAuth | undefined {
  if (!config.providers) return undefined

  const provider = config.providers.find((p) => p.provider === "altrucoder")
  if (!provider?.altrucoderToken) return undefined

  return {
    token: provider.altrucoderToken,
    organizationId: provider.altrucoderOrganizationId,
  }
}

/**
 * Migrate Altru Coder authentication from legacy CLI config path.
 *
 * Checks ~/.altrucoder/cli/config.json for existing altru-coder credentials
 * and migrates them to the new auth.json format.
 *
 * @param hasAltruCoderAuth - Callback to check if altru-coder auth already exists
 * @param saveAltruCoderAuth - Callback to save the migrated auth
 * @returns true if migration was performed, false otherwise
 */
export async function migrateLegacyAltruCoderAuth(
  hasAltruCoderAuth: () => Promise<boolean>,
  saveAltruCoderAuth: (auth: AuthInfo) => Promise<void>,
): Promise<boolean> {
  // Skip if altru-coder auth already configured
  if (await hasAltruCoderAuth()) return false

  // Check if legacy config exists and parse it
  const content = await fs.readFile(LEGACY_CONFIG_PATH, "utf-8").catch(() => null)
  if (!content) return false

  let config: LegacyConfig | null = null
  try {
    config = JSON.parse(content) as LegacyConfig
  } catch {
    return false
  }

  // Extract altru-coder auth from legacy config
  const legacy = extractAltruCoderAuth(config)
  if (!legacy) return false

  // Migrate to new format
  // Use OAuth format if organization ID present, otherwise API format
  if (legacy.organizationId) {
    await saveAltruCoderAuth({
      type: "oauth",
      access: legacy.token,
      refresh: "",
      expires: 0,
      accountId: legacy.organizationId,
    })
  } else {
    await saveAltruCoderAuth({
      type: "api",
      key: legacy.token,
    })
  }

  return true
}
