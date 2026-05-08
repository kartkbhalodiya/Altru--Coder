---
name: pr-review-toolkit
description: "Comprehensive pull request review workflow for Altru Coder. Use when the user asks to review a PR, inspect a branch, compare changes, find regressions, assess test coverage, or produce release/blocker feedback before merging."
displayName: PR Review Toolkit
shortDescription: Review PRs across correctness, tests, security, UX, and compatibility.
brandColor: "#F59E0B"
defaultPrompt: Review the current branch as a PR and lead with merge-blocking findings.
---

# PR Review Toolkit

Use this skill for a full review, not a style pass.

## Workflow

1. Determine the comparison base and inspect the actual diff.
2. Read enough surrounding code to understand the contract being changed.
3. Trace user-facing and API-facing behavior from input to output.
4. Check whether tests exercise the changed behavior, not just implementation details.
5. Look for compatibility breaks in CLI flags, config keys, SDK output, persisted state, events, and public package exports.
6. Check operational risks: logging, retries, rate limits, migrations, cleanup, concurrency, and failure recovery.
7. Run focused checks when practical.

## Review Lenses

- Correctness: wrong condition, stale state, bad async ordering, missing validation, bad default, off-by-one, broken fallback.
- Security: secret exposure, injection, path traversal, unsafe shelling out, permissive auth, untrusted input reaching tools.
- Tests: missing regression coverage, mocked duplicate logic, test that cannot fail, no coverage for error path.
- UX: broken empty/loading/error state, confusing labels, hidden failure, inaccessible controls.
- Compatibility: renamed fields, changed semantics, changed output shape, removed command behavior, altered config defaults.

## Output

Lead with findings ordered by severity:

```md
Findings
- High: path/file.ts:42 - Concrete bug, trigger condition, user impact, and suggested fix.
- Medium: path/file.ts:87 - Concrete risk, trigger condition, and impact.

Open Questions
- Any uncertainty that changes merge safety.

Checks
- Command: result.
```

If there are no issues, say that directly and list the checks or code paths reviewed.
