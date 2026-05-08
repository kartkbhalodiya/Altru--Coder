---
name: plugin-dev
description: "Development workflow for Altru Coder skills, commands, agents, and plugins. Use when creating or modifying SKILL.md files, built-in skills, project skills, CLI commands, TUI plugins, Agent Manager integrations, or Altru extension workflows."
displayName: Plugin Dev
shortDescription: Build Altru skills, commands, agents, and plugins safely.
brandColor: "#10B981"
defaultPrompt: Create or update the requested Altru Coder extension point.
---

# Plugin Dev

Use this skill when the user wants to extend Altru Coder rather than only change app behavior.

## Choose The Extension Point

- Skill: reusable instruction in `.altru-coder/skills/<name>/SKILL.md` or built in through `packages/opencode/src/altrucoder/skills/builtin.ts`.
- Agent: reusable role configured through project/global config or Altru agent helpers.
- Command: CLI command registered through command modules.
- TUI plugin/component: runtime UI behavior under Altru-specific plugin or component paths.
- Provider integration: model routing or gateway behavior under Altru provider packages.

## Skill Workflow

1. Write frontmatter with `name` and a strong trigger-focused `description`.
2. Keep the body operational: when to use, workflow, output, boundaries, verification.
3. Add scripts or references only when they will actually be reused.
4. For built-ins, import the markdown in `packages/opencode/src/altrucoder/skills/builtin.ts` and add a `BUILTIN_SKILLS` entry.
5. User and project skills should override built-ins by name, so do not rely on a built-in being impossible to replace.

## Command Or Plugin Workflow

1. Find an existing nearby command or plugin with the same lifecycle.
2. Reuse registration, telemetry, config, and permission patterns.
3. Keep Altru-specific code in Altru-owned directories when possible.
4. Add tests for parsing, registration, and failure handling when behavior is observable.

## Safety Checks

- Do not install opaque scripts without inspecting them.
- Do not run networked or shell hooks without clear user intent.
- Do not write secrets into skill files, config defaults, or source code.
- Make extension points fail closed when config is missing or malformed.

## Output

Report the created extension point, how it is discovered, how it triggers, and the check used to verify it.
