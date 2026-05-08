// altrucoder_change - new file
// Built-in skills that ship inside the CLI binary.
// Content is inlined at compile time via Bun's static import of .md files.
// Registered before all discovery phases so user skills with the same name override.

import ALTRU_CODER_CONFIG from "./altru-coder-config.md"
import CODE_REVIEW from "./code-review.md"
import CODE_REVIEW_TESTING from "./code-review-testing.md"
import CODE_REVIEW_BREAKING_CHANGES from "./code-review-breaking-changes.md"
import SKILL_CREATOR from "./skill-creator.md"
import SKILL_INSTALLER from "./skill-installer.md"

export interface BuiltinSkill {
  name: string
  description: string
  displayName?: string
  shortDescription?: string
  iconSmall?: string
  iconLarge?: string
  brandColor?: string
  defaultPrompt?: string
  enabled?: boolean
  dependencies?: Record<string, unknown>
  content: string
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    name: "altru-coder-config",
    displayName: "Altru Coder Config",
    shortDescription: "Configuration, Agent Manager, provider, and workspace setup guide.",
    brandColor: "#00D1B2",
    description:
      "Guide for Altru Coder configuration: config paths, altru-coder.json fields, commands, agents, skills, permissions, MCPs, providers, TUI settings, plus Agent Manager worktree setup/run scripts, workflows, and state. Use for Altru Coder config questions, locating loaded config, changing settings, or Agent Manager questions about run/setup scripts, worktree setup/workflows, apply/merge/PR/conflicts, missing sessions/worktrees, and agent-manager.json recovery.",
    defaultPrompt: "Use this skill when changing or debugging Altru Coder configuration.",
    content: ALTRU_CODER_CONFIG,
  },
  {
    name: "code-review",
    displayName: "Code Review",
    shortDescription: "Review diffs for bugs, regressions, and missing tests.",
    brandColor: "#F97316",
    description:
      "Run a production-grade review of code changes, prioritizing correctness, security, regressions, and missing tests.",
    defaultPrompt: "Review the current changes and report actionable findings first.",
    content: CODE_REVIEW,
  },
  {
    name: "code-review-testing",
    displayName: "Review Testing",
    shortDescription: "Identify missing tests and the smallest useful test plan.",
    brandColor: "#22C55E",
    description: "Test authoring guidance for code reviews. Use when evaluating whether tests cover risky behavior.",
    defaultPrompt: "Check whether the changed behavior has the right tests.",
    content: CODE_REVIEW_TESTING,
  },
  {
    name: "code-review-breaking-changes",
    displayName: "Breaking Change Review",
    shortDescription: "Detect compatibility risks in APIs, config, storage, and workflows.",
    brandColor: "#EF4444",
    description:
      "Breaking-change review guidance for APIs, configs, commands, schemas, persisted state, and user workflows.",
    defaultPrompt: "Check the current change for hidden breaking changes.",
    content: CODE_REVIEW_BREAKING_CHANGES,
  },
  {
    name: "skill-creator",
    displayName: "Skill Creator",
    shortDescription: "Design and write high-quality SKILL.md files.",
    brandColor: "#14B8A6",
    description: "Guide for creating effective Altru Coder skills with trigger conditions, workflows, and resources.",
    defaultPrompt: "Create or improve an Altru Coder skill.",
    content: SKILL_CREATOR,
  },
  {
    name: "skill-installer",
    displayName: "Skill Installer",
    shortDescription: "Add local or project skills safely.",
    brandColor: "#6366F1",
    description: "Install or register Altru Coder skills from local folders, repository folders, or curated built-ins.",
    defaultPrompt: "Install or register a skill for Altru Coder.",
    content: SKILL_INSTALLER,
  },
]
