// altrucoder_change - new file
// Built-in skills that ship inside the CLI binary.
// Content is inlined at compile time via Bun's static import of .md files.
// Registered before all discovery phases so user skills with the same name override.

import ALTRU_CODER_CONFIG from "./altru-coder-config.md"
import CODE_REVIEW from "./code-review.md"
import CODE_REVIEW_TESTING from "./code-review-testing.md"
import CODE_REVIEW_BREAKING_CHANGES from "./code-review-breaking-changes.md"
import FEATURE_DEV from "./feature-dev.md"
import FRONTEND_DESIGN from "./frontend-design.md"
import PR_REVIEW_TOOLKIT from "./pr-review-toolkit.md"
import PLUGIN_DEV from "./plugin-dev.md"
import SECURITY_GUIDANCE from "./security-guidance.md"
import SKILL_CREATOR from "./skill-creator.md"
import SKILL_INSTALLER from "./skill-installer.md"
import UI_UX_PRO_MAX from "./ui-ux-pro-max.md"
import UI_UX_PRO_MAX_FULL from "./ui-ux-pro-max-pack/skills/ui-ux-pro-max/SKILL.md"
import CKM_BANNER_DESIGN from "./ui-ux-pro-max-pack/skills/banner-design/SKILL.md"
import CKM_BRAND from "./ui-ux-pro-max-pack/skills/brand/SKILL.md"
import CKM_DESIGN from "./ui-ux-pro-max-pack/skills/design/SKILL.md"
import CKM_DESIGN_SYSTEM from "./ui-ux-pro-max-pack/skills/design-system/SKILL.md"
import CKM_SLIDES from "./ui-ux-pro-max-pack/skills/slides/SKILL.md"
import CKM_UI_STYLING from "./ui-ux-pro-max-pack/skills/ui-styling/SKILL.md"

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
    name: "feature-dev",
    displayName: "Feature Dev",
    shortDescription: "Build features with discovery, scoped edits, and verification.",
    brandColor: "#0EA5E9",
    description:
      "End-to-end feature development workflow for Altru Coder. Use when the user asks to build, add, implement, wire, ship, refactor, or fix a feature that may touch multiple files, needs codebase discovery, requires tests, or benefits from a plan before implementation.",
    defaultPrompt: "Implement the requested feature with a focused plan and verification.",
    content: FEATURE_DEV,
  },
  {
    name: "frontend-design",
    displayName: "Frontend Design",
    shortDescription: "Build polished, responsive Altru UI without layout regressions.",
    brandColor: "#A855F7",
    description:
      "Frontend design and implementation guidance for Altru Coder. Use when building or changing UI screens, VS Code webviews, dashboards, app layouts, design-system components, responsive behavior, visual polish, accessibility, or interaction states.",
    defaultPrompt: "Design and implement the requested UI using existing Altru patterns.",
    content: FRONTEND_DESIGN,
  },
  {
    name: "ui-ux-pro-max",
    displayName: "UI/UX Pro Max",
    shortDescription: "Route UI work to the nearest bundled design skill.",
    brandColor: "#EC4899",
    description:
      "Router for the bundled UI/UX Pro Max skill pack. Use for UI/UX, frontend, visual design, web/mobile interfaces, landing pages, dashboards, components, accessibility, responsive layout, typography, color, animation, charts, brand, banners, slides, or design systems. First route to the nearest narrow skill: ckm:ui-styling, ckm:design-system, ckm:brand, ckm:slides, ckm:banner-design, ckm:design, or ui-ux-pro-max-full.",
    defaultPrompt: "Route this UI/UX task to the nearest specific design skill before loading the full guide.",
    content: UI_UX_PRO_MAX,
  },
  {
    name: "ckm:ui-styling",
    displayName: "UI Styling",
    shortDescription: "Build accessible UI components, layouts, Tailwind, and shadcn/ui surfaces.",
    brandColor: "#38BDF8",
    description:
      "Create beautiful, accessible user interfaces with shadcn/ui, Radix UI, Tailwind CSS, responsive layouts, dialogs, dropdowns, forms, tables, dark mode, theme customization, and consistent styling patterns.",
    defaultPrompt: "Build or fix this interface with accessible components, responsive layout, and stable styling.",
    content: CKM_UI_STYLING,
  },
  {
    name: "ckm:design-system",
    displayName: "Design System",
    shortDescription: "Design tokens, component specs, variants, states, and theme architecture.",
    brandColor: "#8B5CF6",
    description:
      "Create and maintain design systems: primitive and semantic tokens, CSS variables, Tailwind integration, component specs, states, variants, governance, and reusable UI foundations.",
    defaultPrompt: "Define or repair the design-system structure behind this UI.",
    content: CKM_DESIGN_SYSTEM,
  },
  {
    name: "ckm:brand",
    displayName: "Brand",
    shortDescription: "Brand identity, logo rules, voice, color, typography, and consistency.",
    brandColor: "#F97316",
    description:
      "Apply, document, or enforce brand identity including logo usage, visual identity, color palettes, typography, voice, messaging, assets, guidelines, and approval checks.",
    defaultPrompt: "Apply the brand system consistently to this work.",
    content: CKM_BRAND,
  },
  {
    name: "ckm:slides",
    displayName: "Slides",
    shortDescription: "Presentation structure, slide layouts, pitch decks, charts, and slide copy.",
    brandColor: "#F59E0B",
    description:
      "Create strategic HTML presentations, pitch decks, slide layouts, slide copy, chart slides, narrative structure, and presentation visual systems.",
    defaultPrompt: "Create or improve the slide experience with strong structure and readable visuals.",
    content: CKM_SLIDES,
  },
  {
    name: "ckm:banner-design",
    displayName: "Banner Design",
    shortDescription: "Social, ad, hero, cover, and print/web banner design.",
    brandColor: "#EC4899",
    description:
      "Design banners for social media, ads, website heroes, headers, covers, creative assets, and print with multiple art directions, sizes, safe zones, visual hierarchy, and campaign fit.",
    defaultPrompt: "Design this banner with the right size, hierarchy, brand fit, and visual direction.",
    content: CKM_BANNER_DESIGN,
  },
  {
    name: "ckm:design",
    displayName: "Design",
    shortDescription: "Logo, icon, CIP, broad visual design, and generated visual assets.",
    brandColor: "#14B8A6",
    description:
      "Comprehensive visual design skill for brand identity, logo, icon, corporate identity packages, creative assets, social graphics, art direction, and broad design production.",
    defaultPrompt: "Handle this visual design request with the right asset type, style, and production constraints.",
    content: CKM_DESIGN,
  },
  {
    name: "ui-ux-pro-max-full",
    displayName: "UI/UX Pro Max Full Guide",
    shortDescription: "Full UI/UX Pro Max guide for broad audits or complex design reasoning.",
    brandColor: "#DB2777",
    description:
      "Complete UI/UX Pro Max design intelligence guide. Use only for broad UI/UX audits, complex product design reasoning, or when the narrower ckm skills do not cover the request.",
    defaultPrompt: "Use the full UI/UX Pro Max guide because the narrower skills are not enough.",
    content: UI_UX_PRO_MAX_FULL,
  },
  {
    name: "pr-review-toolkit",
    displayName: "PR Review Toolkit",
    shortDescription: "Review PRs across correctness, tests, security, UX, and compatibility.",
    brandColor: "#F59E0B",
    description:
      "Comprehensive pull request review workflow for Altru Coder. Use when the user asks to review a PR, inspect a branch, compare changes, find regressions, assess test coverage, or produce release/blocker feedback before merging.",
    defaultPrompt: "Review the current branch as a PR and lead with merge-blocking findings.",
    content: PR_REVIEW_TOOLKIT,
  },
  {
    name: "plugin-dev",
    displayName: "Plugin Dev",
    shortDescription: "Build Altru skills, commands, agents, and plugins safely.",
    brandColor: "#10B981",
    description:
      "Development workflow for Altru Coder skills, commands, agents, and plugins. Use when creating or modifying SKILL.md files, built-in skills, project skills, CLI commands, TUI plugins, Agent Manager integrations, or Altru extension workflows.",
    defaultPrompt: "Create or update the requested Altru Coder extension point.",
    content: PLUGIN_DEV,
  },
  {
    name: "security-guidance",
    displayName: "Security Guidance",
    shortDescription: "Review trust boundaries, secrets, permissions, and abuse paths.",
    brandColor: "#DC2626",
    description:
      "Security review and implementation guidance for Altru Coder. Use when code touches authentication, authorization, API keys, provider routing, model gateways, shell execution, filesystem access, network calls, extensions, plugins, MCPs, telemetry, or user-supplied input.",
    defaultPrompt: "Review or implement this change with security and abuse resistance first.",
    content: SECURITY_GUIDANCE,
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
