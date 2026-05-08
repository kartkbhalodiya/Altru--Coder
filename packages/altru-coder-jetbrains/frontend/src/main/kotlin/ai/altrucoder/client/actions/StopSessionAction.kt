package ai.altrucoder.client.actions

import ai.altrucoder.client.plugin.AltruCoderBundle
import ai.altrucoder.client.session.ui.prompt.PromptDataKeys
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class StopSessionAction : DumbAwareAction(
    AltruCoderBundle.message("action.Altru Coder.StopSession.text"),
    AltruCoderBundle.message("action.Altru Coder.StopSession.description"),
    null,
) {
    companion object {
        const val ID = "Altru Coder.StopSession"
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT

    override fun update(e: AnActionEvent) {
        val ctx = e.getData(PromptDataKeys.SEND)
        e.presentation.isEnabled = ctx != null && ctx.isStopEnabled
    }

    override fun actionPerformed(e: AnActionEvent) {
        val ctx = e.getData(PromptDataKeys.SEND) ?: return
        if (!ctx.isStopEnabled) return
        ctx.stop()
    }
}
