import { describe, expect, test } from "bun:test"
import { AltruCoderSessionPrompt } from "../../src/altrucoder/session/prompt"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { MessageV2 } from "../../src/session/message-v2"
import { ModelID, ProviderID } from "../../src/provider/schema"

const sessionID = SessionID.make("session")
const messageID = MessageID.make("message")

function msg(parts: MessageV2.Part[]): MessageV2.WithParts {
  return {
    info: {
      id: messageID,
      sessionID,
      role: "user",
      time: { created: 0 },
      agent: "code",
      model: {
        providerID: ProviderID.make("test"),
        modelID: ModelID.make("model"),
      },
    },
    parts,
  }
}

function text(value: string, synthetic = false): MessageV2.TextPart {
  return {
    id: PartID.make(`part-${synthetic ? "synthetic" : "text"}`),
    sessionID,
    messageID,
    type: "text",
    text: value,
    ...(synthetic ? { synthetic } : {}),
  }
}

describe("Altru Coder session title", () => {
  test("uses the first real user text without a title LLM call", () => {
    const title = AltruCoderSessionPrompt.title({
      message: msg([text("fix history token waste on first message")]),
    })

    expect(title).toBe("Fix history token waste on first message")
  })

  test("ignores synthetic editor context", () => {
    const title = AltruCoderSessionPrompt.title({
      message: msg([text("OPEN TABS: massive hidden context", true), text("repair approval UI")]),
    })

    expect(title).toBe("Repair approval UI")
  })

  test("caps long local titles", () => {
    const title = AltruCoderSessionPrompt.title({
      message: msg([
        text(
          "implement first turn token saver so new sessions do not spend another model call on title generation",
        ),
      ]),
    })

    expect(title?.length).toBeLessThanOrEqual(80)
    expect(title).toStartWith("Implement first turn token saver")
  })
})
