import { z } from "zod"
import { ALTRU_CODER_API_BASE } from "./constants.js"

/**
 * Altru Coder notification schema
 */
export const AltruCoderNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  action: z
    .object({
      actionText: z.string(),
      actionURL: z.string(),
    })
    .optional(),
  showIn: z.array(z.string()).optional(),
  suggestModelId: z.string().optional(),
})

export type AltruCoderNotification = z.infer<typeof AltruCoderNotificationSchema>

const NotificationsResponseSchema = z.object({
  notifications: z.array(AltruCoderNotificationSchema),
})

const NOTIFICATIONS_TIMEOUT_MS = 5000

/**
 * Fetch notifications from Altru Coder API
 *
 * @param options - Configuration with token and optional organization ID
 * @returns Array of notifications from the Altru Coder API (clients filter by showIn)
 */
export async function fetchAltruCoderNotifications(options: {
  altrucoderToken?: string
  altrucoderOrganizationId?: string
}): Promise<AltruCoderNotification[]> {
  const token = options.altrucoderToken
  if (!token) return []

  const url = `${ALTRU_CODER_API_BASE}/api/users/notifications`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(NOTIFICATIONS_TIMEOUT_MS),
    })

    if (!response.ok) return []

    const json = await response.json()
    const result = NotificationsResponseSchema.safeParse(json)

    if (!result.success) return []

    return result.data.notifications
  } catch {
    return []
  }
}
