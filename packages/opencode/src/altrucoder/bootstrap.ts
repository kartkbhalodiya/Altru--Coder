import { AltruCoderSessions } from "@/altru-coder-sessions/altru-coder-sessions"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "altrucoder-bootstrap" })

export namespace AltruCoderBootstrap {
  export async function init() {
    await AltruCoderSessions.init()
    void import("@/altrucoder/indexing")
      .then((mod) => mod.AltruCoderIndexing.init())
      .catch((err) => log.warn("indexing bootstrap failed", { err }))
  }
}
