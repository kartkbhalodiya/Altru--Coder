package ai.altrucoder.client.actions

import ai.altrucoder.client.app.AltruCoderAppService
import ai.altrucoder.rpc.dto.AltruCoderAppStatusDto
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware

class RestartAltruCoderAction : AnAction(), DumbAware {
    override fun actionPerformed(e: AnActionEvent) {
        service<AltruCoderAppService>().restartAsync()
    }

    override fun update(e: AnActionEvent) {
        val status = service<AltruCoderAppService>().state.value.status
        e.presentation.isEnabled = status != AltruCoderAppStatusDto.CONNECTING && status != AltruCoderAppStatusDto.LOADING
    }
}
