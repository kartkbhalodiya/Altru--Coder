import path from "path"
import { stat } from "fs/promises"
import { cmd } from "@/cli/cmd/cmd"
import { bootstrap } from "@/cli/bootstrap"
import { createSdkMcpRuntime, runStdioMcpServer } from "@/altrucoder/mcp-server/server"

async function directory(value?: string) {
  const dir = path.resolve(value ?? process.cwd())
  const info = await stat(dir).catch(() => undefined)
  if (!info?.isDirectory()) throw new Error(`MCP server directory does not exist: ${dir}`)
  return dir
}

export const McpServerCommand = cmd({
  command: "mcp-server",
  describe: "run Altru Coder as an MCP server over stdio",
  builder: (yargs) =>
    yargs.option("directory", {
      alias: "C",
      type: "string",
      describe: "workspace directory to serve",
    }),
  async handler(args) {
    const dir = await directory(args.directory)
    process.chdir(dir)
    await bootstrap(dir, async () => {
      await runStdioMcpServer(createSdkMcpRuntime({ directory: dir }))
    })
  },
})
