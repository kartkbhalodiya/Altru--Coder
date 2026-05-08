// altrucoder_change - new file
import path from "path"
import { Effect, Schema } from "effect"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { InstanceState } from "@/effect/instance-state"
import { isImageAttachment, sniffAttachmentMime } from "@/util/media"
import { assertExternalDirectoryEffect } from "./external-directory"
import * as Tool from "./tool"
import DESCRIPTION from "./view-image.txt"

const MAX_IMAGE_BYTES = 20 * 1024 * 1024

const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({
    description: "Absolute or workspace-relative path to an image file",
  }),
  detail: Schema.optional(Schema.Literals(["auto", "original"])).annotate({
    description: "Use original when precise high-fidelity inspection is needed",
  }),
})

interface Metadata {
  mime: string
  bytes: number
  detail: "auto" | "original"
}

export const ViewImageTool = Tool.define<typeof Parameters, Metadata, AppFileSystem.Service>(
  "view_image",
  Effect.gen(function* () {
    const fs = yield* AppFileSystem.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context<Metadata>) =>
        Effect.gen(function* () {
          const state = yield* InstanceState.context
          const file = path.isAbsolute(params.filePath) ? params.filePath : path.join(state.directory, params.filePath)
          yield* assertExternalDirectoryEffect(ctx, file)

          const stat = yield* fs.stat(file)
          if (stat.type === "Directory") throw new Error(`Expected an image file, got directory: ${file}`)
          if (Number(stat.size) > MAX_IMAGE_BYTES) {
            throw new Error(`Image is too large: ${file} (${stat.size} bytes, max ${MAX_IMAGE_BYTES})`)
          }

          const bytes = yield* fs.readFile(file)
          const mime = sniffAttachmentMime(bytes.subarray(0, 32), AppFileSystem.mimeType(file))
          if (!isImageAttachment(mime)) throw new Error(`Unsupported image type for ${file}: ${mime}`)

          yield* ctx.ask({
            permission: "read",
            patterns: [path.relative(state.worktree, file)],
            always: ["*"],
            metadata: { filepath: file, mime, detail: params.detail ?? "auto" },
          })

          return {
            title: `Image: ${path.basename(file)}`,
            output: "Image loaded successfully.",
            metadata: {
              mime,
              bytes: bytes.byteLength,
              detail: params.detail ?? "auto",
            },
            attachments: [
              {
                type: "file" as const,
                mime,
                url: `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`,
                filename: path.basename(file),
              },
            ],
          }
        }).pipe(Effect.orDie),
    }
  }),
)
