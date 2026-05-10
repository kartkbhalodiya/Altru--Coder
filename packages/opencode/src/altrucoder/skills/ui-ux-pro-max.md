---
name: ui-ux-pro-max
description: "Router for the bundled UI/UX Pro Max skill pack. Use for UI/UX, frontend, visual design, web/mobile interfaces, landing pages, dashboards, components, accessibility, responsive layout, typography, color, animation, charts, brand, banners, slides, or design systems. First route to the nearest narrow skill: ckm:ui-styling, ckm:design-system, ckm:brand, ckm:slides, ckm:banner-design, ckm:design, or ui-ux-pro-max-full."
displayName: UI/UX Pro Max
shortDescription: Route UI work to the nearest bundled design skill.
brandColor: "#EC4899"
defaultPrompt: Route this UI/UX task to the nearest specific design skill before loading the full guide.
---

# UI/UX Pro Max Router

This is the lightweight entrypoint for the bundled UI/UX Pro Max pack in Altru Coder.

Do not load the full guide by default. Pick the nearest skill first:

| Task | Load this skill |
|---|---|
| Build or fix UI components, forms, dialogs, dropdowns, tables, responsive layouts, Tailwind, shadcn/ui | `ckm:ui-styling` |
| Tokens, CSS variables, component specs, design systems, theme architecture | `ckm:design-system` |
| Brand identity, logo usage, color palette, typography rules, voice, visual consistency | `ckm:brand` |
| Presentations, pitch decks, slide layouts, slide copy, chart slides | `ckm:slides` |
| Social banners, ad banners, headers, covers, print/web banner sizing | `ckm:banner-design` |
| Logo/icon generation, CIP mockups, broad visual design work | `ckm:design` |
| Broad UI/UX quality review, style selection, accessibility audit, product-specific design reasoning | `ui-ux-pro-max-full` only after the narrow skills are not enough |

## Loading Rule

1. Read this router.
2. Choose the one nearest skill above.
3. Load that skill with the `skill` tool.
4. Read only the specific referenced file, script, or data table needed for the current task.
5. Avoid reading the entire pack unless the user explicitly asks for a full UI/UX audit or the narrow skills do not answer the task.

The complete original UI/UX Pro Max guide is bundled as `ui-ux-pro-max-full`.
