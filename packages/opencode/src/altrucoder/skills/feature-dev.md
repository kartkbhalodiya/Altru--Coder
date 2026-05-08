---
name: feature-dev
description: "End-to-end feature development workflow for Altru Coder. Use when the user asks to build, add, implement, wire, ship, refactor, or fix a feature that may touch multiple files, needs codebase discovery, requires tests, or benefits from a plan before implementation."
displayName: Feature Dev
shortDescription: Build features with discovery, scoped edits, and verification.
brandColor: "#0EA5E9"
defaultPrompt: Implement the requested feature with a focused plan and verification.
---

# Feature Dev

Use this skill when a request is bigger than a one-line edit and needs the model to move from intent to working code.

## Workflow

1. Identify the user-visible behavior, acceptance criteria, and the smallest useful scope.
2. Inspect the code paths that already own the behavior. Prefer existing APIs, helpers, styles, and test patterns.
3. Map the data flow before editing: entry point, state, side effects, persistence, output, and error path.
4. Choose the least invasive implementation, especially in shared upstream OpenCode files. Prefer Altru-specific directories when possible.
5. Make a vertical change that works end to end before polishing edge cases.
6. Add or update focused tests where behavior, contracts, or regression risk changed.
7. Run the smallest relevant checks for the touched package and fix failures introduced by the change.

## Altru Coder Rules

- Preserve user changes in the worktree.
- Use `packages/opencode/src/altrucoder/` or other Altru-owned paths before editing shared OpenCode files.
- If shared OpenCode files must change, keep the diff small and add required `altrucoder_change` markers.
- Do not add secrets to source files. Use env names or config fields.
- For UI work, match existing Altru UI patterns before adding a new visual language.

## Output

When finished, report:

- What changed from the user's perspective.
- The important files touched.
- The verification command results.
- Any remaining risk or check that could not be run.

## Failure Cases

Stop and clarify only when the requested behavior conflicts with existing product rules, requires credentials that are not present, or would need destructive changes to user files.
