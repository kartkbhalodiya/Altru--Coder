import type { AltruCoderClient } from "@altru-coder/sdk/v2/client"

export async function hasGit(client: AltruCoderClient, directory: string): Promise<boolean> {
  return client.project
    .current({ directory })
    .then((r) => r.data?.vcs === "git")
    .catch(() => false)
}
