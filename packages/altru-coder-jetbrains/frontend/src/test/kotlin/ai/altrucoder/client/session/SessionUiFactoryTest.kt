package ai.altrucoder.client.session

import ai.altrucoder.client.app.AltruCoderAppService
import ai.altrucoder.client.app.AltruCoderSessionService
import ai.altrucoder.client.app.AltruCoderWorkspaceService
import ai.altrucoder.client.app.Workspace
import ai.altrucoder.client.testing.FakeAppRpcApi
import ai.altrucoder.client.testing.FakeSessionRpcApi
import ai.altrucoder.client.testing.FakeWorkspaceRpcApi
import ai.altrucoder.rpc.dto.AltruCoderAppStateDto
import ai.altrucoder.rpc.dto.AltruCoderAppStatusDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStateDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStatusDto
import ai.altrucoder.rpc.dto.SessionDto
import ai.altrucoder.rpc.dto.SessionTimeDto
import com.intellij.openapi.components.service
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

@Suppress("UnstableApiUsage")
class SessionUiFactoryTest : BasePlatformTestCase() {
    private lateinit var scope: CoroutineScope
    private lateinit var workspace: Workspace
    private lateinit var sessions: AltruCoderSessionService
    private lateinit var app: AltruCoderAppService

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob())
        sessions = AltruCoderSessionService(project, scope, FakeSessionRpcApi())
        app = AltruCoderAppService(scope, FakeAppRpcApi().also {
            it.state.value = AltruCoderAppStateDto(AltruCoderAppStatusDto.READY)
        })
        val workspaces = AltruCoderWorkspaceService(scope, FakeWorkspaceRpcApi().also {
            it.state.value = AltruCoderWorkspaceStateDto(AltruCoderWorkspaceStatusDto.READY)
        })
        workspace = workspaces.workspace("/test")
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun `test factory creates blank session ui`() {
        val ui = direct().create(project, workspace, FakeManager(), null, true)

        assertNotNull(ui)
    }

    fun `test factory wires open callback`() {
        val manager = FakeManager()
        val rpc = session("ses_1")
        val ui = SessionUi(project, workspace, sessions, app, scope, open = manager::openSession)
        val controller = controller(ui)

        com.intellij.openapi.application.ApplicationManager.getApplication().invokeAndWait {
            controller.openSession(rpc)
        }

        assertEquals(listOf("ses_1"), manager.opened)
    }

    fun `test empty panel opens through controller`() {
        val manager = FakeManager()
        val rpc = session("ses_1")
        val ui = SessionUi(project, workspace, sessions, app, scope, open = manager::openSession)
        val controller = controller(ui)
        val panel = ai.altrucoder.client.session.ui.EmptySessionPanel(testRootDisposable, controller, listOf(rpc))

        panel.clickRecent(0)

        assertEquals(listOf("ses_1"), manager.opened)
    }

    private fun controller(ui: SessionUi): ai.altrucoder.client.session.update.SessionController {
        val field = SessionUi::class.java.getDeclaredField("controller")
        field.isAccessible = true
        return field.get(ui) as ai.altrucoder.client.session.update.SessionController
    }

    fun `test application service is available`() {
        assertNotNull(service<SessionUiFactory>())
    }

    private fun direct() = SessionUiFactory(scope)

    private fun session(id: String) = SessionDto(
        id = id,
        projectID = "prj",
        directory = "/test",
        title = "Session $id",
        version = "1",
        time = SessionTimeDto(created = 1.0, updated = 2.0),
    )

    private class FakeManager : SessionManager {
        val opened = mutableListOf<String>()
        override fun newSession() {
        }

        override fun openSession(session: SessionDto) {
            opened.add(session.id)
        }
    }
}
