import type { Plugin } from "@altru-coder/plugin"

// RATIONALE: The host runtime owns lifecycle, routes, and native tool wiring.
// The plugin entry exists so workspaces can opt into indexing with a normal
// plugin specifier while keeping the engine and shims outside the plugin API.
export const AltruCoderIndexingPlugin: Plugin = async () => ({})

export default AltruCoderIndexingPlugin
