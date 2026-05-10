import type { InstanceContext } from "@/project/instance-context"
import { PermissionGuardian } from "@/altrucoder/permission/guardian"

export namespace SandboxPolicy {
  export const modes = ["read-only", "workspace-write", "danger-full-access"] as const
  export type Mode = (typeof modes)[number]
  export type Action = "allow" | "deny" | "ask"

  export type Rule = {
    permission: string
    pattern: string
    action: Action
  }

  export type Request = {
    permission: string
    patterns: readonly string[]
    metadata?: Record<string, unknown>
  }

  export type Decision = {
    action: Action
    reason: string
    pattern?: string
  }

  const mark = "sandbox"
  const readonly = new Set(["read", "grep", "glob", "list", "lsp", "todoread", "codebase_search", "semantic_search"])
  const mutable = new Set(["edit", "write", "apply_patch", "todowrite", "task", "agent_manager"])
  const workspace = new Set(["edit", "write", "apply_patch", "todowrite"])
  const termRead = new Set(["list", "read"])

  export function parse(value: unknown): Mode | undefined {
    if (typeof value !== "string") return
    const text = value.trim().toLowerCase()
    return modes.find((item) => item === text)
  }

  export function env(source: NodeJS.ProcessEnv = process.env) {
    return parse(source.ALTRU_CODER_SANDBOX_MODE ?? source.ALTRU_CODER_SANDBOX)
  }

  export function active(...rulesets: Rule[][]) {
    const rules = rulesets.flat()
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i]
      if (rule.permission !== mark || rule.action !== "allow") continue
      const mode = parse(rule.pattern)
      if (mode) return mode
    }
    return env()
  }

  export function rules(mode: Mode): Rule[] {
    if (mode === "danger-full-access") {
      return [
        marker(mode),
        {
          permission: "*",
          pattern: "*",
          action: "allow",
        },
      ]
    }

    const base: Rule[] = [
      marker(mode),
      ...[...readonly].map((permission) => ({ permission, pattern: "*", action: "allow" as const })),
      {
        permission: "terminal",
        pattern: "list",
        action: "allow",
      },
      {
        permission: "terminal",
        pattern: "read",
        action: "allow",
      },
      {
        permission: "bash",
        pattern: "*",
        action: "ask",
      },
    ]

    if (mode === "workspace-write") {
      return [
        ...base,
        ...[...workspace].map((permission) => ({ permission, pattern: "*", action: "allow" as const })),
        {
          permission: "external_directory",
          pattern: "*",
          action: "deny",
        },
      ]
    }

    return [
      ...base,
      ...[...mutable].map((permission) => ({ permission, pattern: "*", action: "deny" as const })),
      {
        permission: "external_directory",
        pattern: "*",
        action: "deny",
      },
      {
        permission: "terminal",
        pattern: "write:*",
        action: "deny",
      },
      {
        permission: "terminal",
        pattern: "stop",
        action: "deny",
      },
      {
        permission: "terminal",
        pattern: "clean",
        action: "deny",
      },
    ]
  }

  export function withMode(mode: Mode | undefined, ruleset: Rule[]) {
    if (!mode) return ruleset
    return [...ruleset, ...rules(mode)]
  }

  export function review(input: {
    mode: Mode
    request: Request
    context: InstanceContext
    protected: boolean
  }): Decision {
    if (input.mode === "danger-full-access") return allow("danger-full-access bypasses sandbox prompts")

    if (input.mode === "read-only") return read(input)
    return write(input)
  }

  function read(input: { request: Request; context: InstanceContext; protected: boolean }): Decision {
    if (mutable.has(input.request.permission)) return deny("read-only sandbox blocks mutating tools")
    if (input.request.permission === "terminal") {
      const mode = terminal(input.request)
      if (mode && termRead.has(mode)) return allow("read-only terminal inspection")
      return deny("read-only sandbox blocks terminal mutation")
    }
    if (input.request.permission === "external_directory") {
      if (input.request.metadata?.access === "read")
        return ask("read-only external directory access still needs approval")
      return deny("read-only sandbox blocks external writes")
    }
    if (input.request.permission === "bash") {
      const decision = PermissionGuardian.review({
        request: input.request,
        context: input.context,
        protected: input.protected,
      })
      if (decision.action === "allow") return allow("read-only sandbox allows low-risk shell inspection")
      return deny("read-only sandbox blocks shell commands that are not clearly read-only", decision.pattern)
    }
    if (readonly.has(input.request.permission)) {
      const decision = PermissionGuardian.review({
        request: input.request,
        context: input.context,
        protected: input.protected,
      })
      if (decision.action === "allow") return allow("read-only sandbox allows workspace read")
      if (decision.action === "deny") return deny(decision.reason, decision.pattern)
      return ask(decision.reason)
    }
    if (input.protected) return ask("protected config paths require explicit approval")
    return ask("read-only sandbox leaves ambiguous non-mutating request for approval")
  }

  function write(input: { request: Request; context: InstanceContext; protected: boolean }): Decision {
    if (input.protected) return ask("protected config paths require explicit approval")
    if (workspace.has(input.request.permission)) return allow("workspace-write sandbox allows workspace mutation")
    if (input.request.permission === "external_directory") {
      if (input.request.metadata?.access === "read") return ask("external directory reads still need approval")
      return deny("workspace-write sandbox blocks writes outside the workspace")
    }
    if (input.request.permission === "bash") {
      const decision = PermissionGuardian.review({
        request: input.request,
        context: input.context,
        protected: input.protected,
      })
      if (decision.action === "deny") return deny(decision.reason, decision.pattern)
      if (decision.action === "allow") return allow("workspace-write sandbox allows low-risk shell inspection")
    }
    return ask("workspace-write sandbox uses normal permission flow")
  }

  function marker(mode: Mode): Rule {
    return {
      permission: mark,
      pattern: mode,
      action: "allow",
    }
  }

  function terminal(request: Request) {
    const mode = typeof request.metadata?.mode === "string" ? request.metadata.mode : request.patterns[0]
    return mode?.trim()
  }

  function allow(reason: string): Decision {
    return { action: "allow", reason }
  }

  function ask(reason: string): Decision {
    return { action: "ask", reason }
  }

  function deny(reason: string, pattern?: string): Decision {
    return { action: "deny", reason, pattern }
  }
}
