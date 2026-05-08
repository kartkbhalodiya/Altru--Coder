---
name: code-review-testing
description: Test authoring guidance for code reviews. Use when evaluating whether tests cover the risky behavior in a change.
displayName: Review Testing
shortDescription: Identify missing tests and the smallest useful test plan.
brandColor: "#22C55E"
defaultPrompt: Check whether the changed behavior has the right tests.
---

# Review Testing

Use this skill during review when a change touches behavior, permissions, IO, provider integration, UI flows, or state transitions.

## What To Check

- Does a test fail before the fix and pass after it?
- Are edge cases represented, not only the happy path?
- Are permissions, cancellation, empty states, invalid inputs, and retries covered?
- Are mocks avoided when a real implementation can be tested cheaply?
- Is the test close to the changed module?

## Output

```md
Testing Gaps
- path/to/file.ts:42 - Missing test for the failing condition.

Recommended Test
- Add/extend `test/path.test.ts` to assert ...
```

Do not demand broad test suites for tiny cosmetic changes. Scale the test requirement to the risk.
