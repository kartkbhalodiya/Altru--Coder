import { Server } from "../../server/server"
import { PublicApi } from "../../server/routes/instance/httpapi/public"
import type { CommandModule } from "yargs"
import { OpenApi } from "effect/unstable/httpapi"

type Args = {
  httpapi: boolean
}

export const GenerateCommand = {
  command: "generate",
  builder: (yargs) =>
    yargs.option("httpapi", {
      type: "boolean",
      default: false,
      description: "Generate OpenAPI from the experimental Effect HttpApi contract",
    }),
  handler: async (args) => {
    const specs = args.httpapi ? OpenApi.fromApi(PublicApi) : await Server.openapi()
    // altrucoder_change start
    specs.info.title = "altru-coder"
    specs.info.description = "altru-coder api"
    // altrucoder_change end
    for (const item of Object.values(specs.paths)) {
      for (const method of ["get", "post", "put", "delete", "patch"] as const) {
        const operation = item[method]
        if (!operation?.operationId) continue
        operation["x-codeSamples"] = [
          // altrucoder_change start
          {
            lang: "js",
            source: [
              `import { createAltruCoderClient } from "@altru-coder/sdk`,
              ``,
              `const client = createAltruCoderClient()`,
              `await client.${operation.operationId}({`,
              `  ...`,
              `})`,
            ].join("\n"),
          },
          // altrucoder_change end,
        ]
      }
    }
    const raw = JSON.stringify(specs, null, 2)
      // altrucoder_change start - replace upstream product name in all descriptions
      .replaceAll("OpenCode", "Altru Coder")
      .replaceAll("opencode.local", "altru-coder.local")
      .replaceAll("opencode serve", "altru-coder serve")
      .replaceAll("https://opencode.ai/", "https://altru-coder.ai/")
    // altrucoder_change end

    // Format through prettier so output is byte-identical to committed file
    // regardless of whether ./script/format.ts runs afterward.
    const prettier = await import("prettier")
    const babel = await import("prettier/plugins/babel")
    const estree = await import("prettier/plugins/estree")
    const format = prettier.format ?? prettier.default?.format
    const json = await format(raw, {
      parser: "json",
      plugins: [babel.default ?? babel, estree.default ?? estree],
      printWidth: 120,
    })

    // Wait for stdout to finish writing before process.exit() is called
    await new Promise<void>((resolve, reject) => {
      process.stdout.write(json, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  },
} satisfies CommandModule<object, Args>
