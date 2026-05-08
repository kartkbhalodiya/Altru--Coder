import type { AltruCoderClient } from "@altru-coder/sdk/v2/client"

export async function abortSession(input: { client: AltruCoderClient; sessionID: string; dir: string }) {
  await input.client.session.abort({ sessionID: input.sessionID, directory: input.dir }, { throwOnError: true })
}
