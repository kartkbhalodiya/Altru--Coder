package ai.altrucoder.client.session

import ai.altrucoder.client.app.AltruCoderAppService
import ai.altrucoder.client.app.AltruCoderSessionService
import ai.altrucoder.client.app.Workspace
import ai.altrucoder.rpc.dto.SessionDto
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob

@Service(Service.Level.APP)
class SessionUiFactory(
    private val cs: CoroutineScope,
) {
    fun create(
        project: Project,
        workspace: Workspace,
        manager: SessionManager,
        id: String? = null,
        loading: Boolean = id == null,
        session: SessionDto? = null,
    ): SessionUi = SessionUi(
        project = project,
        workspace = workspace,
        sessions = project.service<AltruCoderSessionService>(),
        app = service<AltruCoderAppService>(),
        cs = scope(),
        id = session?.id ?: id,
        loading = loading,
        session = session,
        open = manager::openSession,
    )

    private fun scope(): CoroutineScope {
        val parent = cs.coroutineContext[Job]
        return CoroutineScope(cs.coroutineContext + SupervisorJob(parent))
    }
}
