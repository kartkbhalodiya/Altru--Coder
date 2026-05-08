---
name: code-review-breaking-changes
description: Breaking-change review guidance for APIs, configs, commands, schemas, persisted state, and user workflows.
displayName: Breaking Change Review
shortDescription: Detect compatibility risks in APIs, config, storage, and workflows.
brandColor: "#EF4444"
defaultPrompt: Check the current change for hidden breaking changes.
---

# Breaking Change Review

Use this skill when a change touches public APIs, commands, config files, storage schemas, model/provider settings, extension messages, SDK output, or persisted state.

## Checklist

- Public API or CLI flags changed?
- Config field renamed, removed, or changed type?
- Database or JSON storage changed without migration?
- SDK schema changed without regeneration?
- Extension webview message contract changed?
- Existing users lose settings, sessions, models, auth, or history?
- Default behavior changed silently?

## Output

```md
Breaking Risks
- High: path/to/file.ts:42 - Existing users with ... will break because ...

Required Compatibility Work
- Add migration/backward-compatible parser/docs/version gate.
```

If the change is intentionally breaking, state the migration path.
