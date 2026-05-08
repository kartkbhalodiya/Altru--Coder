declare global {
  const ALTRU_CODER_VERSION: string
  const ALTRU_CODER_CHANNEL: string
  const ALTRU_CODER_BUILD_KIND: string // altrucoder_change
}

export const InstallationVersion = typeof ALTRU_CODER_VERSION === "string" ? ALTRU_CODER_VERSION : "local"
export const InstallationChannel = typeof ALTRU_CODER_CHANNEL === "string" ? ALTRU_CODER_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
// altrucoder_change start - distinguish release builds from source / local builds
export const InstallationBuildKind: "source" | "release" =
  typeof ALTRU_CODER_BUILD_KIND === "string" && ALTRU_CODER_BUILD_KIND === "release" ? "release" : "source"
// altrucoder_change end
