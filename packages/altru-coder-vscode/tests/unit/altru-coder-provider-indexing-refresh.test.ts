import { describe, expect, it } from "bun:test"
import type { Config } from "@altru-coder/sdk/v2/client"

// vscode mock is provided by the shared preload (tests/setup/vscode-mock.ts)
const { AltruCoderProvider } = await import("../../src/AltruCoderProvider")

type Internals = {
  connectionState: "connecting" | "connected" | "disconnected" | "error"
  cachedConfigMessage: unknown
  cachedGlobalConfig: Config | null
  currentSession: { id: string } | null
  reloadAfterAuthChange: () => Promise<void>
  handleUpdateConfig: (partial: Partial<Config>) => Promise<void>
  fetchAndSendConfig: () => Promise<void>
  fetchAndSendProviders: () => Promise<void>
  fetchAndSendAgents: () => Promise<void>
  fetchAndSendSkills: () => Promise<void>
  fetchAndSendCommands: () => Promise<void>
  fetchAndSendNotifications: () => Promise<void>
  fetchAndSendIndexingStatus: () => Promise<void>
}

function createConnection() {
  let drains = 0
  let releaseUpdate: (() => void) | undefined
  const client = {
    global: {
      config: {
        get: async () => ({ data: {} }),
        update: async () => {
          await new Promise<void>((resolve) => {
            releaseUpdate = resolve
          })
          return { data: {} }
        },
      },
    },
    config: {
      get: async () => ({ data: {} }),
      update: async () => ({ data: {} }),
    },
    provider: {
      list: async () => ({ data: { all: [], connected: [], default: {} } }),
      auth: async () => ({ data: {} }),
    },
  }

  return {
    drains: () => drains,
    releaseUpdate: () => releaseUpdate?.(),
    service: {
      drainPendingPrompts: async () => {
        drains += 1
      },
      getClient: () => client,
    },
  }
}

describe("AltruCoderProvider indexing refresh", () => {
  it("reloadAfterAuthChange fetches config first, then indexing status", async () => {
    const provider = new AltruCoderProvider({} as never, {} as never)
    const internal = provider as unknown as Internals
    const calls: string[] = []

    internal.fetchAndSendConfig = async () => {
      calls.push("config")
    }
    internal.fetchAndSendProviders = async () => {
      calls.push("providers")
    }
    internal.fetchAndSendAgents = async () => {
      calls.push("agents")
    }
    internal.fetchAndSendSkills = async () => {
      calls.push("skills")
    }
    internal.fetchAndSendCommands = async () => {
      calls.push("commands")
    }
    internal.fetchAndSendNotifications = async () => {
      calls.push("notifications")
    }
    internal.fetchAndSendIndexingStatus = async () => {
      calls.push("indexing")
    }

    await internal.reloadAfterAuthChange()

    expect(calls[0]).toBe("config")
    expect(calls.includes("indexing")).toBe(true)
  })

  it("handleUpdateConfig no longer eagerly fetches indexing status", async () => {
    const conn = createConnection()
    const provider = new AltruCoderProvider({} as never, conn.service as never)
    const internal = provider as unknown as Internals

    let indexing = 0
    internal.connectionState = "connected"
    internal.fetchAndSendIndexingStatus = async () => {
      indexing += 1
    }

    await internal.handleUpdateConfig({})

    expect(conn.drains()).toBe(1)
    expect(indexing).toBe(0)
  })

  it("handleUpdateConfig acknowledges before the backend config write completes", async () => {
    const conn = createConnection()
    const provider = new AltruCoderProvider({} as never, conn.service as never)
    const internal = provider as unknown as Internals
    const posts: unknown[] = []

    internal.connectionState = "connected"
    internal.cachedConfigMessage = { config: { provider: {} }, features: { indexing: false } }
    internal.cachedGlobalConfig = { provider: {} }
    provider.postMessage = (msg: unknown) => posts.push(msg)

    const task = internal.handleUpdateConfig({
      provider: {
        nvidia: {
          name: "NVIDIA NIM",
          options: { baseURL: "https://integrate.api.nvidia.com/v1" },
          models: { "moonshotai/kimi-k2.6": { name: "Kimi K2.6" } },
        },
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(posts.some((msg) => typeof msg === "object" && msg !== null && (msg as { type?: string }).type === "configUpdated")).toBe(true)
    conn.releaseUpdate()
    await task
  })

  it("fetchAndSendIndexingStatus uses current session directory header", async () => {
    const worktree = "/repo/.altru-coder/.altrucoder/worktrees/feature"
    const calls: { input: RequestInfo | URL; init?: RequestInit }[] = []
    const original = globalThis.fetch

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init })
      return new Response(
        JSON.stringify({
          state: "Disabled",
          message: "Indexing is disabled in worktree sessions.",
          processedFiles: 0,
          totalFiles: 0,
          percent: 0,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      )
    }) as typeof fetch

    try {
      const provider = new AltruCoderProvider(
        {} as never,
        {
          getClient: () => ({}) as never,
          getServerConfig: () => ({ baseUrl: "http://127.0.0.1:9999", password: "secret" }),
        } as never,
      )
      const internal = provider as unknown as Internals
      provider.setSessionDirectory("ses_worktree", worktree)
      internal.currentSession = { id: "ses_worktree" }

      await internal.fetchAndSendIndexingStatus()

      expect(calls.length).toBe(1)
      const headers = new Headers(calls[0]?.init?.headers)
      const auth = Buffer.from("altru-coder:secret").toString("base64")
      expect(headers.get("Authorization")).toBe(`Basic ${auth}`)
      expect(headers.get("x-altru-coder-directory")).toBe(worktree)
    } finally {
      globalThis.fetch = original
    }
  })
})
