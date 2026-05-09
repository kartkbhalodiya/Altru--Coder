// altrucoder_change - new file
// Altru Coder-specific overrides for the server control plane.
// Imported by ../../server/server.ts with minimal altrucoder_change markers.

import { ModelCache } from "../../provider/model-cache"
import { InstanceStore } from "../../project/instance-store"

/** Extra paths to skip request logging for */
export function skipLogging(path: string): boolean {
  return path === "/telemetry/capture" || path === "/global/health"
}

/** Additional CORS origin check for *.altru-coder.ai */
export function corsOrigin(input: string): string | undefined {
  if (/^https:\/\/([a-z0-9-]+\.)*altru-coder\.ai$/.test(input)) {
    return input
  }
  return undefined
}

/** Invalidate model cache and provider state after auth change */
export async function authChanged(providerID: string) {
  ModelCache.clear(providerID)
  await InstanceStore.disposeAllInstances()
}

/** Run auth invalidation after the credential write response has been sent. */
export function authChangedLater(providerID: string) {
  setTimeout(() => {
    void authChanged(providerID).catch((error) => {
      console.warn(`[Altru Coder] auth invalidation failed for ${providerID}:`, error)
    })
  }, 0)
}

export const DOC_TITLE = "altru-coder"
export const DOC_DESCRIPTION = "altru-coder api"
