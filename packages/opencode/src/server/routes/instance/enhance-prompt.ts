// altrucoder_change - new file
import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { enhancePrompt } from "@/altrucoder/enhance-prompt"
import { lazy } from "@/util/lazy"
import { errors } from "../../error"

export const EnhancePromptRoutes = lazy(() =>
  new Hono().post(
    "/",
    describeRoute({
      summary: "Enhance prompt",
      description: "Rewrite a user's draft prompt into a clearer, more specific, and more effective prompt.",
      operationId: "enhancePrompt.enhance",
      responses: {
        200: {
          description: "Enhanced prompt text",
          content: {
            "application/json": {
              schema: resolver(z.object({ text: z.string() })),
            },
          },
        },
        ...errors(400),
      },
    }),
    validator(
      "json",
      z.object({
        text: z.string().min(1).meta({ description: "The user's draft prompt to enhance" }),
        providerID: z.string().optional().meta({ description: "Preferred provider ID from the active chat model" }),
        modelID: z.string().optional().meta({ description: "Preferred model ID from the active chat model" }),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json")
      const result = await enhancePrompt(body.text, { providerID: body.providerID, modelID: body.modelID })
      return c.json({ text: result })
    },
  ),
)
