package ai.altrucoder.client.session.update

import ai.altrucoder.client.app.AltruCoderAppService
import ai.altrucoder.client.app.AltruCoderSessionService
import ai.altrucoder.client.session.model.SessionModel
import ai.altrucoder.client.session.model.SessionModelEvent
import ai.altrucoder.client.session.model.SessionState
import ai.altrucoder.client.testing.FakeAppRpcApi
import ai.altrucoder.client.testing.FakeWorkspaceRpcApi
import ai.altrucoder.client.testing.FakeSessionRpcApi
import ai.altrucoder.client.app.AltruCoderWorkspaceService
import ai.altrucoder.client.app.Workspace
import ai.altrucoder.rpc.dto.AgentDto
import ai.altrucoder.rpc.dto.AgentsDto
import ai.altrucoder.rpc.dto.ChatEventDto
import ai.altrucoder.rpc.dto.ConfigDto
import ai.altrucoder.rpc.dto.AltruCoderAppStateDto
import ai.altrucoder.rpc.dto.AltruCoderAppStatusDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStateDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStatusDto
import ai.altrucoder.rpc.dto.MessageDto
import ai.altrucoder.rpc.dto.MessageTimeDto
import ai.altrucoder.rpc.dto.ModelDto
import ai.altrucoder.rpc.dto.PartDto
import ai.altrucoder.rpc.dto.ProviderDto
import ai.altrucoder.rpc.dto.ProvidersDto
import ai.altrucoder.rpc.dto.SessionDto
import ai.altrucoder.rpc.dto.SessionTimeDto
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.Disposer
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.util.ui.UIUtil
import java.awt.event.HierarchyEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking

/**
 * Base class for [ai.altrucoder.client.session.update.SessionController] tests.
 *
 * Provides real IntelliJ Application/EDT/Disposer via [BasePlatformTestCase],
 * real frontend services wired to fake RPC backends, and shared helpers.
 */
abstract class SessionControllerTestBase : BasePlatformTestCase() {

    protected data class Snapshot(
        val body: String,
        val turns: String,
        val state: SessionState,
        val diff: List<ai.altrucoder.rpc.dto.DiffFileDto>,
        val todos: List<ai.altrucoder.rpc.dto.TodoDto>,
        val compacted: Int,
    ) {
        override fun toString(): String = buildString {
            appendLine("state=$state")
            appendLine("turns=$turns")
            appendLine("diff=$diff")
            appendLine("todos=$todos")
            appendLine("compacted=$compacted")
            append("body=\n$body")
        }
    }

    private class Root : javax.swing.JPanel() {
        private var shown = true
        override fun isShowing(): Boolean = shown
        fun showState(show: Boolean) {
            val prev = shown
            shown = show
            if (prev == show) return
            val event = HierarchyEvent(
                this,
                HierarchyEvent.HIERARCHY_CHANGED,
                this,
                this.parent,
                HierarchyEvent.SHOWING_CHANGED.toLong(),
            )
            hierarchyListeners.forEach { it.hierarchyChanged(event) }
        }
    }

    private val controllers = mutableListOf<SessionController>()
    private val roots = mutableMapOf<SessionController, Root>()

    protected lateinit var rpc: FakeSessionRpcApi
    protected lateinit var appRpc: FakeAppRpcApi
    protected lateinit var projectRpc: FakeWorkspaceRpcApi

    protected lateinit var sessions: AltruCoderSessionService
    protected lateinit var app: AltruCoderAppService
    protected lateinit var workspaces: AltruCoderWorkspaceService
    protected lateinit var workspace: Workspace

    protected lateinit var scope: CoroutineScope
    protected lateinit var parent: Disposable

    override fun setUp() {
        super.setUp()
        rpc = FakeSessionRpcApi()
        appRpc = FakeAppRpcApi()
        projectRpc = FakeWorkspaceRpcApi()

        scope = CoroutineScope(SupervisorJob())
        parent = Disposer.newDisposable("test")

        sessions = AltruCoderSessionService(project, scope, rpc)
        app = AltruCoderAppService(scope, appRpc)
        workspaces = AltruCoderWorkspaceService(scope, projectRpc)
        workspace = workspaces.workspace("/test")
    }

    override fun tearDown() {
        try {
            Disposer.dispose(parent)
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    // ------ Controller creation ------

    protected fun controller(
        id: String? = null,
        flushMs: Long = Long.MAX_VALUE,
        displayMs: Long = Long.MAX_VALUE,
    ): SessionController {
        return controller(id, flushMs, true, displayMs = displayMs)
    }

    protected fun controller(
        id: String? = null,
        flushMs: Long,
        condense: Boolean,
        displayMs: Long = Long.MAX_VALUE,
        session: SessionDto? = null,
        beforeUpdate: () -> Boolean = { false },
        afterUpdate: (Boolean) -> Unit = {},
    ): SessionController {
        val root = Root()
        val m = SessionController(
          parent,
          id,
          sessions,
          workspace,
          app,
          scope,
          root,
           flushMs,
           condense,
           displayMs,
           session = session,
            beforeUpdate = beforeUpdate,
            afterUpdate = afterUpdate,
        )
        controllers.add(m)
        roots[m] = root
        return m
    }

    protected fun hide(m: SessionController) {
        edt { (roots[m] ?: error("missing root")).showState(false) }
    }

    protected fun show(m: SessionController) {
        edt { (roots[m] ?: error("missing root")).showState(true) }
    }

    // ------ Event collection ------

    /** Attach a listener that collects lifecycle events and asserts EDT. */
    protected fun collect(m: SessionController): MutableList<SessionControllerEvent> {
        val events = mutableListOf<SessionControllerEvent>()
        val disposable = Disposer.newDisposable("listener")
        Disposer.register(parent, disposable)
        m.addListener(disposable) { event ->
            assertTrue("Listener must be called on EDT", ApplicationManager.getApplication().isDispatchThread)
            events.add(event)
        }
        return events
    }

    internal fun collectStates(m: SessionController): MutableList<Pair<SessionControllerEvent, ControllerStateSnapshot>> {
        val events = mutableListOf<Pair<SessionControllerEvent, ControllerStateSnapshot>>()
        val disposable = Disposer.newDisposable("state-listener")
        Disposer.register(parent, disposable)
        m.addListener(disposable) { event ->
            assertTrue("Listener must be called on EDT", ApplicationManager.getApplication().isDispatchThread)
            events.add(event to m.snapshotState())
        }
        return events
    }

    /** Attach a listener that collects model events (messages, parts, phase). */
    protected fun collectModelEvents(m: SessionController): MutableList<SessionModelEvent> {
        val events = mutableListOf<SessionModelEvent>()
        val disposable = Disposer.newDisposable("model-listener")
        Disposer.register(parent, disposable)
        m.model.addListener(disposable) { event ->
            assertTrue("Model listener must be called on EDT", ApplicationManager.getApplication().isDispatchThread)
            if (event !is SessionModelEvent.HeaderUpdated) events.add(event)
        }
        return events
    }

    // ------ EDT + coroutine helpers ------

    /** Let coroutines settle without forcing buffered controller delivery. */
    protected fun settle() = runBlocking {
        repeat(5) {
            delay(100)
            edt { UIUtil.dispatchAllInvocationEvents() }
        }
    }

    /** Let coroutines settle, force buffered controller delivery, then drain EDT. */
    protected fun flush() = runBlocking {
        repeat(5) {
            delay(100)
            edt {
                controllers.forEach { it.flushEvents() }
                UIUtil.dispatchAllInvocationEvents()
            }
        }
    }

    protected fun pause(ms: Long) = runBlocking {
        val tick = 10L
        repeat((ms / tick).coerceAtLeast(1).toInt()) {
            delay(tick)
            edt { UIUtil.dispatchAllInvocationEvents() }
        }
    }

    protected fun edt(block: () -> Unit) {
        ApplicationManager.getApplication().invokeAndWait(block)
    }

    /** Emit a chat event into the fake RPC flow. */
    protected fun emit(event: ChatEventDto, flush: Boolean = true) {
        runBlocking { rpc.events.emit(event) }
        if (flush) flush()
    }

    /** Create a controller, attach both listeners, send initial prompt, and flush. */
    protected fun prompted(): Triple<SessionController, MutableList<SessionControllerEvent>, MutableList<SessionModelEvent>> {
        appRpc.state.value = AltruCoderAppStateDto(AltruCoderAppStatusDto.READY, config = ConfigDto(model = "altru-coder/gpt-5"))
        projectRpc.state.value = workspaceReady()
        val m = controller()
        val events = collect(m)
        val modelEvents = collectModelEvents(m)
        flush()
        edt { m.prompt("go") }
        flush()
        modelEvents.clear()
        return Triple(m, events, modelEvents)
    }

    protected fun assertModel(expected: String, model: SessionModel) {
        assertEquals(expected.trimIndent().trim(), model.toString().trim())
    }

    protected fun assertModel(expected: String, c: SessionController) {
        assertModel(expected, c.model)
    }

    protected fun assertSession(expected: String, c: SessionController, show: Boolean = true) {
        assertEquals(expected.trimIndent().trim(), c.toString().trim())
        assertEquals(show, c.model.showSession)
    }

    protected fun assertControllerEvents(expected: String, events: List<SessionControllerEvent>) {
        val exp = expected.trimIndent().lines().map { it.trim() }.filter { it.isNotEmpty() }.sorted()
        val act = events.map { it.toString() }.sorted()
        assertEquals(exp.joinToString("\n"), act.joinToString("\n"))
    }

    protected fun assertModelEvents(expected: String, events: List<SessionModelEvent>) {
        val act = events
            .filter { it !is SessionModelEvent.HeaderUpdated }
            .filter { it !is SessionModelEvent.SessionUpdated }
            .joinToString("\n")
        assertEquals(expected.trimIndent().trim(), act)
    }

    protected fun snapshot(c: SessionController) = Snapshot(
        body = c.model.toString().trim(),
        turns = c.model.toTurnsString().trim(),
        state = c.model.state,
        diff = c.model.diff.toList(),
        todos = c.model.todos.toList(),
        compacted = c.model.compactionCount,
    )

    // ------ DTO factories ------

    protected fun msg(id: String, sid: String, role: String) = MessageDto(
        id = id,
        sessionID = sid,
        role = role,
        time = MessageTimeDto(created = 0.0),
    )

    protected fun part(
        id: String,
        sid: String,
        mid: String,
        type: String,
        text: String? = null,
        tool: String? = null,
        state: String? = null,
        title: String? = null,
    ) = PartDto(
        id = id,
        sessionID = sid,
        messageID = mid,
        type = type,
        text = text,
        tool = tool,
        state = state,
        title = title,
    )

    protected fun session(id: String, title: String = "Session $id", dir: String = "/test") = SessionDto(
        id = id,
        projectID = "prj",
        directory = dir,
        title = title,
        version = "1",
        time = SessionTimeDto(created = 1.0, updated = 2.0),
    )

    protected fun workspaceReady(
        agents: List<AgentDto> = listOf(AgentDto(name = "code", displayName = "Code", mode = "code")),
        default: String = "code",
        providers: List<ProviderDto> = listOf(
            ProviderDto(
                id = "altru-coder",
                name = "Altru Coder",
                models = mapOf("gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5")),
            ),
        ),
        connected: List<String> = listOf("altru-coder"),
        defaults: Map<String, String> = emptyMap(),
    ) = AltruCoderWorkspaceStateDto(
        status = AltruCoderWorkspaceStatusDto.READY,
        agents = AgentsDto(agents = agents, all = agents, default = default),
        providers = ProvidersDto(providers = providers, connected = connected, defaults = defaults),
    )
}
