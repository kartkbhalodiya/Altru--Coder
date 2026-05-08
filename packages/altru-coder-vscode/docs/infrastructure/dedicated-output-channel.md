# Dedicated Output Channel

**Priority:** P2

Agent Manager has its own output channel. No general "Altru Coder" output channel exists.

## Remaining Work

- Create `vscode.window.createOutputChannel("Altru Coder")` during activation
- Centralized logging utility with log levels (debug, info, warn, error)
- Route all `[Altru Coder New]` log messages to this channel
- Dispose on deactivation
- Migrate existing `console.log("[Altru Coder New] ...")` calls to the logger
