package ai.altrucoder.backend.workspace

import ai.altrucoder.backend.app.AltruCoderAppState
import ai.altrucoder.backend.app.AltruCoderBackendSessionManager
import ai.altrucoder.backend.app.SseEvent
import ai.altrucoder.log.AltruCoderLog
import ai.altrucoder.jetbrains.api.client.DefaultApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharedFlow
import okhttp3.OkHttpClient
import java.util.concurrent.ConcurrentHashMap

/**
 * Manages [AltruCoderBackendWorkspace] instances by directory path.
 *
 * **Not an IntelliJ service** — owned by [AltruCoderBackendAppService] which
 * calls [start] after [AltruCoderAppState.Ready] and [stop] on disconnect.
 *
 * Workspaces are created on demand via [get] — the first call for a
 * directory creates the workspace and triggers data loading. Subsequent
 * calls return the cached instance. Worktree directories are just
 * another path — no special handling needed.
 */
class AltruCoderBackendWorkspaceManager(
    private val cs: CoroutineScope,
    private val sessions: AltruCoderBackendSessionManager,
    private val log: AltruCoderLog,
) {
    private val workspaces = ConcurrentHashMap<String, AltruCoderBackendWorkspace>()

    private var api: DefaultApi? = null
    private var http: OkHttpClient? = null
    private var port = 0
    private var events: SharedFlow<SseEvent>? = null

    /**
     * Activate with a connected API client and SSE stream.
     * Called by [AltruCoderBackendAppService] after [AltruCoderAppState.Ready].
     * Clears any stale workspaces from a previous connection.
     */
    fun start(api: DefaultApi, http: OkHttpClient, port: Int, events: SharedFlow<SseEvent>) {
        stop()
        this.api = api
        this.http = http
        this.port = port
        this.events = events
        log.info("Workspace manager started")
    }

    /**
     * Deactivate all workspaces. Called by [AltruCoderBackendAppService] on disconnect.
     */
    fun stop() {
        workspaces.values.forEach { it.stop() }
        workspaces.clear()
        api = null
        http = null
        port = 0
        events = null
        log.info("Workspace manager stopped")
    }

    /**
     * Get or create a workspace for a directory.
     * The workspace loads data immediately upon creation.
     */
    fun get(dir: String): AltruCoderBackendWorkspace {
        val client = api ?: throw IllegalStateException("Workspace manager not started")
        val http = http ?: throw IllegalStateException("Workspace manager not started")
        val ev = events!!
        return workspaces.computeIfAbsent(dir) { d ->
            log.info("Creating workspace for $d")
            AltruCoderBackendWorkspace(d, cs, client, http, port, ev, sessions, log).also { it.load() }
        }
    }

    /** Remove a workspace (e.g. when a worktree is deleted). */
    fun remove(dir: String) {
        workspaces.remove(dir)?.stop()
    }
}
