// altrucoder_change - new file
import { Effect } from "effect"
import type * as Tool from "@/tool/tool"

type Args = Record<string, unknown>

export namespace AltruCoderPolicy {
  export interface Input {
    tool: string
    args: unknown
    ctx: Pick<Tool.Context, "sessionID" | "messageID" | "callID">
  }

  function record(args: unknown): Args {
    if (!args || typeof args !== "object") return {}
    return args as Args
  }

  function text(value: unknown) {
    return typeof value === "string" ? value : ""
  }

  function destructive(command: string) {
    const lower = command.toLowerCase()
    return [
      /\brm\s+-[a-z]*r[a-z]*f\b\s+(\/|~|\*|\.\.)/,
      /\bremove-item\b[\s\S]*\b-recurse\b[\s\S]*(c:\\|\/|\*)/,
      /\bformat\s+[a-z]:/,
      /\bdel\s+\/[a-z]*[sqf][a-z]*\s+(c:\\|\\|\*)/,
      /\bgit\s+reset\s+--hard\b/,
    ].some((rule) => rule.test(lower))
  }

  function violation(input: Input) {
    const args = record(input.args)
    if (input.tool === "bash") {
      const command = text(args.command)
      if (!command.trim()) return "bash command is empty"
      if (command.includes("\0")) return "bash command contains a null byte"
      if (destructive(command)) return "bash command matches a destructive whole-workspace/system pattern"
    }

    if (["webfetch", "websearch"].includes(input.tool)) {
      const url = text(args.url)
      if (url && !/^https?:\/\//i.test(url)) return "network tools only allow http:// or https:// URLs"
    }

    for (const key of ["filePath", "path"]) {
      const value = text(args[key])
      if (value.includes("\0")) return `${key} contains a null byte`
    }
  }

  export function validate(input: Input) {
    return Effect.sync(() => {
      const message = violation(input)
      if (!message) return
      throw new Error(`Altru Coder policy blocked ${input.tool}: ${message}`)
    })
  }

  export function instructions() {
    return [
      "<system-reminder>",
      "Altru Coder enforces a local tool policy before executing tools.",
      "Destructive whole-system shell patterns, malformed paths, and malformed network URLs are blocked before execution.",
      "Prefer precise file-scoped edits and explain high-impact commands before using bash.",
      "</system-reminder>",
    ].join("\n")
  }
}
