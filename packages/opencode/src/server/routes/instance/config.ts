import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { Config } from "@/config/config"
import { Provider } from "@/provider/provider"
import { errors } from "../../error"
import { lazy } from "@/util/lazy"
import { jsonRequest } from "./trace"
// altrucoder_change start
import { fetchDefaultModel } from "@altru-coder/altru-coder-gateway"
import { Auth } from "@/auth"
import { Effect } from "effect"
import { ModelID, ProviderID } from "@/provider/schema"
// altrucoder_change end

export const ConfigRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "Get configuration",
        description: "Retrieve the current OpenCode configuration settings and preferences.",
        operationId: "config.get",
        responses: {
          200: {
            description: "Get config info",
            content: {
              "application/json": {
                schema: resolver(Config.Info.zod),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("ConfigRoutes.get", c, function* () {
          const cfg = yield* Config.Service
          return yield* cfg.get()
        }),
    )
    .patch(
      "/",
      describeRoute({
        summary: "Update configuration",
        description: "Update OpenCode configuration settings and preferences.",
        operationId: "config.update",
        responses: {
          200: {
            description: "Successfully updated config",
            content: {
              "application/json": {
                schema: resolver(Config.Info.zod),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", Config.Info.zod),
      async (c) =>
        jsonRequest("ConfigRoutes.update", c, function* () {
          const config = c.req.valid("json")
          const cfg = yield* Config.Service
          yield* cfg.update(config)
          return config
        }),
    )
    // altrucoder_change start
    .get(
      "/warnings",
      describeRoute({
        summary: "Get config warnings",
        description: "Get warnings generated during config loading (e.g., invalid JSON, schema errors).",
        operationId: "config.warnings",
        responses: {
          200: {
            description: "Config warnings",
            content: {
              "application/json": {
                schema: resolver(Config.Warning.array()),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(await Config.warnings())
      },
    )
    // altrucoder_change end
    .get(
      "/providers",
      describeRoute({
        summary: "List config providers",
        description: "Get a list of all configured AI providers and their default models.",
        operationId: "config.providers",
        responses: {
          200: {
            description: "List of providers",
            content: {
              "application/json": {
                schema: resolver(Provider.ConfigProvidersResult.zod),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("ConfigRoutes.providers", c, function* () {
          const svc = yield* Provider.Service
          const providers = yield* svc.list()
          const defaults = Provider.defaultModelIDs(providers)

          // altrucoder_change start - Fetch default model from Altru Coder API when the altru-coder provider is available.
          // Only call the Altru Coder API when the altru-coder provider is actually available.
          // This prevents unnecessary network calls for teams using only their
          // own providers (e.g. LiteLLM) via enabled_providers config.
          if (providers[ProviderID["altru-coder"]]) {
            const auth = yield* Auth.Service
            const altruAuth = yield* auth.get("altru-coder")
            const token = altruAuth?.type === "oauth" ? altruAuth.access : altruAuth?.key
            const organizationId = altruAuth?.type === "oauth" ? altruAuth.accountId : undefined
            const altruApiDefault = yield* Effect.promise(() => fetchDefaultModel(token, organizationId))
            if (altruApiDefault && providers[ProviderID["altru-coder"]]?.models[altruApiDefault]) {
              defaults[ProviderID["altru-coder"]] = ModelID.make(altruApiDefault)
            }
          }
          // altrucoder_change end

          return {
            providers: Object.values(providers),
            default: defaults, // altrucoder_change
          }
        }),
    ),
)
