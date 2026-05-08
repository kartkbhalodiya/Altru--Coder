// Regression test: OAuth accountId must flow into model fetch as altrucoderOrganizationId
// When a user logs in via OAuth and selects an enterprise organization, the model fetch
// should use the organization-specific endpoint, not the personal endpoint.

import { test, expect, mock } from "bun:test"
import { Effect } from "effect"
import path from "path"
import * as Log from "@opencode-ai/core/util/log"

Log.init({ print: false })

// Capture the options passed to fetchAltruCoderModels
let captured: any = undefined

mock.module("@altru-coder/altru-coder-gateway", () => ({
  fetchAltruCoderModels: async (options: any) => {
    captured = options
    return {
      "test-model": {
        id: "test-model",
        name: "Test Model",
        cost: { input: 0.001, output: 0.002 },
        limit: { context: 128000, output: 4096 },
      },
    }
  },
  ALTRU_CODER_OPENROUTER_BASE: "https://api.altru-coder.ai/api/openrouter",
}))

// Mock default plugins to prevent actual installations during tests
const mockPlugin = () => ({})
mock.module("opencode-copilot-auth", () => ({ default: mockPlugin }))
mock.module("opencode-anthropic-auth", () => ({ default: mockPlugin }))
mock.module("@gitlab/opencode-gitlab-auth", () => ({ default: mockPlugin }))

import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { Auth } from "../../src/auth"
import { ModelCache } from "../../src/provider/model-cache"

test("model fetch uses accountId from OAuth auth as altrucoderOrganizationId", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://app.altru-coder.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: Effect.promise(async () => {
      // Simulate an OAuth login where user selected an enterprise organization
      await Auth.set("altru-coder", {
        type: "oauth",
        access: "test-oauth-token",
        refresh: "test-refresh-token",
        expires: Date.now() + 3600000,
        accountId: "org-enterprise-123",
      })
    }).pipe(Effect.asVoid),
    fn: async () => {
      // Reset captured and cache
      captured = undefined
      ModelCache.clear("altru-coder")

      // Trigger model fetch through the cache
      await ModelCache.fetch("altru-coder")

      // The fetchAltruCoderModels call should have received the organization ID
      expect(captured).toBeDefined()
      expect(captured.altrucoderToken).toBe("test-oauth-token")
      expect(captured.altrucoderOrganizationId).toBe("org-enterprise-123")
    },
  })
})

test("model fetch without OAuth accountId does not set altrucoderOrganizationId", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://app.altru-coder.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: Effect.promise(async () => {
      // Simulate an OAuth login for a personal account (no accountId)
      await Auth.set("altru-coder", {
        type: "oauth",
        access: "test-personal-token",
        refresh: "test-refresh-token",
        expires: Date.now() + 3600000,
      })
    }).pipe(Effect.asVoid),
    fn: async () => {
      captured = undefined
      ModelCache.clear("altru-coder")

      await ModelCache.fetch("altru-coder")

      expect(captured).toBeDefined()
      expect(captured.altrucoderToken).toBe("test-personal-token")
      expect(captured.altrucoderOrganizationId).toBeUndefined()
    },
  })
})

test("ModelCache.clear removes cached entry so next fetch hits the network", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://app.altru-coder.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: Effect.promise(async () => {
      await Auth.set("altru-coder", {
        type: "oauth",
        access: "token-clear-test",
        refresh: "refresh-clear",
        expires: Date.now() + 3600000,
        accountId: "org-clear",
      })
    }).pipe(Effect.asVoid),
    fn: async () => {
      // Populate cache
      captured = undefined
      ModelCache.clear("altru-coder")
      await ModelCache.fetch("altru-coder")
      expect(captured).toBeDefined()

      // Verify cache is populated — second fetch should NOT call fetchAltruCoderModels
      captured = undefined
      await ModelCache.fetch("altru-coder")
      expect(captured).toBeUndefined()
      expect(ModelCache.get("altru-coder")).toBeDefined()

      // Clear the cache
      ModelCache.clear("altru-coder")

      // get() should return undefined after clear
      expect(ModelCache.get("altru-coder")).toBeUndefined()

      // Next fetch should call fetchAltruCoderModels again
      captured = undefined
      await ModelCache.fetch("altru-coder")
      expect(captured).toBeDefined()
    },
  })
})
