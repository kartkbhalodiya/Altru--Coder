import { InstallationVersion } from "@opencode-ai/core/installation/version"

export namespace AppServerProtocol {
  export type ID = string | number | null

  export type Request = {
    jsonrpc: "2.0"
    id?: ID
    method: string
    params?: unknown
  }

  export type Response = {
    jsonrpc: "2.0"
    id: ID
    result?: unknown
    error?: {
      code: number
      message: string
      data?: unknown
    }
  }

  export type Thread = {
    id: string
    slug?: string
    projectID?: string
    workspaceID?: string
    directory?: string
    path?: string
    parentID?: string
    title: string
    version?: string
    time?: unknown
  }

  export const version = "2"

  export function capabilities() {
    return {
      protocolVersion: version,
      server: {
        name: "altru-coder",
        version: InstallationVersion,
      },
      methods: [
        "initialize",
        "initialized",
        "thread/list",
        "thread/start",
        "thread/resume",
        "thread/subscribe",
        "process/list",
        "filesystem/stat",
      ],
      features: {
        approvals: true,
        backgroundTerminals: true,
        processRpc: true,
        filesystemRpc: true,
        threadResume: true,
        threadEvents: true,
        realtimeEvents: true,
        experimentalApi: true,
      },
    }
  }

  export function id(input?: ID) {
    return input ?? null
  }

  export function json(input: unknown) {
    if (input === undefined) return undefined
    return JSON.parse(JSON.stringify(input)) as unknown
  }

  export function ok(input: Request, result: unknown): Response {
    return {
      jsonrpc: "2.0",
      id: id(input.id),
      result: json(result),
    }
  }

  export function fail(input: Request, code: number, message: string, data?: unknown): Response {
    return {
      jsonrpc: "2.0",
      id: id(input.id),
      error: {
        code,
        message,
        ...(data === undefined ? {} : { data: json(data) }),
      },
    }
  }

  export function thread(input: Thread) {
    return {
      id: input.id,
      title: input.title,
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.projectID === undefined ? {} : { projectID: input.projectID }),
      ...(input.workspaceID === undefined ? {} : { workspaceID: input.workspaceID }),
      ...(input.directory === undefined ? {} : { directory: input.directory }),
      ...(input.path === undefined ? {} : { path: input.path }),
      ...(input.parentID === undefined ? {} : { parentID: input.parentID }),
      ...(input.version === undefined ? {} : { version: input.version }),
      ...(input.time === undefined ? {} : { time: input.time }),
    }
  }

  export function payload<T extends { session: Thread }>(input: T) {
    return {
      ...input,
      session: thread(input.session),
    }
  }

  export function params(input: unknown) {
    if (input === undefined) return {}
    if (typeof input === "object" && input !== null && !Array.isArray(input)) return input as Record<string, unknown>
    throw new Error("params must be an object")
  }

  export function text(input: Record<string, unknown>, key: string) {
    const value = input[key]
    if (typeof value === "string" && value.trim()) return value
    throw new Error(`${key} is required`)
  }

  export function optionalText(input: Record<string, unknown>, key: string) {
    const value = input[key]
    if (value === undefined || value === null) return undefined
    if (typeof value === "string") return value
    throw new Error(`${key} must be a string`)
  }

  export function optionalNumber(input: Record<string, unknown>, key: string) {
    const value = input[key]
    if (value === undefined || value === null) return undefined
    if (typeof value === "number" && Number.isFinite(value)) return value
    throw new Error(`${key} must be a number`)
  }

  export function optionalBoolean(input: Record<string, unknown>, key: string) {
    const value = input[key]
    if (value === undefined || value === null) return undefined
    if (typeof value === "boolean") return value
    throw new Error(`${key} must be a boolean`)
  }
}
