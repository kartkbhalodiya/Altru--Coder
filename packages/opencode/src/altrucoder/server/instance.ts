// altrucoder_change - new file
// Registers all Altru Coder-specific instance routes on a Hono app.
// Called from ../../server/instance/index.ts before the UI fallback route.

import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { TelemetryRoutes } from "../../server/routes/instance/telemetry"
import { CommitMessageRoutes } from "./routes/commit-message"
import { EnhancePromptRoutes } from "../../server/routes/instance/enhance-prompt"
import { AltruCoderRoutes } from "../../server/routes/instance/altrucoder"
import { PermissionAltruCoderRoutes } from "../permission/routes"
import { RemoteRoutes } from "../../server/routes/instance/remote"
import { NetworkRoutes } from "../../server/routes/instance/network"
import { SuggestionRoutes } from "../suggestion/routes"
import { IndexingRoutes } from "./routes/indexing"
import { createAltruCoderRoutes } from "@altru-coder/altru-coder-gateway"
import { Auth } from "../../auth"
import { errors } from "../../server/error"
import { ModelCache } from "../../provider/model-cache"
import { Database } from "../../storage/db"
import { Instance } from "../../project/instance"
import { InstanceStore } from "../../project/instance-store"
import { Session } from "../../session/session"
import { Identifier } from "../../id/id"
import { SessionTable, MessageTable, PartTable } from "../../session/session.sql"
import { Bus } from "@/bus"

export function register(app: Hono): Hono {
  return app
    .route("/permission", PermissionAltruCoderRoutes())
    .route("/network", NetworkRoutes())
    .route("/indexing", IndexingRoutes()) // altrucoder_change
    .route("/suggestion", SuggestionRoutes())
    .route("/telemetry", TelemetryRoutes())
    .route("/remote", RemoteRoutes())
    .route("/commit-message", CommitMessageRoutes())
    .route("/enhance-prompt", EnhancePromptRoutes())
    .route("/altrucoder", AltruCoderRoutes())
    .route(
      "/altru",
      createAltruCoderRoutes({
        Hono,
        describeRoute,
        validator,
        resolver,
        errors,
        Auth,
        z,
        Database,
        Instance,
        InstanceStore,
        SessionTable,
        MessageTable,
        PartTable,
        SessionToRow: Session.toRow,
        Bus,
        SessionCreatedEvent: Session.Event.Created,
        Identifier,
        ModelCache,
      }),
    )
}
