# Custom Command System

**Priority:** P2

## Remaining Work

- Slash command input handling in chat (detect `/` prefix, show command list)
- Project-level command discovery (scan `.altrucoder/commands/` or similar)
- YAML frontmatter metadata support
- Symlink-aware command discovery
- VS Code command palette entry points
- Wire to CLI's custom command system for execution

## Primary Implementation Anchors (altrucoder-legacy)

These exist in the [altrucoder-legacy](https://github.com/Altru-Coder/altrucoder-legacy) repo, not in this extension:

- `src/services/command/`
