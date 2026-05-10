import path from "path"
import os from "os"
import { containsPath, type InstanceContext } from "@/project/instance-context"

export namespace PermissionGuardian {
  export type Request = {
    permission: string
    patterns: readonly string[]
    metadata?: Record<string, unknown>
  }

  export type Decision = {
    action: "allow" | "deny" | "ask"
    reason: string
    pattern?: string
  }

  const readonly = new Set(["read", "grep", "glob", "list", "lsp", "todoread", "codebase_search", "semantic_search"])
  const terminalRead = new Set(["list", "read"])

  export function enabled(request: Request) {
    return request.metadata?.guardian === true && process.env["ALTRU_CODER_DISABLE_GUARDIAN_APPROVALS"] !== "1"
  }

  export function review(input: { request: Request; context: InstanceContext; protected: boolean }): Decision {
    if (input.protected) return ask("protected config paths require explicit approval")

    const severe = input.request.patterns.find(
      (pattern) => system(pattern) || dangerous(input.request.permission, pattern),
    )
    if (severe) return deny("request targets a dangerous command or protected system location", severe)

    if (input.request.permission === "terminal") return terminal(input.request)

    if (input.request.permission === "bash") return bash(input.request, input.context)

    if (readonly.has(input.request.permission)) {
      if (input.request.patterns.some(secret)) return ask("secret-looking paths require explicit approval")
      if (input.request.patterns.every((pattern) => local(pattern, input.context))) {
        return allow("read-only request stayed inside the workspace")
      }
      return ask("read-only request targets a path outside the workspace")
    }

    if (input.request.permission === "external_directory") {
      if (input.request.patterns.every((pattern) => temp(pattern)) && input.request.metadata?.access === "read") {
        return allow("read-only access is scoped to the temporary work area")
      }
      return ask("external directory access requires explicit approval")
    }

    return ask("request is mutating, networked, or otherwise ambiguous")
  }

  function allow(reason: string): Decision {
    return { action: "allow", reason }
  }

  function ask(reason: string): Decision {
    return { action: "ask", reason }
  }

  function deny(reason: string, pattern: string): Decision {
    return { action: "deny", reason, pattern }
  }

  function terminal(request: Request): Decision {
    const mode = typeof request.metadata?.mode === "string" ? request.metadata.mode : request.patterns[0]
    if (mode && terminalRead.has(mode)) return allow("terminal read-only mode")
    return ask("terminal mutation requires explicit approval")
  }

  function bash(request: Request, context: InstanceContext): Decision {
    if (request.patterns.some(secret)) return ask("secret-looking command requires explicit approval")
    if (request.patterns.some((pattern) => absolute(pattern) && !local(pattern, context))) {
      return ask("command references an absolute path outside the workspace")
    }
    if (request.patterns.every(safe)) return allow("command is read-only and low risk")
    return ask("command is not clearly read-only")
  }

  function safe(command: string) {
    const text = command.trim()
    if (!text) return false
    if (/[;&|>`]/.test(text)) return false
    return (
      /^pwd$/i.test(text) ||
      /^(ls|dir)(\s|$)/i.test(text) ||
      /^git\s+(status|diff|log|show|branch|rev-parse|ls-files)(\s|$)/i.test(text) ||
      /^(rg|grep)(\s|$)/i.test(text)
    )
  }

  function dangerous(permission: string, pattern: string) {
    if (permission !== "bash") return false
    const text = pattern.toLowerCase()
    if (
      /\b(curl|wget|iwr|invoke-webrequest)\b[\s\S]*\|\s*(sh|bash|zsh|fish|pwsh|powershell|iex|invoke-expression)\b/.test(
        text,
      )
    )
      return true
    if (/\b(set-executionpolicy|format|format-volume|mkfs|shutdown|reboot|bcdedit)\b/.test(text)) return true
    if (/\bdd\b[\s\S]*\bof=/.test(text)) return true
    if (/\brm\b[\s\S]*-[a-z]*r[a-z]*f[a-z]*[\s\S]*(\s\/(\s|$)|\s~|\s\*|\s\.\.)/.test(text)) return true
    if (/\bremove-item\b[\s\S]*-recurse[\s\S]*-force[\s\S]*(c:\\|\/|~|\*)/.test(text)) return true
    if (/\b(del|erase|rd|rmdir)\b[\s\S]*(\/s|\/q)[\s\S]*(c:\\|\\windows|\/|\*)/.test(text)) return true
    return false
  }

  function secret(pattern: string) {
    const text = norm(pattern)
    return (
      /(^|\/)\.ssh(\/|$)/.test(text) ||
      /(^|\/)(id_rsa|id_ed25519|authorized_keys|known_hosts)$/.test(text) ||
      /(^|\/)\.env($|\.local$|\.development$|\.production$|\.test$|\/)/.test(text) ||
      /(secret|credential|private[-_]?key|access[-_]?token)/.test(text)
    )
  }

  function system(pattern: string) {
    const text = norm(target(pattern))
    return (
      text === "/" ||
      text === "/etc" ||
      text.startsWith("/etc/") ||
      text === "/root" ||
      text.startsWith("/root/") ||
      text === "/system" ||
      text.startsWith("/system/") ||
      text.startsWith("c:/windows") ||
      text.startsWith("c:/program files") ||
      text.startsWith("c:/programdata")
    )
  }

  function temp(pattern: string) {
    const file = path.resolve(target(pattern))
    const rel = path.relative(os.tmpdir(), file)
    return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel))
  }

  function local(pattern: string, context: InstanceContext) {
    const text = target(pattern)
    if (!absolute(text)) return true
    return containsPath(path.resolve(text), context)
  }

  function absolute(pattern: string) {
    const text = target(pattern)
    return path.isAbsolute(text) || /^[a-z]:[\\/]/i.test(text) || text.startsWith("~/")
  }

  function target(pattern: string) {
    const clean = pattern.replace(/[/\\]\*.*$/, "").replace(/[?*[\]].*$/, "")
    if (clean.startsWith("~/")) return path.join(os.homedir(), clean.slice(2))
    return clean || pattern
  }

  function norm(pattern: string) {
    return target(pattern).replaceAll("\\", "/").toLowerCase()
  }
}
