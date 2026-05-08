// Altru Coder notification types (mirrored from altru-coder-gateway)
export interface AltruCoderNotificationAction {
  actionText: string
  actionURL: string
}

export interface AltruCoderNotification {
  id: string
  title: string
  message: string
  action?: AltruCoderNotificationAction
  showIn?: string[]
  suggestModelId?: string
}

// Profile types from altru-coder-gateway
export interface AltruCoderBalance {
  balance: number
}

export interface ProfileData {
  profile: {
    email: string
    name?: string
    organizations?: Array<{ id: string; name: string; role: string }>
  }
  balance: AltruCoderBalance | null
  currentOrgId: string | null
}
