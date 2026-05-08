package ai.altrucoder.client.actions

import com.intellij.openapi.actionSystem.ActionGroup
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.popup.JBPopupFactory

/**
 * Gear icon action placed in the Altru Coder tool window title bar.
 *
 * Looks up [Altru Coder.SettingsGroup] from [ActionManager] and shows it
 * as a popup. The group composition is declared in
 * `altru-coder.jetbrains.frontend.xml`.
 */
class AltruCoderSettingsAction : AnAction() {

    companion object {
        const val GROUP_ID = "Altru Coder.SettingsGroup"
    }

    override fun actionPerformed(e: AnActionEvent) {
        val component = e.inputEvent?.component ?: return
        val group = ActionManager.getInstance().getAction(GROUP_ID) as? ActionGroup ?: return

        JBPopupFactory.getInstance()
            .createActionGroupPopup(
                null,
                group,
                e.dataContext,
                JBPopupFactory.ActionSelectionAid.SPEEDSEARCH,
                true,
            )
            .showUnderneathOf(component)
    }
}
