/**
 * Altru Coder Gateway TUI Integration
 *
 * This module provides TUI-specific functionality for altru-coder-gateway.
 * It requires OpenCode TUI dependencies to be injected at runtime.
 *
 * Import from "@altru-coder/altru-coder-gateway/tui" for TUI features.
 */

// ============================================================================
// TUI Dependency Injection
// ============================================================================
export { initializeTUIDependencies, getTUIDependencies, areTUIDependenciesInitialized } from "./tui/context.js"
export type { TUIDependencies } from "./tui/types.js"

// ============================================================================
// TUI Helpers
// ============================================================================
export { formatProfileInfo, getOrganizationOptions, getDefaultOrganizationSelection } from "./tui/helpers.js"

// ============================================================================
// NOTE: TUI Components Moved to OpenCode
// ============================================================================
// All TUI components with JSX have been moved to packages/opencode/src/altrucoder/
// to ensure correct JSX transpilation with @opentui/solid.
//
// Components moved:
// - registerAltruCoderCommands -> @/altrucoder/altru-commands
// - DialogAltruCoderTeamSelect -> @/altrucoder/components/dialog-altru-coder-team-select
// - DialogAltruCoderOrganization -> @/altrucoder/components/dialog-altru-coder-organization
// - DialogAltruCoderProfile -> @/altrucoder/components/dialog-altru-coder-profile
// - AltruCoderAutoMethod -> @/altrucoder/components/dialog-altru-coder-auto-method
// - AltruCoderNews -> @/altrucoder/components/altru-coder-news
// - NotificationBanner -> @/altrucoder/components/notification-banner
// - DialogAltruCoderNotifications -> @/altrucoder/components/dialog-altru-coder-notifications
