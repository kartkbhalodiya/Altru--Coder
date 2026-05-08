# AltruCoder Rules Migration

This document explains how AltruCoder rules are automatically migrated to Opencode's `instructions` config array.

## Overview

AltruCoder stores rules in various file locations. When Opencode starts, it reads these files and injects their paths into the `instructions` config array, which Opencode then loads as part of the system prompt.

## Key Guarantees

### 1. Read-Only Migration

The migration **never modifies project files**. We only:

- Read existing rule files from disk
- Inject file paths into the config's `instructions` array
- Never write to the project or modify any files

### 2. Combines with Existing Config (Never Overwrites)

If you have existing opencode config with `instructions`, the AltruCoder rules are **combined**, not replaced:

```typescript
// Example: User has opencode.json with:
{ "instructions": ["AGENTS.md", "custom-rules.md"] }

// AltruCoder rules add:
{ "instructions": [".altrucoderrules", ".altrucoder/rules/coding.md"] }

// Result (combined, deduplicated):
{ "instructions": ["AGENTS.md", "custom-rules.md", ".altrucoderrules", ".altrucoder/rules/coding.md"] }
```

### 3. Restart to Pick Up Changes

If you change your AltruCoder configuration (e.g., edit `.altrucoderrules`), simply restart altru-coder-cli to pick up the new config. No manual migration or conversion needed.

## Source Locations

The migrator reads rules from these locations:

### Project Rules

| Location | Description |
|---|---|
| `.altrucoderrules` | Legacy single-file rules in project root |
| `.altrucoder/rules/*.md` | Directory-based rules (multiple markdown files) |
| `.altrucoderrules-{mode}` | Mode-specific legacy rules (e.g., `.altrucoderrules-code`) |
| `.altrucoder/rules-{mode}/*.md` | Mode-specific rule directories |

### Global Rules

| Location | Description |
|---|---|
| `~/.altrucoder/rules/*.md` | Global rules directory |

## File Mapping

| AltruCoder Location | Opencode Equivalent |
|---|---|
| `.altrucoderrules` | `instructions: [".altrucoderrules"]` |
| `.altrucoderrules-{mode}` | `instructions: [".altrucoderrules-{mode}"]` |
| `.altrucoder/rules/*.md` | `instructions: [".altrucoder/rules/file.md", ...]` |
| `.altrucoder/rules-{mode}/*.md` | `instructions: [".altrucoder/rules-{mode}/file.md", ...]` |
| `~/.altrucoder/rules/*.md` | `instructions: ["~/.altrucoder/rules/file.md", ...]` |

## AGENTS.md Compatibility

`AGENTS.md` is loaded **natively** by Opencode - no migration needed. Opencode automatically loads:

- `AGENTS.md` in project root
- `CLAUDE.md` in project root
- `~/.opencode/AGENTS.md` (global)

## Not Migrated

The following are **not** migrated:

- `.roorules` - Roo-specific rules
- `.clinerules` - Cline-specific rules

Only AltruCoder-specific files (`.altrucoderrules`, `.altrucoder/rules/`) are migrated.

## Mode-Specific Rules

Mode-specific rules (e.g., `.altrucoderrules-code`, `.altrucoder/rules-architect/`) are included by default. All mode-specific rules are loaded regardless of the current mode.

## Warnings

The migrator generates warnings for:

- **Legacy files**: When `.altrucoderrules` is found, a warning suggests migrating to `.altrucoder/rules/` directory structure

## Example

### Before (AltruCoder)

```
project/
├── .altrucoderrules           # Legacy rules
├── .altrucoderrules-code      # Code-mode specific
└── .altrucoder/
    └── rules/
        ├── coding.md        # Coding standards
        └── testing.md       # Testing guidelines
```

### After (Opencode Config)

```json
{
  "instructions": [
    "/path/to/project/.altrucoder/rules/coding.md",
    "/path/to/project/.altrucoder/rules/testing.md",
    "/path/to/project/.altrucoderrules",
    "/path/to/project/.altrucoderrules-code"
  ]
}
```

## Troubleshooting

### Rules not appearing

1. Check the file exists at the expected location
2. Ensure markdown files have `.md` extension
3. Restart altru-coder-cli to pick up changes

### Duplicate rules

The `mergeConfigConcatArrays` function automatically deduplicates the `instructions` array using `Array.from(new Set([...]))`.

## Related Files

- [`rules-migrator.ts`](../rules-migrator.ts) - Core migration logic
- [`config-injector.ts`](../config-injector.ts) - Config building and injection
- [`modes-migration.md`](./modes-migration.md) - Modes migration documentation
