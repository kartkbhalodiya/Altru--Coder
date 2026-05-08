---
name: skill-installer
description: Install or register Altru Coder skills from local folders, repository folders, or curated built-ins.
displayName: Skill Installer
shortDescription: Add local or project skills safely.
brandColor: "#6366F1"
defaultPrompt: Install or register a skill for Altru Coder.
---

# Skill Installer

Use this skill when the user wants to add skills to Altru Coder.

## Supported Locations

- Project skills: `.altru-coder/skills/<name>/SKILL.md`
- Legacy project skills: `.opencode/skills/<name>/SKILL.md`
- Global skills: configured through `skills.paths` in Altru Coder config
- Built-in skills: compiled into the CLI through `packages/opencode/src/altrucoder/skills/builtin.ts`

## Safe Install Workflow

1. Inspect the source skill before installing.
2. Check for scripts, network access, shell commands, or secret handling.
3. Ensure `SKILL.md` has valid frontmatter with `name` and `description`.
4. Prefer project install under `.altru-coder/skills/<name>/`.
5. Do not overwrite an existing skill without showing the diff.

## Verification

After install:

- Confirm the final `SKILL.md` path.
- Confirm the skill name.
- Run the smallest relevant check if code changed.
- Explain how the model will trigger the skill.
