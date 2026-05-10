// altrucoder_change - new file
import { ExperimentalApi } from "@/altrucoder/server/experimental-api"
import { Effect, Layer } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { HttpApiMiddleware } from "effect/unstable/httpapi"

export class ExperimentalApiMiddleware extends HttpApiMiddleware.Service<ExperimentalApiMiddleware>()(
  "@opencode/ExperimentalHttpApiCapability",
) {}

export const experimentalApiLayer = Layer.succeed(
  ExperimentalApiMiddleware,
  ExperimentalApiMiddleware.of((effect) =>
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      const ok = ExperimentalApi.enabled({
        url: req.url,
        header: (name) => req.headers[name],
      })
      if (ok) return yield* effect
      return HttpServerResponse.jsonUnsafe(ExperimentalApi.response(), { status: 403 })
    }),
  ),
)
