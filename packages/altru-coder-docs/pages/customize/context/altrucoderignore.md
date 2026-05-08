---
title: ".altrucoderignore"
description: "Control which files Altru Coder can access"
---

# .altrucoderignore

## Overview

`.altrucoderignore` is a root-level file that tells Altru Coder which files and folders it should not access. It uses standard `.gitignore` pattern syntax, but it only affects Altru Coder's file access, not Git.

If no `.altrucoderignore` file exists, Altru Coder can access all files in the workspace.

## Quick Start

{% tabs %}
{% tab label="VSCode" %}

The primary mechanism for controlling file access is the **permission system** in `altru-coder.jsonc`. You define tool-level permissions with glob patterns:

```json
{
  "permission": {
    "read": { "*.env": "deny", "*": "allow" },
    "edit": { "dist/**": "deny", "*": "allow" }
  }
}
```

If you have an existing `.altrucoderignore` file, it is still supported. The **IgnoreMigrator** automatically converts `.altrucoderignore` patterns into permission `deny` rules on `read` and `edit` tools, so your existing rules continue to work without manual changes.

You can also exclude paths from the file watcher separately using `watcher.ignore`:

```json
{
  "watcher": {
    "ignore": ["tmp/**", "logs/**"]
  }
}
```

{% /tab %}
{% tab label="CLI" %}

The primary mechanism for controlling file access is the **permission system** in `altru-coder.jsonc`. You define tool-level permissions with glob patterns:

```json
{
  "permission": {
    "read": { "*.env": "deny", "*": "allow" },
    "edit": { "dist/**": "deny", "*": "allow" }
  }
}
```

If you have an existing `.altrucoderignore` file, it is still supported. The **IgnoreMigrator** automatically converts `.altrucoderignore` patterns into permission `deny` rules on `read` and `edit` tools, so your existing rules continue to work without manual changes.

You can also exclude paths from the file watcher separately using `watcher.ignore`:

```json
{
  "watcher": {
    "ignore": ["tmp/**", "logs/**"]
  }
}
```

{% /tab %}
{% tab label="VSCode (Legacy)" %}

1. Create a `.altrucoderignore` file at the root of your project.
2. Add patterns for files or folders you want Altru Coder to avoid.
3. Save the file. Altru Coder will pick up the changes automatically.

Example:

```txt
# Secrets
.env
secrets/
**/*.pem
**/*.key

# Build output
dist/
coverage/

# Allow a specific file inside a blocked folder
!secrets/README.md
```

{% /tab %}
{% /tabs %}

## Pattern Rules

`.altrucoderignore` follows the same rules as `.gitignore`:

- `#` starts a comment
- `*` and `**` match wildcards
- Trailing `/` matches directories only
- `!` negates a previous rule

Patterns are evaluated relative to the workspace root.

## What It Affects

{% tabs %}
{% tab label="VSCode" %}

File access is controlled through **permission-based access control**. Each tool (`read`, `edit`, `glob`, `grep`, `write`, `bash`, etc.) has its own permission rules evaluated against glob patterns.

In addition to your explicit permission rules:

- **Hardcoded directory ignores** — 27 directories are always skipped (e.g. `node_modules`, `.git`, `dist`, `build`, `.cache`, `__pycache__`, `vendor`, and others).
- **Hardcoded file pattern ignores** — 11 file patterns are always skipped (e.g. lock files, binary artifacts).
- **`.gitignore` and `.ignore` files** are also respected when listing and searching files.

If a file is denied by a permission rule, the tool will report that access was blocked.

{% /tab %}
{% tab label="CLI" %}

File access is controlled through **permission-based access control**. Each tool (`read`, `edit`, `glob`, `grep`, `write`, `bash`, etc.) has its own permission rules evaluated against glob patterns.

In addition to your explicit permission rules:

- **Hardcoded directory ignores** — 27 directories are always skipped (e.g. `node_modules`, `.git`, `dist`, `build`, `.cache`, `__pycache__`, `vendor`, and others).
- **Hardcoded file pattern ignores** — 11 file patterns are always skipped (e.g. lock files, binary artifacts).
- **`.gitignore` and `.ignore` files** are also respected when listing and searching files.

If a file is denied by a permission rule, the tool will report that access was blocked.

{% /tab %}
{% tab label="VSCode (Legacy)" %}

Altru Coder checks `.altrucoderignore` before accessing files in tools like:

- [`read_file`](/docs/automate/tools/read-file)
- [`write_to_file`](/docs/automate/tools/write-to-file)
- [`apply_diff`](/docs/automate/tools/apply-diff)
- [`delete_file`](/docs/automate/tools/delete-file)
- [`execute_command`](/docs/automate/tools/execute-command)
- [`list_files`](/docs/automate/tools/list-files)

If a file is blocked, Altru Coder will return an "access denied" message and suggest updating your `.altrucoderignore` rules.

{% /tab %}
{% /tabs %}

## Configuration Details

{% tabs %}
{% tab label="VSCode" %}

### Permission Rules

Permission rules are defined per-tool in `altru-coder.jsonc`. Patterns are evaluated in order — the last matching rule wins:

```json
{
  "permission": {
    "read": {
      "*.env": "deny",
      "secrets/**": "deny",
      "*": "allow"
    },
    "edit": {
      "dist/**": "deny",
      "*.lock": "deny",
      "*": "allow"
    }
  }
}
```

### Migrating from .altrucoderignore

If you already have a `.altrucoderignore` file, you don't need to do anything — the IgnoreMigrator reads your existing patterns and applies them as `deny` rules on `read` and `edit` tools automatically. You can optionally move your rules into `altru-coder.jsonc` for more granular control (e.g. denying edits but allowing reads).

### File Watcher Exclusions

The `watcher.ignore` setting controls which paths the file watcher skips. This is separate from tool permissions and only affects change detection:

```json
{
  "watcher": {
    "ignore": ["tmp/**", "logs/**", ".build/**"]
  }
}
```

{% /tab %}
{% tab label="CLI" %}

### Permission Rules

Permission rules are defined per-tool in `altru-coder.jsonc`. Patterns are evaluated in order — the last matching rule wins:

```json
{
  "permission": {
    "read": {
      "*.env": "deny",
      "secrets/**": "deny",
      "*": "allow"
    },
    "edit": {
      "dist/**": "deny",
      "*.lock": "deny",
      "*": "allow"
    }
  }
}
```

### Migrating from .altrucoderignore

If you already have a `.altrucoderignore` file, you don't need to do anything — the IgnoreMigrator reads your existing patterns and applies them as `deny` rules on `read` and `edit` tools automatically. You can optionally move your rules into `altru-coder.jsonc` for more granular control (e.g. denying edits but allowing reads).

### File Watcher Exclusions

The `watcher.ignore` setting controls which paths the file watcher skips. This is separate from tool permissions and only affects change detection:

```json
{
  "watcher": {
    "ignore": ["tmp/**", "logs/**", ".build/**"]
  }
}
```

{% /tab %}
{% tab label="VSCode (Legacy)" %}

### Visibility in Lists

By default, ignored files are hidden from file lists. You can show them with a lock icon by enabling:

Settings -> Context -> **Show .altrucoderignore'd files in lists and searches**

{% /tab %}
{% /tabs %}

## Checkpoints vs .altrucoderignore

Checkpoint tracking is separate from file access rules. Files blocked by `.altrucoderignore` or permission rules can still be checkpointed if they are not excluded by `.gitignore`. See the [Checkpoints](/docs/code-with-ai/features/checkpoints) documentation for details.

## Troubleshooting

- **Altru Coder can't access a file you want:** Remove or narrow the matching rule in `.altrucoderignore` (legacy) or adjust the permission rules in `altru-coder.jsonc` (VSCode extension & CLI).
- **A file still appears in lists:** In the legacy extension, check the setting that shows ignored files in lists and searches. In the extension & CLI, verify your permission and watcher ignore configuration.
- **`.altrucoderignore` patterns not working in the new platform:** Ensure the file is at the workspace root. The IgnoreMigrator reads it automatically — check that your patterns use valid `.gitignore` syntax.
