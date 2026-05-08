package ai.altrucoder.rpc

import ai.altrucoder.rpc.dto.HealthDto
import ai.altrucoder.rpc.dto.AltruCoderAppStateDto
import ai.altrucoder.rpc.dto.ModelFavoriteUpdateDto
import ai.altrucoder.rpc.dto.ModelSelectionUpdateDto
import ai.altrucoder.rpc.dto.ModelStateDto
import ai.altrucoder.rpc.dto.ModelVariantUpdateDto
import com.intellij.platform.rpc.RemoteApiProviderService
import fleet.rpc.RemoteApi
import fleet.rpc.Rpc
import fleet.rpc.remoteApiDescriptor
import kotlinx.coroutines.flow.Flow

/**
 * App-level RPC API exposed from backend to frontend.
 *
 * All operations are project-neutral — the CLI backend runs once
 * per application, not per project.
 */
@Rpc
interface AltruCoderAppRpcApi : RemoteApi<Unit> {
    companion object {
        suspend fun getInstance(): AltruCoderAppRpcApi {
            return RemoteApiProviderService.resolve(remoteApiDescriptor<AltruCoderAppRpcApi>())
        }
    }

    /** Ensure the CLI backend is running and connected. */
    suspend fun connect()

    /** Observe app lifecycle state changes. */
    suspend fun state(): Flow<AltruCoderAppStateDto>

    /** One-shot health check against /global/health. */
    suspend fun health(): HealthDto

    /** Retry app connection or loading after a failure. */
    suspend fun retry()

    /** Kill the CLI process and restart it. */
    suspend fun restart()

    /** Kill the CLI process, re-extract the binary, and restart. */
    suspend fun reinstall()

    /** Load persisted CLI model state such as favorites. */
    suspend fun modelState(): ModelStateDto

    /** Toggle a persisted CLI model favorite. */
    suspend fun updateModelFavorite(update: ModelFavoriteUpdateDto): ModelStateDto

    /** Persist a per-agent model selection. */
    suspend fun updateModelSelection(update: ModelSelectionUpdateDto): ModelStateDto

    /** Clear a persisted per-agent model selection. */
    suspend fun clearModelSelection(agent: String): ModelStateDto

    /** Persist a per-model reasoning variant selection. */
    suspend fun updateModelVariant(update: ModelVariantUpdateDto): ModelStateDto
}
