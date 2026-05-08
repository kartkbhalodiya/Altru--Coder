@file:Suppress("UnstableApiUsage")

package ai.altrucoder.client.app

import ai.altrucoder.rpc.AltruCoderWorkspaceRpcApi
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStateDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStatusDto
import com.intellij.openapi.components.Service
import ai.altrucoder.log.AltruCoderLog
import fleet.rpc.client.durable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

/**
 * App-level service that manages [Workspace] instances keyed by directory.
 *
 * Multiple projects sharing the same directory share the same [Workspace]
 * and its state flow. Directory resolution handles split-mode where the
 * frontend sees a synthetic path that must be resolved to the real path
 * on the backend host.
 */
@Service(Service.Level.APP)
class AltruCoderWorkspaceService internal constructor(
    private val cs: CoroutineScope,
    private val rpc: AltruCoderWorkspaceRpcApi?,
) {
    /** Platform constructor — resolves RPC from the service container. */
    constructor(cs: CoroutineScope) : this(cs, null)

    companion object {
        private val LOG = AltruCoderLog.create(AltruCoderWorkspaceService::class.java)
        private val INIT = AltruCoderWorkspaceStateDto(AltruCoderWorkspaceStatusDto.PENDING)
    }

    private val workspaces = ConcurrentHashMap<String, Workspace>()

    // ------ RPC helpers ------

    private suspend fun <T> call(block: suspend AltruCoderWorkspaceRpcApi.() -> T): T {
        val api = rpc
        return if (api != null) block(api) else durable { block(AltruCoderWorkspaceRpcApi.getInstance()) }
    }

    private fun <T> stream(block: suspend AltruCoderWorkspaceRpcApi.() -> Flow<T>): Flow<T> = flow {
        val api = rpc
        if (api != null) block(api).collect { emit(it) }
        else durable { block(AltruCoderWorkspaceRpcApi.getInstance()).collect { emit(it) } }
    }

    // ------ Public API ------

    /**
     * Get or create a [Workspace] for [directory].
     *
     * Synchronous — returns immediately. The workspace's [Workspace.state]
     * flow starts streaming lazily when first collected. Multiple callers
     * for the same directory share the same instance.
     */
    fun workspace(directory: String): Workspace {
        return workspaces.getOrPut(directory) {
            LOG.info("Creating workspace for $directory")
            val state = stream { state(directory) }
                .stateIn(cs, SharingStarted.Eagerly, INIT)
            Workspace(directory, state) { reload(directory) }
        }
    }

    /**
     * Resolve the real project directory from a hint path.
     *
     * In split-mode the frontend sees a synthetic path (e.g.
     * `/home/.cache/JetBrains/RemoteDev/...`). The backend resolves
     * it to the actual project root on the host.
     */
    suspend fun resolveProjectDirectory(hint: String): String {
        return try {
            val resolved = call { resolveProjectDirectory(hint) }
            LOG.info("Resolved project directory: hint=$hint → $resolved")
            resolved
        } catch (e: Exception) {
            LOG.warn("Failed to resolve directory, falling back to hint=$hint", e)
            hint
        }
    }

    /** Trigger a full reload of workspace data for [directory]. */
    fun reload(directory: String) {
        cs.launch {
            try {
                call { reload(directory) }
            } catch (e: Exception) {
                LOG.warn("workspace reload failed for $directory", e)
            }
        }
    }
}
