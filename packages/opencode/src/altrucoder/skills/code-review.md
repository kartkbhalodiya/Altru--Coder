---
name: code-review
description: Run a production-grade review of code changes, prioritizing correctness, security, regressions, and missing tests.
displayName: Code Review
shortDescription: Review diffs for bugs, risks, regressions, and test gaps.
brandColor: "#F97316"
defaultPrompt: Review the current changes and report only actionable findings first.
---

# Code Review

Use this skill when the user asks for a review, PR review, final check, regression check, or asks whether changes are safe.

## Workflow

1. Inspect the actual diff and touched files before judging.
2. Prioritize findings over summaries.
3. Report bugs, security issues, behavioral regressions, data loss risks, broken UX, and missing tests.
4. Give file and line references for every concrete finding.
5. If no issues are found, say that clearly and state residual risk.

## Output

Lead with findings ordered by severity. Keep summaries short and secondary.

Use this shape:

```md
Findings
- High: path/to/file.ts:42 - Concrete issue, trigger condition, and impact.
- Medium: path/to/file.ts:87 - Concrete issue, trigger condition, and impact.

Open Questions
- Any assumption that changes the verdict.

Summary
- Brief statement of what changed and what was checked.
```

## Review Standard

- Do not praise the code before findings.
- Do not list style preferences unless they hide a real maintainability risk.
- Do not invent issues. If evidence is incomplete, label it as a question.
- Prefer one precise serious finding over many vague comments.
