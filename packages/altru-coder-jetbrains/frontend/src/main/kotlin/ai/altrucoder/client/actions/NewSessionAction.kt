package ai.altrucoder.client.actions

import ai.altrucoder.client.plugin.AltruCoderBundle
import ai.altrucoder.client.session.SessionManager
import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware

class NewSessionAction : AnAction(
    AltruCoderBundle.message("action.Altru Coder.NewSession.text"),
    AltruCoderBundle.message("action.Altru Coder.NewSession.description"),
    AllIcons.General.Add,
), DumbAware {
    override fun actionPerformed(e: AnActionEvent) {
        e.getData(SessionManager.KEY)?.newSession()
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = e.getData(SessionManager.KEY) != null
    }
}
