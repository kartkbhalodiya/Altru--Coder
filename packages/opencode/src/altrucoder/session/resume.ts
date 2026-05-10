import { eq } from "drizzle-orm"
import { Database } from "@/storage/db"
import { MessageTable } from "@/session/session.sql"
import type { MessageV2 } from "@/session/message-v2"
import type { SessionID } from "@/session/schema"

export namespace ThreadResume {
  export type Usage = {
    cost: number
    tokens: {
      input: number
      output: number
      reasoning: number
      total: number
      cache: {
        read: number
        write: number
      }
    }
  }

  export function usage(sessionID: SessionID): Usage {
    const rows = Database.use((db) =>
      db.select({ data: MessageTable.data }).from(MessageTable).where(eq(MessageTable.session_id, sessionID)).all(),
    )
    const state: Usage = {
      cost: 0,
      tokens: {
        input: 0,
        output: 0,
        reasoning: 0,
        total: 0,
        cache: {
          read: 0,
          write: 0,
        },
      },
    }

    for (const row of rows) {
      if (row.data.role !== "assistant") continue
      const info = row.data as Omit<MessageV2.Assistant, "id" | "sessionID">
      state.cost += info.cost
      state.tokens.input += info.tokens.input
      state.tokens.output += info.tokens.output
      state.tokens.reasoning += info.tokens.reasoning
      state.tokens.cache.read += info.tokens.cache.read
      state.tokens.cache.write += info.tokens.cache.write
      state.tokens.total += info.tokens.total ?? info.tokens.input + info.tokens.output + info.tokens.reasoning
    }

    return state
  }

  export function last(messages: MessageV2.WithParts[]) {
    const last = messages.at(-1)
    const user = messages.findLast((msg) => msg.info.role === "user")
    const assistant = messages.findLast((msg) => msg.info.role === "assistant")

    return {
      ...(last ? { lastMessageID: last.info.id } : {}),
      ...(user ? { lastUserMessageID: user.info.id } : {}),
      ...(assistant ? { lastAssistantMessageID: assistant.info.id } : {}),
    }
  }
}
