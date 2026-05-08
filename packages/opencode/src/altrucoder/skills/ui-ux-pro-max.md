---
name: ui-ux-pro-max
description: "Advanced UI/UX design intelligence for Altru Coder. Use when planning, building, reviewing, fixing, or polishing websites, landing pages, dashboards, admin panels, SaaS screens, mobile views, forms, tables, charts, navigation, design systems, color palettes, typography, accessibility, responsive layouts, animation, and interaction states."
displayName: UI/UX Pro Max
shortDescription: Deep UI/UX guidance for polished product interfaces.
brandColor: "#EC4899"
defaultPrompt: Design, implement, or review this UI with strong UX, accessibility, and visual quality.
---

# UI/UX Pro Max

Advanced design guidance for web and mobile interfaces. Use this skill when a task changes how a product looks, feels, moves, or is operated.

Adapted for Altru Coder from UI/UX Pro Max v2.5.0 by Next Level Builder under the MIT license. This built-in version is prompt-only and does not require external scripts.

## When To Use

Use this skill for:

- New UI surfaces: landing pages, dashboards, admin panels, SaaS apps, e-commerce, portfolios, blogs, mobile screens, onboarding, paywalls, settings, checkout, and profile pages.
- UI components: buttons, navbars, sidebars, modals, cards, tables, forms, charts, filters, menus, tabs, drawers, toasts, empty states, loading states, and error states.
- Visual systems: color palettes, typography, spacing, radius, shadows, elevation, icons, imagery, dark mode, brand expression, and component tokens.
- UX quality: accessibility, keyboard navigation, touch targets, focus order, screen reader labels, responsive behavior, motion, progressive disclosure, and workflow clarity.
- Review or polish requests: "make this professional", "improve the UI", "fix mobile", "check accessibility", "make it premium", "improve dashboard UX", or similar wording.

Skip this skill for pure backend, provider routing, database, infrastructure, shell automation, or non-visual refactors unless the change has a user-facing interface impact.

## Priority Order

Apply design judgment in this order:

1. Accessibility and operability.
2. Touch, keyboard, and interaction feedback.
3. Layout stability and responsive behavior.
4. Product fit and visual style.
5. Typography, color, and spacing.
6. Animation and transitions.
7. Forms, errors, and recovery paths.
8. Navigation and information architecture.
9. Charts and data readability.
10. Decorative polish.

Do not optimize decoration before the interface is usable, readable, and predictable.

## Workflow

1. Identify the product type, target user, primary workflow, stack, viewport range, and current design system.
2. Inspect nearby UI before designing. Match existing primitives, spacing, token names, icon libraries, and state patterns unless there is a clear product reason to change them.
3. Choose a style that fits the product. Developer tools and operations screens should be dense, calm, and scannable. Consumer, portfolio, editorial, and game surfaces can carry more expression.
4. Define the screen hierarchy: primary action, secondary actions, navigation, core content, supporting metadata, and recovery paths.
5. Build full states: loading, empty, populated, error, disabled, hover, focus, active, selected, offline or slow network where relevant.
6. Verify that text fits, controls remain stable, mobile does not horizontally scroll, and dynamic content cannot collapse the layout.
7. Run the smallest useful code check. For meaningful UI work, inspect at least one narrow and one desktop viewport when tooling is available.

## Accessibility Baseline

- Text contrast should meet WCAG AA: 4.5:1 for normal text and 3:1 for large text or essential graphical objects.
- Every interactive control must have a semantic role, visible focus state, keyboard path, and accessible name.
- Icon-only buttons need labels through visible text, tooltip plus `aria-label`, or platform accessibility metadata.
- Do not remove focus rings. Restyle them if needed, but keep them visible.
- Preserve logical heading order. Do not skip from `h1` to `h4` for visual size.
- Do not use color as the only signal for state, validation, severity, or chart meaning.
- Respect reduced-motion settings for animations, page transitions, charts, and loading effects.
- Prefer wrapping over truncation. If truncation is necessary, provide the full value through a tooltip, title, details row, or expandable view.

## Touch And Interaction

- Use at least 44px by 44px effective hit areas for touch targets.
- Leave at least 8px between adjacent touch targets.
- Give immediate feedback for tap, press, hover, active, selection, submit, and async states.
- Disable duplicate submit paths while an async action is running and show progress or pending state.
- Keep destructive actions visually distinct and require confirmation when data loss is plausible.
- Do not rely on hover-only controls for core actions.
- Keep primary actions near the place where the user makes the decision.

## Layout And Responsiveness

- Design mobile-first, then scale up. Keep the core workflow visible before secondary metadata.
- Avoid fixed pixel widths for main containers. Use grid tracks, `minmax`, `clamp`, max widths, container queries, or flexible primitives.
- Reserve stable dimensions for images, charts, skeletons, counters, toolbars, boards, and dynamic labels.
- Use `min-height`, aspect ratios, and explicit grid areas to prevent layout shift.
- Prevent horizontal scroll on mobile unless the element is an intentionally scrollable data surface.
- Use `min-h-dvh` or equivalent for full-height mobile screens where supported.
- Avoid nested cards and floating sections. Use cards for repeated items, dialogs, and framed tools, not page sections inside page sections.

## Typography

- Keep body text at 16px or larger on mobile to avoid iOS zoom and readability failures.
- Use line-height around 1.45 to 1.7 for body text.
- Keep line length around 35-60 characters on mobile and 60-75 on desktop.
- Use a clear type scale. Do not use hero-sized type inside compact panels, sidebars, tables, or dashboard cards.
- Use tabular numbers for prices, metrics, timers, counters, and data tables.
- Avoid negative letter spacing and viewport-scaled font sizes.

## Color And Theming

- Use semantic tokens: background, surface, border, text, muted, primary, secondary, success, warning, danger, focus.
- Avoid raw hex values spread through components when the codebase has token support.
- Check light and dark modes separately. Do not invert colors mechanically.
- Avoid one-note palettes dominated by a single hue family.
- Use color to support hierarchy, not to carry meaning alone.
- Keep disabled states visibly disabled while still readable.

## Motion

- Use motion only when it clarifies cause and effect, spatial relationship, hierarchy, or state transition.
- Prefer transform and opacity. Avoid animating width, height, top, left, or layout-heavy properties.
- Keep micro-interactions around 150-300ms and complex transitions under about 400ms.
- Make animations interruptible and never block user input.
- Use skeletons or progressive loading for content that takes more than a brief moment.
- Avoid decorative-only animation in tools where repeated use matters.

## Forms And Feedback

- Use visible labels. Do not rely on placeholders as labels.
- Put validation messages near the field that caused the problem.
- Validate after blur or submit unless immediate validation is genuinely helpful.
- For submit failures, keep user input intact and focus the first invalid or failed field when possible.
- Show helper text for complex inputs before the user makes an error.
- Use clear empty states with a concrete next action.
- Toasts should be supplementary. Critical errors need inline or persistent placement.

## Navigation

- Preserve predictable back behavior.
- Keep navigation labels clear and stable. Do not hide core navigation behind clever visuals.
- For mobile bottom nav, keep the primary set small and labeled.
- Highlight current location.
- Support deep links or direct routes when the app architecture supports them.
- Avoid nested scroll regions unless there is a strong workflow reason.

## Charts And Data

- Match chart type to the question: trend uses line, comparison uses bar, part-to-whole uses stacked or donut sparingly, distribution uses histogram or box plot, flow uses funnel or sankey only when needed.
- Data-heavy views should offer table alternatives, sorting, filtering, and export when users need precision.
- Do not rely on color alone in charts. Add labels, shapes, texture, or direct annotation.
- Keep gridlines subtle and labels readable.
- For large datasets, aggregate, sample, paginate, virtualize, or provide drill-down.
- Show chart loading, empty, and error states instead of blank axes.

## Style Fit

- SaaS and developer tools: restrained color, dense but calm layout, clear controls, fast scanning, low decoration.
- Finance, security, and enterprise: high trust, strong hierarchy, conservative motion, readable data, explicit states.
- E-commerce and marketplace: clear product media, visible price/action, comparison support, strong mobile checkout flow.
- Portfolio and editorial: stronger imagery, expressive typography, but keep navigation and contact paths obvious.
- Health, education, and civic: accessibility and trust dominate style.
- Games and immersive experiences: visual expression can be higher, but controls and feedback still need to be obvious.

## Review Checklist

Before calling UI work ready, check:

- The primary workflow is obvious within a few seconds.
- The primary action has one clear visual winner.
- Every interactive element has hover, focus, disabled, and active or selected behavior where relevant.
- Loading, empty, error, and success states exist for async surfaces.
- Mobile layout has no accidental horizontal scroll.
- Text fits inside buttons, cards, tabs, tables, and sidebars.
- Keyboard navigation reaches every control in a sensible order.
- Icons come from the existing icon library where possible.
- Visual assets show the real product, state, person, or content when inspection matters.
- The implementation follows existing local components and tokens.
