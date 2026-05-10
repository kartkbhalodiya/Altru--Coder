import { describe, expect, test } from "bun:test"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { createAltruMcpServer, type AltruMcpRuntime } from "../../src/altrucoder/mcp-server/server"

function runtime(): AltruMcpRuntime {
  return {
    directory: "C:\\repo",
    async list(input) {
      return {
        input,
        sessions: [
          {
            id: "ses_1",
            title: "First",
            directory: "C:\\repo",
          },
        ],
      }
    },
    async create(input) {
      return {
        session: {
          id: "ses_new",
          title: input.title ?? "Untitled",
          directory: "C:\\repo",
        },
      }
    },
    async messages(input) {
      return {
        sessionID: input.sessionID,
        limit: input.limit,
        messages: [
          {
            id: "msg_1",
            role: "assistant",
            text: "hello",
          },
        ],
      }
    },
    async prompt(input) {
      return {
        sessionID: input.sessionID ?? "ses_new",
        messageID: "msg_2",
        text: `reply:${input.message}`,
        approval: input.approval ?? "reject",
      }
    },
  }
}

async function connect() {
  const server = createAltruMcpServer(runtime())
  const client = new Client({ name: "test", version: "0.0.0" }, { capabilities: {} })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  return { client, server }
}

describe("Altru MCP server", () => {
  test("publishes the session tools", async () => {
    const pair = await connect()
    try {
      const list = await pair.client.listTools()
      const names = list.tools.map((item) => item.name)
      expect(names).toContain("altru_session_list")
      expect(names).toContain("altru_session_create")
      expect(names).toContain("altru_session_messages")
      expect(names).toContain("altru_session_prompt")
      expect(list.tools.find((item) => item.name === "altru_session_list")?.annotations?.readOnlyHint).toBe(true)
    } finally {
      await pair.client.close()
      await pair.server.close()
    }
  })

  test("calls runtime handlers and returns structured content", async () => {
    const pair = await connect()
    try {
      const result = await pair.client.callTool({
        name: "altru_session_prompt",
        arguments: {
          message: "scan repo",
          approval: "once",
        },
      })
      const content = result.structuredContent as Record<string, unknown> | undefined
      expect(result.isError).not.toBe(true)
      expect(content?.text).toBe("reply:scan repo")
      expect(content?.approval).toBe("once")
    } finally {
      await pair.client.close()
      await pair.server.close()
    }
  })
})
