package ai.altrucoder.client.session.ui

import ai.altrucoder.client.plugin.AltruCoderBundle
import ai.altrucoder.client.session.update.SessionController
import ai.altrucoder.client.session.model.Permission
import ai.altrucoder.client.ui.UiStyle
import ai.altrucoder.rpc.dto.PermissionReplyDto
import com.intellij.icons.AllIcons
import com.intellij.ui.dsl.builder.RightGap
import com.intellij.ui.dsl.builder.RowLayout
import com.intellij.ui.dsl.builder.panel
import com.intellij.util.ui.components.BorderLayoutPanel
import java.awt.BorderLayout

/**
 * Docked permission panel — shown above the prompt when the session is in
 * [ai.altrucoder.client.session.model.SessionState.AwaitingPermission].
 *
 * The inner layout is built via Kotlin UI DSL inside [show] so it reflects
 * the current permission's tool, patterns, and optional message.
 *
 * Layout (mirrors VS Code's PermissionDock):
 * ```
 * ┌─────────────────────────────────────────┐
 * │  ⚠ Permission request                   │
 * │  Tool: edit  •  Patterns: *.kt          │
 * │  <optional message>                     │
 * │  [Allow]  [Deny]                        │
 * └─────────────────────────────────────────┘
 * ```
 */
class PermissionPanel(
    private val controller: SessionController,
) : BorderLayoutPanel() {

    private lateinit var requestId: String

    init {
        border = UiStyle.Dock.warning()
        isVisible = false
    }

    /** Populate the panel for [permission] and make it visible. */
    fun show(permission: Permission) {
        requestId = permission.id
        val patterns = permission.patterns.joinToString(", ").ifEmpty { "*" }

        removeAll()
        add(panel {
            row {
                icon(AllIcons.General.Warning).gap(RightGap.SMALL)
                label(AltruCoderBundle.message("session.permission.title")).bold()
            }
            row {
                label(AltruCoderBundle.message("session.permission.meta", permission.name, patterns))
            }
            val msg = permission.message
            if (!msg.isNullOrBlank()) {
                row {
                    comment(msg)
                }
            }
            row {
                button(AltruCoderBundle.message("session.permission.allow")) { decide("once") }.gap(RightGap.SMALL)
                button(AltruCoderBundle.message("session.permission.deny")) { decide("reject") }
            }.layout(RowLayout.INDEPENDENT)
        }, BorderLayout.CENTER)

        isVisible = true
        revalidate()
        repaint()
    }

    /** Hide this panel. */
    fun hidePanel() {
        isVisible = false
    }

    private fun decide(reply: String) {
        controller.replyPermission(requestId, PermissionReplyDto(reply = reply))
        hidePanel()
    }
}
