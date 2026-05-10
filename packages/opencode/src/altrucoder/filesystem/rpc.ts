import path from "path"
import { mkdir, readFile, readdir, rename, rm, stat as fsstat, writeFile } from "fs/promises"
import { containsPath, type InstanceContext } from "@/project/instance-context"

export namespace FilesystemRpc {
  export type Encoding = "utf8" | "base64"

  export type Stat = {
    path: string
    absolute: string
    type: "file" | "directory" | "missing"
    exists: boolean
    size?: number
    mtime?: number
  }

  export type Read = Stat & {
    type: "file"
    exists: true
    content: string
    encoding: Encoding
  }

  export type Removed = {
    path: string
    absolute: string
    removed: boolean
  }

  function code(err: unknown) {
    if (typeof err !== "object" || err === null || !("code" in err)) return ""
    return String((err as { code?: unknown }).code ?? "")
  }

  function slash(value: string) {
    return value.replaceAll("\\", "/")
  }

  export function resolve(ctx: InstanceContext, value: string) {
    const input = value.trim()
    if (!input) throw new Error("Path is required")

    const absolute = path.resolve(ctx.directory, input)
    if (!containsPath(absolute, ctx)) throw new Error("Access denied: path escapes project directory")

    return {
      absolute,
      path: slash(path.relative(ctx.directory, absolute)) || ".",
    }
  }

  export async function stat(ctx: InstanceContext, value: string): Promise<Stat> {
    const target = resolve(ctx, value)
    return fsstat(target.absolute)
      .then((info) => ({
        ...target,
        type: info.isDirectory() ? ("directory" as const) : ("file" as const),
        exists: true,
        size: info.size,
        mtime: info.mtimeMs,
      }))
      .catch((err) => {
        if (code(err) === "ENOENT") return { ...target, type: "missing" as const, exists: false }
        throw err
      })
  }

  export async function read(ctx: InstanceContext, value: string, encoding: Encoding = "utf8"): Promise<Read> {
    const info = await stat(ctx, value)
    if (!info.exists) throw new Error(`File not found: ${info.path}`)
    if (info.type !== "file") throw new Error(`Path is not a file: ${info.path}`)

    const bytes = await readFile(info.absolute)
    return {
      ...info,
      type: "file",
      exists: true,
      content: encoding === "base64" ? bytes.toString("base64") : bytes.toString("utf8"),
      encoding,
    }
  }

  export async function write(
    ctx: InstanceContext,
    input: { path: string; content: string; encoding?: Encoding; createDirs?: boolean },
  ): Promise<Stat> {
    const target = resolve(ctx, input.path)
    const parent = path.dirname(target.absolute)
    const encoding = input.encoding ?? "utf8"

    if (input.createDirs) await mkdir(parent, { recursive: true })
    const content = encoding === "base64" ? Buffer.from(input.content, "base64") : input.content
    await writeFile(target.absolute, content)
    return stat(ctx, input.path)
  }

  export async function mkdirp(ctx: InstanceContext, input: { path: string; recursive?: boolean }): Promise<Stat> {
    const target = resolve(ctx, input.path)
    await mkdir(target.absolute, { recursive: input.recursive ?? true })
    return stat(ctx, input.path)
  }

  export async function remove(ctx: InstanceContext, input: { path: string; recursive?: boolean }): Promise<Removed> {
    const info = await stat(ctx, input.path)
    if (!info.exists) throw new Error(`File not found: ${info.path}`)
    if (info.type === "directory" && !input.recursive) {
      throw new Error(`Recursive remove is required for directory: ${info.path}`)
    }

    await rm(info.absolute, { recursive: input.recursive ?? false, force: false })
    return { path: info.path, absolute: info.absolute, removed: true }
  }

  export async function move(
    ctx: InstanceContext,
    input: { from: string; to: string; overwrite?: boolean },
  ): Promise<Stat> {
    const from = await stat(ctx, input.from)
    if (!from.exists) throw new Error(`File not found: ${from.path}`)

    const to = resolve(ctx, input.to)
    const current = await stat(ctx, input.to)
    if (current.exists && !input.overwrite) throw new Error(`Target already exists: ${current.path}`)

    await mkdir(path.dirname(to.absolute), { recursive: true })
    await rename(from.absolute, to.absolute)
    return stat(ctx, input.to)
  }

  export async function list(ctx: InstanceContext, value: string) {
    const info = await stat(ctx, value)
    if (!info.exists) throw new Error(`Directory not found: ${info.path}`)
    if (info.type !== "directory") throw new Error(`Path is not a directory: ${info.path}`)

    const entries = await readdir(info.absolute, { withFileTypes: true })
    return entries
      .map((entry) => {
        const absolute = path.join(info.absolute, entry.name)
        return {
          name: entry.name,
          path: slash(path.relative(ctx.directory, absolute)),
          absolute,
          type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
        }
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }
}
