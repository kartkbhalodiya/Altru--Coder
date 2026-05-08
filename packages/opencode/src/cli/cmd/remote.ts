// altrucoder_change - new file
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { AltruCoderSessions } from "@/altru-coder-sessions/altru-coder-sessions"
import { Instance } from "@/project/instance"
import { InstanceStore } from "@/project/instance-store"

export const RemoteCommand = cmd({
  command: "remote",
  describe: "enable remote connection for real-time session relay",
  builder: (yargs) => yargs,
  handler: async () => {
    await bootstrap(process.cwd(), async () => {
      await AltruCoderSessions.enableRemote()
      console.log("Remote connection enabled.")

      const abort = new AbortController()
      const shutdown = async () => {
        try {
          AltruCoderSessions.disableRemote()
          await InstanceStore.disposeInstance(Instance.current)
        } finally {
          abort.abort()
        }
      }
      process.on("SIGTERM", shutdown)
      process.on("SIGINT", shutdown)
      process.on("SIGHUP", shutdown)
      await new Promise((resolve) => abort.signal.addEventListener("abort", resolve))
    })
  },
})
