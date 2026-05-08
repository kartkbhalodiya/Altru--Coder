---
name: frontend-design
description: "Frontend design and implementation guidance for Altru Coder. Use when building or changing UI screens, VS Code webviews, dashboards, app layouts, design-system components, responsive behavior, visual polish, accessibility, or interaction states."
displayName: Frontend Design
shortDescription: Build polished, responsive Altru UI without layout regressions.
brandColor: "#A855F7"
defaultPrompt: Design and implement the requested UI using existing Altru patterns.
---

# Frontend Design

Use this skill when the work affects what a user sees or interacts with.

## Workflow

1. Inspect nearby UI first: component library, spacing, colors, typography, icon use, state handling, and routing.
2. Decide the primary workflow the screen must support. Optimize for that workflow before decoration.
3. Build complete states: empty, loading, normal, error, disabled, hover/focus, and narrow viewport.
4. Use existing component primitives and icon libraries when available.
5. Keep density appropriate to the product. Developer tools should be scannable, restrained, and fast to operate.
6. Give fixed-format elements stable dimensions with `min`, `max`, grid tracks, aspect ratios, or container-relative sizing.
7. Verify visually with the smallest useful browser or screenshot check when the change is non-trivial.

## Visual Standard

- Avoid nested cards, decorative blobs, and one-color themes.
- Do not use large hero-style typography inside compact tool panels.
- Text must fit its container at mobile and desktop sizes.
- Buttons should use icons where the action is familiar and text where ambiguity would cost the user time.
- Avoid in-app instructional copy that explains obvious UI mechanics.
- Use real product, file, state, or workflow signals rather than generic decoration.

## Altru Coder Targets

- Shared UI lives under `packages/altru-coder-ui/`.
- VS Code webview UI lives under `packages/altru-coder-vscode/webview-ui/`.
- CLI/TUI UI lives under `packages/opencode/src/tui/` and Altru additions under `packages/opencode/src/altrucoder/`.

## Verification

Run package typecheck or compile checks for the touched UI package. For visual changes, inspect at least one narrow and one desktop viewport when tooling is available.
