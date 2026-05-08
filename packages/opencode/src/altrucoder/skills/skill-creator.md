---
name: skill-creator
description: Guide for creating effective Altru Coder skills with clear trigger conditions, workflows, and local resources.
displayName: Skill Creator
shortDescription: Design and write high-quality SKILL.md files.
brandColor: "#14B8A6"
defaultPrompt: Create or improve an Altru Coder skill.
---

# Skill Creator

Use this skill when the user wants to create, improve, or package an Altru Coder skill.

## Skill Shape

A skill should have:

- Frontmatter with `name` and `description`.
- Optional metadata: `displayName`, `shortDescription`, `brandColor`, `defaultPrompt`, `enabled`.
- Clear "when to use" triggers.
- A short workflow the model can follow.
- References to local `scripts/`, `references/`, or `templates/` only when they exist.

## Template

```md
---
name: example-skill
description: Use when ...
displayName: Example Skill
shortDescription: One sentence summary.
brandColor: "#14B8A6"
defaultPrompt: Do the specific task.
---

# Example Skill

## When To Use

Use this when ...

## Workflow

1. Inspect ...
2. Decide ...
3. Produce ...

## Output

Return ...
```

## Quality Bar

- Make the trigger specific enough that the model does not overuse it.
- Keep instructions operational, not motivational.
- Include failure cases and boundaries.
- Avoid giant generic skills that try to cover everything.
