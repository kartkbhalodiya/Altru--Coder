---
name: security-guidance
description: "Security review and implementation guidance for Altru Coder. Use when code touches authentication, authorization, API keys, provider routing, model gateways, shell execution, filesystem access, network calls, extensions, plugins, MCPs, telemetry, or user-supplied input."
displayName: Security Guidance
shortDescription: Review trust boundaries, secrets, permissions, and abuse paths.
brandColor: "#DC2626"
defaultPrompt: Review or implement this change with security and abuse resistance first.
---

# Security Guidance

Use this skill when the change crosses a trust boundary or handles user, provider, or secret-bearing data.

## Workflow

1. Identify assets: credentials, tokens, user files, model output, billing quota, workspace state, telemetry, and external service access.
2. Identify trust boundaries: user prompt to tool, model output to shell, webview to extension host, local process to gateway, gateway to provider.
3. Trace the risky path from input to side effect.
4. Add validation, escaping, permission checks, rate limits, or redaction at the boundary where the data changes trust level.
5. Make failures visible with safe logs. Never log raw secrets, bearer tokens, full auth headers, or private prompts unless explicitly intended.
6. Add tests or focused manual checks for the security condition.

## Common Altru Risks

- Secret leakage through constants, logs, telemetry, errors, snapshots, or generated docs.
- Prompt or tool injection causing shell commands, file writes, network calls, or provider requests.
- Path traversal in workspace, upload, export, import, or plugin file handling.
- SSRF or unsafe provider base URLs.
- Quota bypass in free model routing or gateway fallback logic.
- Webview message handlers that trust frontend state without extension-side validation.
- Plugin or skill installation that executes unreviewed scripts.

## Implementation Standard

- Prefer allowlists over denylists for commands, paths, origins, and provider IDs.
- Redact at the logging boundary, not only at the display boundary.
- Use env var names in source and keep actual values outside the repo.
- Fail closed when credentials, org state, or policy cannot be verified.
- Keep security checks close to the code that performs the side effect.

## Output

For reviews, lead with exploitable findings and concrete reproduction conditions. For implementation, state the trust boundary protected and the verification performed.
