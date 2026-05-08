---
title: "Troubleshooting IDE Extensions"
description: "How to capture console logs and report issues with Altru Coder"
---

# Capturing Console Logs

Providing console logs helps us pinpoint exactly what's going wrong with your installation, network, or MCP setup. This guide walks you through capturing those logs in your IDE.

## Opening Developer Tools

{% tabs %}
{% tab label="VS Code" %}

1. **Open the Command Palette**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. **Search for Developer Tools**: Type `Developer: Open Webview Developer Tools` and select it

{% /tab %}
{% tab label="JetBrains" %}

### Enable JCEF Debugging

1. Open your JetBrains IDE and go to **Help → Find Action** (or press `Cmd+Shift+A` / `Ctrl+Shift+A`)
2. Type `Registry` and open it
3. Search for `jcef` and configure these settings:
   - `ide.browser.jcef.debug.port` → set to `9222`
   - `ide.browser.jcef.contextMenu.devTools.enabled` → check the box
4. Restart your IDE after making these changes

### Connect Chrome DevTools

1. Make sure the **Altru Coder panel is open** in your IDE (the debug target won't appear unless the webview is active)
2. Open Chrome (or any Chromium-based browser like Edge or Arc)
3. Navigate to `http://localhost:9222/json` to see the list of inspectable targets
4. Find the entry with `"title": "Altru Coder"` and open the `devtoolsFrontendUrl` link
5. Chrome DevTools will open connected to the Altru Coder webview—click the **Console** tab

{% /tab %}
{% /tabs %}

## Capturing the Error

Once you have the Developer Tools console open:

1. **Clear previous logs**: Click the "Clear Console" button (🚫 icon at the top of the Console panel) to remove old messages
2. **Reproduce the issue**: Perform the action that was causing problems
3. **Check for errors**: Look at the Console tab for error messages (usually shown in red). If you suspect connection issues, also check the **Network** tab
4. **Copy the logs**: Right-click in the console and select "Save as..." or copy the relevant error messages

## SQLite database is malformed

If every prompt fails with `SQLiteError: database disk image is malformed`, Altru Coder's local SQLite database may be corrupted. This database stores local Altru Coder state such as sessions and history.

### Find the database

The database location depends on where Altru Coder is running:

| Environment | Database path |
|---|---|
| Windows | `%LOCALAPPDATA%\altru-coder\altru-coder.db` |
| macOS | `~/Library/Application Support/altru-coder/altru.db` |
| Linux | `~/.local/share/altru-coder/altru.db` |
| VS Code Remote SSH | `~/.local/share/altru-coder/altru.db` on the remote machine |

{% callout type="warning" %}
When using VS Code Remote SSH, check the remote Linux machine, not your local Windows or macOS computer.
{% /callout %}

### Reset the database

Close VS Code or stop the Altru Coder backend first. On Linux or Remote SSH, run:

```bash
pkill -f "altru-coder serve"
mkdir -p ~/.local/share/altru
mv ~/.local/share/altru-coder/altru.db ~/.local/share/altru-coder/altru.db.bak
mv ~/.local/share/altru-coder/altru.db-wal ~/.local/share/altru-coder/altru.db-wal.bak 2>/dev/null
mv ~/.local/share/altru-coder/altru.db-shm ~/.local/share/altru-coder/altru.db-shm.bak 2>/dev/null
```

Then reload VS Code or reconnect Remote SSH. Altru Coder recreates the database the next time it starts.

On Windows or macOS, rename the database file and any `altru-coder.db-wal` or `altru-coder.db-shm` files in the same folder, then restart the IDE.

{% callout type="warning" %}
Renaming this database resets local Altru Coder sessions and history for that machine. Keep the `.bak` files if you need to share them with support or attempt recovery later.
{% /callout %}

### Fully reset local Altru Coder data

If resetting the database does not fix the issue, you can fully reset Altru Coder's local data. This also removes local configuration and cache files, so use it only after trying the database reset above.

On Linux or VS Code Remote SSH, run this on the machine where Altru Coder is running:

```bash
pkill -f "altru-coder serve"
mv ~/.local/share/altru ~/.local/share/altru.bak 2>/dev/null
mv ~/.config/altru ~/.config/altru.bak 2>/dev/null
mv ~/.cache/altru ~/.cache/altru.bak 2>/dev/null
```

Then reload VS Code or reconnect Remote SSH. Altru Coder recreates these directories the next time it starts.

{% callout type="warning" %}
This resets local sessions, history, settings, and cached data. Prefer renaming the directories instead of deleting them so you can recover files. Remove secrets such as API keys or tokens before sharing any backup with support.
{% /callout %}

## Contact Support

If you're unable to resolve the issue, please inspect the console logs, remove any secrets, and send the logs to **[hi@altru-coder.ai](mailto:hi@altru-coder.ai)** along with the following:

- The error messages from the console
- Steps to reproduce the issue
- Screenshots or screen recordings of the issue
- Your IDE and Altru Coder version
