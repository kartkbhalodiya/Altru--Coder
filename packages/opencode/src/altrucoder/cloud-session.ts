/**
 * Validate --cloud-fork flag combinations and return an error message if invalid.
 */
export function validateCloudFork(args: {
  cloudFork?: boolean
  fork?: boolean
  continue?: boolean
  session?: string
}): string | undefined {
  if (!args.cloudFork) return
  if (args.fork) return "--cloud-fork cannot be used with --fork"
  if (args.continue) return "--cloud-fork cannot be used with --continue"
  if (!args.session) return "--cloud-fork requires --session"
}

/**
 * Import a cloud session to local storage and return the new local session ID.
 * Wraps the SDK's `.altruCoder.cloud.session.import()` which returns `unknown` due to
 * the OpenAPI spec not typing the response.
 */
export async function importCloudSession(
  client: {
    altruCoder: {
      cloud: {
        session: {
          import: (params: { sessionId: string }) => Promise<{ data?: unknown }>
        }
      }
    }
  },
  sessionId: string,
): Promise<string | undefined> {
  const result = await client.altruCoder.cloud.session.import({ sessionId })
  const id = (result.data as Record<string, unknown>)?.id
  return typeof id === "string" ? id : undefined
}
