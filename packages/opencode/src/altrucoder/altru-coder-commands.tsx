/**
 * Altru Coder Gateway Commands for TUI
 *
 * Provides /profile and /teams commands that are only visible when connected to Altru Coder Gateway.
 */

import { createMemo } from "solid-js"
import { useCommandDialog } from "@tui/component/dialog-command"
import { useSync } from "@tui/context/sync"
import { useRoute } from "@tui/context/route"
import { useDialog } from "@tui/ui/dialog"
import { useToast } from "@tui/ui/toast"
import { DialogAlert } from "@tui/ui/dialog-alert"
import type { Organization } from "@altru-coder/altru-coder-gateway"
import type { ClawStatus } from "./claw/types.js"
import { DialogAltruCoderTeamSelect } from "./components/dialog-altru-coder-team-select.js"
import { DialogAltruCoderProfile } from "./components/dialog-altru-coder-profile.js"
import { DialogClawSetup } from "./components/dialog-claw-setup.js"
import { DialogClawUpgrade } from "./components/dialog-claw-upgrade.js"
import { DialogIndexing } from "./components/dialog-indexing.js"
import { indexingEnabled } from "./indexing-feature"

// These types are OpenCode-internal and imported at runtime
type UseSDK = any
type SDK = any

/**
 * Register all Altru Coder Gateway commands
 * Call this from a component inside the TUI app
 *
 * @param useSDK - OpenCode's useSDK hook (passed from TUI context)
 */
export function registerAltruCoderCommands(useSDK: () => UseSDK) {
  const command = useCommandDialog()
  const sync = useSync()
  const route = useRoute()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()

  // Only show Altru Coder commands when connected to Altru Coder Gateway
  const isAltruCoderConnected = createMemo(() => {
    return sync.data.provider_next.connected.includes("altru-coder")
  })
  const indexing = createMemo(() => indexingEnabled(sync.data.config))

  command.register(() => [
    // /altru-coder-claw command
    {
      value: "altru-coder.claw",
      title: "AltruCoderClaw",
      description: "Open AltruCoderClaw chat & dashboard",
      category: "Altru Coder",
      slash: { name: "altru-coder-claw", aliases: ["claw"] },
      enabled: isAltruCoderConnected(),
      hidden: !isAltruCoderConnected(),
      onSelect: async () => {
        // Fetch profile (for org context) and instance status in parallel
        const [profileRes, res] = await Promise.all([
          sdk.client.altruCoder.profile().catch(() => null),
          sdk.client.altruCoder.claw.status().catch(() => null),
        ])
        const orgId = profileRes?.data?.currentOrgId ?? null
        const status = res?.data as ClawStatus | undefined

        // No instance provisioned
        if (!status || !status.userId || res.error) {
          dialog.replace(() => <DialogClawSetup orgId={orgId} />)
          return
        }

        // Instance exists — check for chat credentials
        const creds = await sdk.client.altruCoder.claw.chatCredentials().catch(() => null)

        if (!creds?.data || creds.error) {
          // Instance exists but no chat credentials — needs upgrade
          dialog.replace(() => <DialogClawUpgrade orgId={orgId} />)
          return
        }

        // Everything ready — navigate to full-screen chat view
        route.navigate({ type: "altru-coder-claw" })
        dialog.clear()
      },
    },

    // /remote command
    {
      value: "remote.toggle",
      title: "Toggle remote",
      description: "Enable or disable remote session relay",
      category: "Altru Coder",
      slash: { name: "remote" },
      enabled: isAltruCoderConnected(),
      hidden: !isAltruCoderConnected(),
      onSelect: async () => {
        try {
          const current = await sdk.client.remote.status()

          if (current.error || !current.data) {
            dialog.replace(() => <DialogAlert title="Error" message="Failed to fetch remote status." />)
            return
          }

          if (current.data.enabled) {
            await sdk.client.remote.disable()
            toast.show({ message: "Remote disabled", variant: "success" })
          } else {
            const result = await sdk.client.remote.enable()
            if (result.error) {
              const err = result.error as { error?: string }
              const msg = err?.error ?? "Failed to enable remote."
              dialog.replace(() => <DialogAlert title="Error" message={msg} />)
              return
            }
            toast.show({ message: "Remote enabled", variant: "success" })
          }

          dialog.clear()
        } catch (error) {
          dialog.replace(() => <DialogAlert title="Error" message={`Failed to toggle remote: ${error}`} />)
        }
      },
    },

    // /profile command
    {
      value: "altru-coder.profile",
      title: "Profile",
      description: "View your Altru Coder Gateway profile",
      category: "Altru Coder",
      slash: { name: "profile", aliases: ["me", "whoami"] },
      enabled: isAltruCoderConnected(),
      hidden: !isAltruCoderConnected(),
      onSelect: async () => {
        try {
          // Fetch profile and balance using server endpoint
          const response = await sdk.client.altruCoder.profile()

          if (response.error || !response.data) {
            dialog.replace(() => (
              <DialogAlert
                title="Error"
                message="Failed to fetch profile. Please ensure you're authenticated with Altru Coder Gateway."
              />
            ))
            return
          }

          const { profile, balance, currentOrgId } = response.data

          // Show profile dialog with clickable usage link
          dialog.replace(() => <DialogAltruCoderProfile profile={profile} balance={balance} currentOrgId={currentOrgId} />)
        } catch (error) {
          dialog.replace(() => <DialogAlert title="Error" message={`Failed to fetch profile: ${error}`} />)
        }
      },
    },

    ...(indexing()
      ? [
          {
            value: "altru-coder.indexing",
            title: "Indexing",
            description: "Configure codebase indexing",
            category: "Altru Coder",
            slash: { name: "indexing", aliases: ["index", "embedding"] },
            onSelect: () => {
              dialog.replace(() => <DialogIndexing useSDK={useSDK} />)
            },
          },
        ]
      : []),

    // /teams command
    {
      value: "altru-coder.teams",
      title: "Teams",
      description: "Switch between Altru Coder Gateway teams",
      category: "Altru Coder",
      slash: { name: "teams", aliases: ["team", "org", "orgs"] },
      enabled: isAltruCoderConnected(),
      hidden: !isAltruCoderConnected(),
      onSelect: async () => {
        try {
          // Fetch profile to get organizations
          const response = await sdk.client.altruCoder.profile()

          if (response.error || !response.data) {
            dialog.replace(() => (
              <DialogAlert
                title="Error"
                message="Failed to fetch teams. Please ensure you're authenticated with Altru Coder Gateway."
              />
            ))
            return
          }

          const { profile, currentOrgId } = response.data

          if (!profile.organizations || profile.organizations.length === 0) {
            dialog.replace(() => (
              <DialogAlert
                title="No Teams Available"
                message="You're not a member of any teams.\nVisit https://app.altru-coder.ai to create or join a team."
              />
            ))
            return
          }

          // Show team selection dialog
          dialog.replace(() => (
            <DialogAltruCoderTeamSelect
              organizations={profile.organizations!}
              currentOrgId={currentOrgId}
              onSelect={async (orgId) => {
                try {
                  // Switch to team immediately using server endpoint
                  await sdk.client.altruCoder.organization.set({
                    organizationId: orgId,
                  })

                  // Refresh provider state to reload models with new organization context
                  await sdk.client.instance.dispose()
                  await sync.bootstrap()

                  // Show success toast
                  const teamName = orgId
                    ? profile.organizations!.find((o: Organization) => o.id === orgId)?.name
                    : "Personal"

                  toast.show({
                    message: `Switched to: ${teamName}`,
                    variant: "success",
                  })

                  // Close dialog
                  dialog.clear()
                } catch (error) {
                  if (error instanceof DOMException && error.name === "AbortError") return
                  toast.show({
                    message: "Failed to switch team",
                    variant: "error",
                  })
                  dialog.clear()
                }
              }}
            />
          ))
        } catch (error) {
          dialog.replace(() => <DialogAlert title="Error" message={`Failed to fetch teams: ${error}`} />)
        }
      },
    },
  ])
}
