export * from "./client.js"
export * from "./server.js"

import { createAltruCoderClient } from "./client.js"
import { createAltruCoderServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export async function createAltruCoder(options?: ServerOptions) {
  const server = await createAltruCoderServer({
    ...options,
  })

  const client = createAltruCoderClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
