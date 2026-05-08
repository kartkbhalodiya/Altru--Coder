import { lazy } from "@/util/lazy"
import { createIndexingRoutes } from "@altru-coder/altru-coder-indexing/server"

export const IndexingRoutes = lazy(() =>
  createIndexingRoutes({
    current: async () => {
      const mod = await import("@/altrucoder/indexing")
      return mod.AltruCoderIndexing.current()
    },
  }),
)
