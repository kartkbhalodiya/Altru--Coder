// altrucoder_change - new file
import CODE_MODE from "@/altrucoder/session/code-mode.txt"
import { AltruCoderMemory } from "@/altrucoder/memory"
import { AltruCoderPolicy } from "@/altrucoder/policy"

export namespace AltruCoderPromptFragments {
  function collaboration(mode: string) {
    const shared = [
      "<system-reminder>",
      "# Altru Coder Collaboration Mode",
      `Active mode: ${mode}`,
      "Match the mode before choosing tools or writing files.",
    ]
    if (mode === "code") {
      return [
        ...shared,
        "Code mode is for implementation. Inspect the repo, edit files directly, and verify the smallest relevant surface.",
        "Do not print standalone code unless the user explicitly asks for code in chat or examples only.",
        "</system-reminder>",
      ].join("\n")
    }
    if (mode === "ask") {
      return [
        ...shared,
        "Ask mode is for answers, explanation, comparison, and investigation.",
        "Do not modify files unless the user explicitly asks for an implementation or repo change.",
        "</system-reminder>",
      ].join("\n")
    }
    if (mode === "debug") {
      return [
        ...shared,
        "Debug mode is for reproducing failures, isolating the root cause, and proposing or applying the smallest fix.",
        "Prefer evidence from logs, tests, traces, and source references over speculation.",
        "</system-reminder>",
      ].join("\n")
    }
    if (mode === "orchestrator") {
      return [
        ...shared,
        "Orchestrator mode is for splitting independent work, tracking handoffs, and integrating results.",
        "Delegate only separable work and keep local control of the blocking path.",
        "</system-reminder>",
      ].join("\n")
    }
    if (mode === "plan") {
      return [
        ...shared,
        "Plan mode is for producing a decision-ready implementation plan before code changes.",
        "Keep the plan concrete: files, risks, checks, and rollout order.",
        "</system-reminder>",
      ].join("\n")
    }
  }

  export function mode(input: { agent: { name: string } }) {
    const extra = collaboration(input.agent.name)
    if (input.agent.name === "code") return [extra, CODE_MODE].filter(Boolean).join("\n\n")
    return extra
  }

  export async function memory(input: string | { projectID: string; root?: string; query?: string }) {
    const data = typeof input === "string" ? { projectID: input } : input
    return AltruCoderMemory.system(data.projectID, undefined, data.root, data.query)
  }

  export function policy() {
    return AltruCoderPolicy.instructions()
  }
}
