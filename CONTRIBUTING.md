# Contributing to Altru Coder

Thanks for helping improve Altru Coder. This project is a VS Code extension, CLI, local agent server, SDK, and provider-management UI for agentic coding.

Need setup help, provider help, or quick community support? Join the WhatsApp group or email support:

<https://chat.whatsapp.com/J0XfY7LF9RDDNQN54CQOTY>

<altru.coder.ai@gmail.com>

## Ways To Contribute

| Area | Good contributions |
|---|---|
| Bug fixes | Reproducible fixes for crashes, broken UI, model saving, tool output, or provider setup. |
| UI polish | Cleaner chat surfaces, settings layout fixes, accessible controls, and consistent glass styling. |
| Provider support | Provider presets, model fetch behavior, logos, endpoint defaults, and validation. |
| Agent behavior | Better mode prompts, safer tool usage, prompt enhancement, and response formatting. |
| Documentation | Clear setup guides, troubleshooting notes, screenshots, and accurate command examples. |
| Tests | Focused tests for provider logic, prompts, settings persistence, and CLI behavior. |

## Development Setup

Install dependencies from the repository root:

```bash
bun install
```

Run the CLI in development mode:

```bash
bun run dev
```

Build and launch the VS Code extension:

```bash
bun run extension
```

Fast relaunch after a successful build:

```bash
bun run extension -- --no-build
```

## Repository Map

| Path | What to change there |
|---|---|
| `packages/opencode` | CLI, server, agent runtime, tools, sessions, prompts, and mode behavior. |
| `packages/altru-coder-vscode` | Extension host code, bundled CLI launcher, webview messages, settings, and provider setup. |
| `packages/altru-coder-vscode/webview-ui` | Sidebar UI, chat UI, settings UI, model picker, styles, and i18n strings. |
| `packages/sdk/js` | Generated SDK output. Do not hand-edit generated files unless the generator output is intentionally committed. |
| `packages/altru-coder-ui` | Shared SolidJS UI components. |
| `packages/altru-coder-gateway` | Gateway-facing provider and auth integration code. |
| `packages/altru-coder-telemetry` | PostHog and OpenTelemetry integration. |

## Quality Checks

Run the smallest relevant checks for the files you changed.

| Area | Command |
|---|---|
| Root typecheck | `bun run typecheck` |
| Root lint | `bun run lint` |
| VS Code extension typecheck | `cd packages/altru-coder-vscode && bun run typecheck` |
| VS Code extension lint | `cd packages/altru-coder-vscode && bun run lint` |
| CLI typecheck | `cd packages/opencode && bun run typecheck` |
| CLI tests | `cd packages/opencode && bun test` |
| Markdown table padding | `bun run script/check-md-table-padding.ts --fix` |

Do not run root `bun test`; the root script intentionally exits. Run tests from the package that owns the code.

## Pull Request Rules

| Rule | Reason |
|---|---|
| Keep PRs focused | Reviewers can verify behavior faster and with fewer regressions. |
| Link an issue when possible | It preserves context for the problem and expected behavior. |
| Add a changeset for user-facing changes | Release notes need to explain what changed for users. |
| Include screenshots for UI work | Visual regressions are hard to review from code alone. |
| Mention checks you ran | Reviewers need to know what has been verified. |

Use conventional commit-style PR titles:

```text
feat(vscode): add provider logo support
fix(cli): repair code mode prompt behavior
docs: clarify local model setup
test(vscode): cover provider model persistence
```

## Coding Guidelines

| Guideline | Preferred style |
|---|---|
| Control flow | Prefer early returns over `else` chains. |
| Variables | Prefer `const`; avoid `let` unless mutation is necessary. |
| Types | Avoid `any`; use real exported types where possible. |
| Names | Prefer short clear names such as `cfg`, `dir`, `opts`, `pid`, and `state`. |
| Abstractions | Add helpers only when they remove real duplication or complexity. |
| Comments | Comment non-obvious logic, not self-explanatory assignments. |
| Runtime APIs | Prefer Bun APIs where the project already uses them. |

## Working On Shared OpenCode Files

Altru Coder is a fork, so shared OpenCode files should be changed carefully.

| Rule | Meaning |
|---|---|
| Prefer Altru Coder paths | Put new Altru Coder-specific code under paths that already contain `altru-coder` or `altrucoder` when possible. |
| Minimize shared edits | Keep changes to upstream files small and isolated. |
| Mark shared changes | Use `altrucoder_change` markers when required by the repo rules. |
| Avoid broad refactors | Large upstream refactors make future merges harder. |

## Issue Reports

Good bug reports include:

| Field | Example |
|---|---|
| Version | Extension version, CLI version, or commit SHA. |
| OS | Windows, macOS, Linux, WSL, or container. |
| Steps | Exact actions needed to reproduce the bug. |
| Expected | What should have happened. |
| Actual | What happened instead, including errors. |
| Evidence | Screenshot, logs, terminal output, or a small reproduction repo. |

## Support

For general setup help, provider configuration, model saving, or extension launch issues, use WhatsApp or email:

<https://chat.whatsapp.com/J0XfY7LF9RDDNQN54CQOTY>

<altru.coder.ai@gmail.com>

For security vulnerabilities, do not use WhatsApp. Follow `SECURITY.md`.
