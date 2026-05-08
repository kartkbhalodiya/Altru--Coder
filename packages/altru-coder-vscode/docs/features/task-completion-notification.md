# Task Completion Notification

**Priority:** P2
**Issue:** [#6084](https://github.com/Altru-Coder/altrucoder/issues/6084)

## Remaining Work

- Show VS Code toast when session transitions to "complete" or "awaiting input" while panel is hidden
- Use `showInformationMessage()` for task completion, `showWarningMessage()` for permission requests
- Add a setting to enable/disable notifications (default: on)
- Notifications should include a "Show" button that focuses the webview panel
- Only fire when `AltruCoderProvider.panel.visible` is false
