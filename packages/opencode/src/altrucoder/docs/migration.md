# AltruCoder Migration

This document explains how AltruCoder configurations are automatically migrated to Opencode.

## Table of Contents

- [Modes Migration](#modes-migration)
- [Skills Discovery](#skills-discovery)
- [Rules Migration](#rules-migration)
- [Workflows Migration](#workflows-migration)
- [MCP Migration](#mcp-migration)
- [Altru Coder Notifications](#altru-coder-notifications)

---

# Modes Migration

This section explains how AltruCoder custom modes are automatically migrated to Opencode agents.

## Overview

AltruCoder stores custom modes in YAML files. When Opencode starts, it reads these files and converts them to Opencode's agent format, injecting them via the `OPENCODE_CONFIG_CONTENT` mechanism.

## Source Locations

The migrator reads custom modes from these locations (in order, later entries override earlier ones):

### Global Modes (VSCode Extension Storage)

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Code/User/globalStorage/altrucoder.altru-coder/settings/custom_modes.yaml` |
| Windows | `%APPDATA%/Code/User/globalStorage/altrucoder.altru-coder/settings/custom_modes.yaml` |
| Linux | `~/.config/Code/User/globalStorage/altrucoder.altru-coder/settings/custom_modes.yaml` |

### Project Modes

| Location | Description |
|---|---|
| `.altrucodermodes` | Project-specific modes in the workspace root |

## Field Mapping

### Migrated Fields

| AltruCoder Field | Opencode Field | Notes |
|---|---|---|
| `slug` | Agent key | Used as the agent identifier |
| `roleDefinition` | `prompt` | Combined with `customInstructions` |
| `customInstructions` | `prompt` | Appended after `roleDefinition` with `\n\n` separator |
| `groups` | `permission` | See permission mapping below |
| `description` | `description` | Primary source for description |
| `whenToUse` | `description` | Fallback if no `description` |
| `name` | `description` | Final fallback |

### Permission Mapping

AltruCoder uses "groups" to define what tools a mode can access. These are converted to Opencode's permission system:

| AltruCoder Group | Opencode Permission | Notes |
|---|---|---|
| `read` | `read: "allow"` | File reading |
| `edit` | `edit: "allow"` | File editing |
| `command` | `bash: "allow"` | Shell commands |
| `browser` | `bash: "allow"` | Browser actions (via bash) |
| `mcp` | `mcp: "allow"` | MCP server access |

**Important:** Permissions that are NOT in the groups list are explicitly set to `"deny"`. This ensures that a mode with only `read` and `edit` groups cannot run shell commands or access MCP servers.

### File Restrictions

AltruCoder supports restricting edit access to specific file patterns:

```yaml
groups:
  - read
  - - edit
    - fileRegex: "\\.md$"
      description: "Markdown files only"
```

This converts to:

```json
{
  "permission": {
    "read": "allow",
    "edit": {
      "\\.md$": "allow",
      "*": "deny"
    },
    "bash": "deny",
    "mcp": "deny"
  }
}
```

Note: `bash` and `mcp` are explicitly denied because they weren't in the original groups list.

## Default Modes

The following AltruCoder default modes are **skipped** during migration because Opencode has native equivalents:

| AltruCoder Mode | Reason |
|---|---|
| `code` | Maps to Opencode's `build` agent |
| `architect` | Maps to Opencode's `plan` agent |
| `ask` | Read-only exploration (use `explore` subagent) |
| `debug` | Debugging workflow (use `build` with debug instructions) |
| `orchestrator` | Redundant - all Opencode agents can spawn subagents |

## Example Conversion

### AltruCoder Mode (YAML)

```yaml
customModes:
  - slug: translate
    name: Translate
    roleDefinition: You are a linguistic specialist focused on translation.
    customInstructions: |
      When translating:
      - Maintain consistent terminology
      - Preserve formatting
    groups:
      - read
      - - edit
        - fileRegex: "src/i18n/.*\\.json$"
          description: "Translation files only"
    description: Translate content between languages
```

### Opencode Agent (JSON)

```json
{
  "agent": {
    "translate": {
      "mode": "primary",
      "description": "Translate content between languages",
      "prompt": "You are a linguistic specialist focused on translation.\n\nWhen translating:\n- Maintain consistent terminology\n- Preserve formatting",
      "permission": {
        "read": "allow",
        "edit": {
          "src/i18n/.*\\.json$": "allow",
          "*": "deny"
        }
      }
    }
  }
}
```

## Not Migrated (Future Phases)

The following AltruCoder features are not yet migrated:

| Feature | Status | Notes |
|---|---|---|
| Rules (`.altrucoder/rules/`) | Phase 2 | Will map to `instructions` array |
| Workflows (`.altrucoder/workflows/`) | Phase 2 | Will map to custom commands |
| MCP Servers (`mcp_settings.json`) | Phase 2 | Will map to `mcp` config |
| Provider Settings | Phase 2 | Will map to `provider` config |
| Mode-specific API configs | Phase 2 | Different models per mode |
| Organization modes | Not planned | `source: organization` not preserved |

## Troubleshooting

### Mode not appearing

1. Check the file exists at the expected location
2. Verify YAML syntax is valid
3. Ensure the mode has a unique `slug`
4. Check it's not a default mode (which are skipped)

### Permissions not working

1. Verify the `groups` array is correctly formatted
2. For file restrictions, ensure `fileRegex` is a valid regex
3. Check the permission mapping table above

## Related Files

- [`modes-migrator.ts`](../modes-migrator.ts) - Core migration logic
- [`config-injector.ts`](../config-injector.ts) - Config building and injection

---

# Skills Discovery

AltruCoder skills are automatically discovered and made available in Opencode. This is **not a migration** - skills remain in their original locations and can be managed independently by the Altru Coder VSCode extension.

## How It Works

Opencode scans additional directories for skills alongside its native `.opencode/skill/` locations. The `AltruCoderPaths.skillDirectories()` function provides these paths.

## Source Locations

Skills are discovered from these locations (in order, later entries override earlier ones):

### Project Skills (Walk-up Discovery)

The scanner walks up from the current directory to the git worktree root, finding all `.altrucoder/skills/` directories:

```
your-project/
├── .altrucoder/
│   └── skills/
│       └── project-skill/
│           └── SKILL.md
└── packages/
    └── my-package/           # If you run from here
        └── .altrucoder/
            └── skills/
                └── package-skill/
                    └── SKILL.md
```

Running from `packages/my-package/` discovers both `package-skill` and `project-skill`.

### Global Skills

| Platform | Path |
|---|---|
| All | `~/.altrucoder/skills/` |

### VSCode Extension Storage (Marketplace Skills)

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Code/User/globalStorage/altrucoder.altru-coder/skills/` |
| Windows | `%APPDATA%/Code/User/globalStorage/altrucoder.altru-coder/skills/` |
| Linux | `~/.config/Code/User/globalStorage/altrucoder.altru-coder/skills/` |

## Skill File Format

Skills use the same `SKILL.md` format as Opencode:

```markdown
---
name: my-skill
description: When to use this skill
---

# Instructions

Detailed instructions for the agent...
```

## Priority / Override Behavior

When the same skill name exists in multiple locations, **last one wins**:

1. `.claude/skills/` (lowest priority)
2. `.altrucoder/skills/` (walk-up)
3. `~/.altrucoder/skills/`
4. VSCode extension storage
5. `.opencode/skill/` (walk-up)
6. `~/.opencode/skill/` (highest priority)

This means Opencode native skills take precedence over AltruCoder skills with the same name.

## Mode-Specific Skills

AltruCoder supports mode-specific skills in `skills-{mode}/` directories (e.g., `skills-code/`, `skills-architect/`). These are **not currently migrated** to Opencode.

If you need mode-specific behavior, use Opencode's agent permission system:

```json
{
  "agent": {
    "build": {
      "permission": {
        "skill": {
          "translation": "deny"
        }
      }
    }
  }
}
```

## Symlink Support

Skills can be symlinked from a shared location:

```
.agents/skills/shared-skill/          # Actual skill
.altrucoder/skills/shared-skill -> ...  # Symlink
.opencode/skill/shared-skill -> ...   # Symlink
```

The scanner follows symlinks, so a skill installed once can be available to both Altru Coder VSCode and Opencode CLI.

## Related Files

- [`paths.ts`](../paths.ts) - `skillDirectories()` function
- [`skill.ts`](../../skill/skill.ts) - Skill scanning logic

---

# Rules Migration

AltruCoder rules are migrated to Opencode's `instructions` array. See [`rules-migrator.ts`](../rules-migrator.ts).

## Source Locations

| Location | Description |
|---|---|
| `.altrucoderrules` | Legacy project rules file |
| `.altrucoder/rules/*.md` | Project rules directory |
| `~/.altrucoder/rules/*.md` | Global rules directory |
| `.altrucoderrules-{mode}` | Mode-specific legacy rules |
| `.altrucoder/rules-{mode}/*.md` | Mode-specific rules directory |

---

# Workflows Migration

AltruCoder workflows are migrated to Opencode commands. See [`workflows-migrator.ts`](../workflows-migrator.ts).

## Source Locations

| Location | Description |
|---|---|
| `.altrucoder/workflows/*.md` | Project workflows |
| `~/.altrucoder/workflows/*.md` | Global workflows |
| VSCode extension storage | Marketplace-installed workflows |

---

# MCP Migration

AltruCoder MCP server configurations are migrated to Opencode's `mcp` config. See [`mcp-migrator.ts`](../mcp-migrator.ts).

## Config file location

The CLI reads global config from `~/.config/altru-coder/` (see [`global/index.ts`](../../global/index.ts): `Global.Path.config` = `xdgConfig` + `"altru-coder"`). It merges, in order, `config.json`, `opencode.json`, and `opencode.jsonc` in that directory. You can put MCP config in **`opencode.json`** or **`opencode.jsonc`**.

- **macOS / Linux:** `~/.config/altru-coder/opencode.json` (or `opencode.jsonc`)
- **Windows:** Config directory depends on `xdg-basedir` (often under `%LOCALAPPDATA%` or `%USERPROFILE%`); filename is still `opencode.json` or `opencode.jsonc`.

Use a top-level `"mcp"` object. Each key is the server name. For a local server, value must have `type: "local"` and `command: ["executable", "arg1", ...]`. Optional: `environment` (env vars), `enabled` (boolean), `timeout` (ms). See `Config.McpLocal` in [`config.ts`](../../config/config.ts). Restart the CLI after editing.

## Source Location (migration from AltruCoder)

| Location | Description |
|---|---|
| VSCode extension storage `settings/cline_mcp_settings.json` | MCP server configurations |

---

# Altru Coder Notifications

When connected to Altru Coder Gateway, the CLI fetches and displays notifications from the Altru Coder API. This allows Altru Coder to communicate important announcements, feature updates, and tips to users.

## How It Works

1. **On startup**, if the user is authenticated with Altru Coder Gateway, the CLI fetches notifications from `https://api.altru-coder.ai/api/users/notifications`
2. **Filtering**: Only notifications with `showIn` containing `"cli"` (or no `showIn` restriction) are displayed
3. **Display**: The first notification is shown as a toast notification after a 2-second delay

## Notification Data Structure

```typescript
interface AltruCoderNotification {
  id: string // Unique identifier
  title: string // Notification title (e.g., "Agent skills now supported!")
  message: string // Description text
  action?: {
    actionText: string // Link text (e.g., "Learn More")
    actionURL: string // URL destination
  }
  showIn?: string[] // Target platforms: ["cli", "vscode"]
}
```

## Example Notification

```
Title: Agent skills now supported!
Message: Define reusable skills and workflows for your AI agent.
Action: Learn More -> https://docs.altru-coder.ai/skills
```

## Display Conditions

| Condition | Notifications Shown |
|---|---|
| Connected to Altru Coder Gateway | Yes |
| Not connected to Altru Coder | No |
| No notifications from API | No |

## Related Files

- [`notifications.ts`](../../../../altru-coder-gateway/src/api/notifications.ts) - Fetch function and types
- [`routes.ts`](../../../../altru-coder-gateway/src/server/routes.ts) - Server endpoint `/altru-coder/notifications`
- [`app.tsx`](../../cli/cmd/tui/app.tsx) - TUI notification display logic
