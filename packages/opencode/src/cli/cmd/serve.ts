import { Server } from "../../server/server"
import { cmd } from "./cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "@opencode-ai/core/flag/flag"
import { InstanceStore } from "../../project/instance-store" // altrucoder_change

export const ServeCommand = cmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless altru-coder server", // altrucoder_change
  handler: async (args) => {
    if (!Flag.ALTRU_CODER_SERVER_PASSWORD) {
      console.log("Warning: ALTRU_CODER_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = await resolveNetworkOptions(args)
    const server = await Server.listen(opts)
    console.log(`altru-coder server listening on http://${server.hostname}:${server.port}`)

    // altrucoder_change start - graceful signal shutdown
    const abort = new AbortController()
    const shutdown = async () => {
      try {
        await InstanceStore.disposeAllInstances()
        await server.stop(true)
      } finally {
        abort.abort()
      }
    }
    process.on("SIGTERM", shutdown)
    process.on("SIGINT", shutdown)
    process.on("SIGHUP", shutdown)
    await new Promise((resolve) => abort.signal.addEventListener("abort", resolve))
    // altrucoder_change end
  },
})
