package ai.altrucoder.client.session.ui

import ai.altrucoder.client.app.AltruCoderAppService
import ai.altrucoder.client.app.AltruCoderSessionService
import ai.altrucoder.client.app.AltruCoderWorkspaceService
import ai.altrucoder.client.app.Workspace
import ai.altrucoder.client.session.model.Permission
import ai.altrucoder.client.session.model.PermissionMeta
import ai.altrucoder.client.session.update.SessionController
import ai.altrucoder.client.testing.FakeAppRpcApi
import ai.altrucoder.client.testing.FakeSessionRpcApi
import ai.altrucoder.client.testing.FakeWorkspaceRpcApi
import ai.altrucoder.rpc.dto.AltruCoderAppStateDto
import ai.altrucoder.rpc.dto.AltruCoderAppStatusDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStateDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStatusDto
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.Disposer
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.util.ui.UIUtil
import com.intellij.util.ui.components.BorderLayoutPanel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import java.awt.Container
import javax.swing.AbstractButton

@Suppress("UnstableApiUsage")
class PermissionPanelTest : BasePlatformTestCase() {

    private lateinit var parent: Disposable
    private lateinit var scope: CoroutineScope
    private lateinit var rpc: FakeSessionRpcApi
    private lateinit var app: AltruCoderAppService
    private lateinit var workspaces: AltruCoderWorkspaceService
    private lateinit var workspace: Workspace
    private lateinit var controller: SessionController
    private lateinit var panel: PermissionPanel

    override fun setUp() {
        super.setUp()
        parent = Disposer.newDisposable("permission-panel")
        scope = CoroutineScope(SupervisorJob())
        rpc = FakeSessionRpcApi()
        val sessions = AltruCoderSessionService(project, scope, rpc)
        val api = FakeAppRpcApi().also { it.state.value = AltruCoderAppStateDto(AltruCoderAppStatusDto.READY) }
        val work = FakeWorkspaceRpcApi().also {
            it.state.value = AltruCoderWorkspaceStateDto(status = AltruCoderWorkspaceStatusDto.READY)
        }
        app = AltruCoderAppService(scope, api)
        workspaces = AltruCoderWorkspaceService(scope, work)
        workspace = workspaces.workspace("/test")
        controller = SessionController(parent, "ses_test", sessions, workspace, app, scope, BorderLayoutPanel())
        panel = PermissionPanel(controller)
    }

    override fun tearDown() {
        try {
            Disposer.dispose(parent)
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun `test allow button uses bundle text and replies once`() {
        panel.show(permission())

        buttons(panel).first { it.text == "Allow" }.doClick()
        flush()

        assertFalse(panel.isVisible)
        assertEquals("perm1", rpc.permissionReplies.single().first)
        assertEquals("once", rpc.permissionReplies.single().third.reply)
    }

    fun `test deny button uses bundle text and rejects`() {
        panel.show(permission())

        buttons(panel).first { it.text == "Deny" }.doClick()
        flush()

        assertFalse(panel.isVisible)
        assertEquals("perm1", rpc.permissionReplies.single().first)
        assertEquals("reject", rpc.permissionReplies.single().third.reply)
    }

    private fun permission() = Permission(
        id = "perm1",
        sessionId = "ses_test",
        name = "edit",
        patterns = listOf("*.kt"),
        always = emptyList(),
        meta = PermissionMeta(),
        message = "Review file changes",
    )

    private fun buttons(root: Container): List<AbstractButton> = root.components.flatMap { comp ->
        val item = if (comp is AbstractButton) listOf(comp) else emptyList()
        if (comp is Container) item + buttons(comp) else item
    }

    private fun flush() = runBlocking {
        repeat(5) {
            delay(100)
            ApplicationManager.getApplication().invokeAndWait {
                UIUtil.dispatchAllInvocationEvents()
            }
        }
    }
}
