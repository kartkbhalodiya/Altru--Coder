// altrucoder_change - new file
// Built-in skills that ship inside the CLI binary.
// Content is inlined at compile time via Bun's static import of .md files.
// Registered before all discovery phases so user skills with the same name override.

import ALTRU_CODER_CONFIG from "./altru-coder-config.md"

export interface BuiltinSkill {
  name: string
  description: string
  content: string
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    name: "altru-coder-config",
    description:
      "Guide for Altru Coder configuration: config paths, altru-coder.json fields, commands, agents, skills, permissions, MCPs, providers, TUI settings, plus Agent Manager worktree setup/run scripts, workflows, and state. Use for Altru Coder config questions, locating loaded config, changing settings, or Agent Manager questions about run/setup scripts, worktree setup/workflows, apply/merge/PR/conflicts, missing sessions/worktrees, and agent-manager.json recovery.",
    content: ALTRU_CODER_CONFIG,
  },
]
