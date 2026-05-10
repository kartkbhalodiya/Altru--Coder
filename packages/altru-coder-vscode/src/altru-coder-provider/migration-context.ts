import type { MigrationContext } from "./handlers/migration"

type Input = {
  client: MigrationContext["client"]
  extensionContext: MigrationContext["extensionContext"]
  postMessage(msg: unknown): void
  refreshSessions(): void
  disposeGlobal(): Promise<void>
  broadcastComplete(): void
  getData(): MigrationContext["cachedLegacyData"]
  setData(data: MigrationContext["cachedLegacyData"]): void
  getBusy(): boolean
  setBusy(value: boolean): void
}

export function createMigrationContext(input: Input): MigrationContext {
  return {
    client: input.client,
    extensionContext: input.extensionContext,
    postMessage: input.postMessage,
    refreshSessions: input.refreshSessions,
    disposeGlobal: input.disposeGlobal,
    broadcastComplete: input.broadcastComplete,
    get cachedLegacyData() {
      return input.getData()
    },
    set cachedLegacyData(data) {
      input.setData(data)
    },
    get migrationCheckInFlight() {
      return input.getBusy()
    },
    set migrationCheckInFlight(value) {
      input.setBusy(value)
    },
  }
}
