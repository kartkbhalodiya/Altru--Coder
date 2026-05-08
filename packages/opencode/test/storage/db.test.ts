import { describe, expect, test } from "bun:test"
import path from "path"
import { Flag } from "@opencode-ai/core/flag/flag" // altrucoder_change
import { Global } from "@opencode-ai/core/global"
import { InstallationChannel } from "@opencode-ai/core/installation/version"
import { Database } from "@/storage/db"

describe("Database.Path", () => {
  test("returns database path for the current channel", () => {
    // altrucoder_change start — test preload sets ALTRU_CODER_DB=:memory:
    if (Flag.ALTRU_CODER_DB) {
      const expected =
        Flag.ALTRU_CODER_DB === ":memory:" || path.isAbsolute(Flag.ALTRU_CODER_DB)
          ? Flag.ALTRU_CODER_DB
          : path.join(Global.Path.data, Flag.ALTRU_CODER_DB)
      expect(Database.Path).toBe(expected)
      return
    }
    // altrucoder_change end
    const expected = ["latest", "beta"].includes(InstallationChannel)
      ? path.join(Global.Path.data, "altru-coder.db")
      : path.join(Global.Path.data, `opencode-${InstallationChannel.replace(/[^a-zA-Z0-9._-]/g, "-")}.db`)
    expect(Database.getChannelPath()).toBe(expected)
  })
})
