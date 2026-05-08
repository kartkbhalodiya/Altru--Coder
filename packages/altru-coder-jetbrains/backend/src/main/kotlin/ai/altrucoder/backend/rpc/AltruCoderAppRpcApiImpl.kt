@file:Suppress("UnstableApiUsage")

package ai.altrucoder.backend.rpc

import ai.altrucoder.backend.app.AltruCoderAppState
import ai.altrucoder.backend.app.AltruCoderBackendAppService
import ai.altrucoder.backend.app.ConfigWarning
import ai.altrucoder.backend.app.LoadError
import ai.altrucoder.backend.app.LoadProgress
import ai.altrucoder.backend.app.ProfileResult
import ai.altrucoder.jetbrains.api.model.AgentConfig
import ai.altrucoder.jetbrains.api.model.Config
import ai.altrucoder.jetbrains.api.model.ConfigAgent
import ai.altrucoder.rpc.dto.AgentConfigDto
import ai.altrucoder.rpc.dto.ConfigDto
import ai.altrucoder.rpc.AltruCoderAppRpcApi
import ai.altrucoder.rpc.dto.ConfigWarningDto
import ai.altrucoder.rpc.dto.HealthDto
import ai.altrucoder.rpc.dto.AltruCoderAppStateDto
import ai.altrucoder.rpc.dto.AltruCoderAppStatusDto
import ai.altrucoder.rpc.dto.LoadErrorDto
import ai.altrucoder.rpc.dto.LoadProgressDto
import ai.altrucoder.rpc.dto.ModelFavoriteUpdateDto
import ai.altrucoder.rpc.dto.ModelSelectionUpdateDto
import ai.altrucoder.rpc.dto.ModelStateDto
import ai.altrucoder.rpc.dto.ModelVariantUpdateDto
import ai.altrucoder.rpc.dto.ProfileStatusDto
import com.intellij.openapi.components.service
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/**
 * Backend implementation of [AltruCoderAppRpcApi].
 *
 * Delegates directly to the app-level [AltruCoderBackendAppService] —
 * no project resolution needed since all operations are app-scoped.
 */
class AltruCoderAppRpcApiImpl : AltruCoderAppRpcApi {

    private val app: AltruCoderBackendAppService get() = service()

    override suspend fun connect() = app.connect()

    override suspend fun state(): Flow<AltruCoderAppStateDto> =
        app.appState.map(::dto).distinctUntilChanged()

    override suspend fun health(): HealthDto = app.health()

    override suspend fun retry() = app.retry()

    override suspend fun restart() = app.restart()

    override suspend fun reinstall() = app.reinstall()

    override suspend fun modelState(): ModelStateDto = app.models.state()

    override suspend fun updateModelFavorite(update: ModelFavoriteUpdateDto): ModelStateDto = app.models.favorite(update)

    override suspend fun updateModelSelection(update: ModelSelectionUpdateDto): ModelStateDto = app.models.selection(update)

    override suspend fun clearModelSelection(agent: String): ModelStateDto = app.models.clear(agent)

    override suspend fun updateModelVariant(update: ModelVariantUpdateDto): ModelStateDto = app.models.variant(update)

    private fun dto(state: AltruCoderAppState): AltruCoderAppStateDto =
        appStateDto(state)
}

internal fun appStateDto(state: AltruCoderAppState): AltruCoderAppStateDto =
    when (state) {
        AltruCoderAppState.Disconnected -> AltruCoderAppStateDto(AltruCoderAppStatusDto.DISCONNECTED)
        AltruCoderAppState.Connecting -> AltruCoderAppStateDto(AltruCoderAppStatusDto.CONNECTING)
        is AltruCoderAppState.Loading -> AltruCoderAppStateDto(
            status = AltruCoderAppStatusDto.LOADING,
            progress = progress(state.progress),
        )
        is AltruCoderAppState.Ready -> AltruCoderAppStateDto(
            status = AltruCoderAppStatusDto.READY,
            progress = LoadProgressDto(
                config = true,
                notifications = true,
                profile = if (state.data.profile != null) ProfileStatusDto.LOADED
                    else ProfileStatusDto.NOT_LOGGED_IN,
            ),
            warnings = state.data.warnings.map(::warning),
            config = config(state.data.config),
        )
        is AltruCoderAppState.Error -> AltruCoderAppStateDto(
            status = AltruCoderAppStatusDto.ERROR,
            error = state.message,
            errors = state.errors.map(::error),
        )
    }

private fun progress(p: LoadProgress) = LoadProgressDto(
    config = p.config,
    notifications = p.notifications,
    profile = when (p.profile) {
        ProfileResult.PENDING -> ProfileStatusDto.PENDING
        ProfileResult.LOADED -> ProfileStatusDto.LOADED
        ProfileResult.NOT_LOGGED_IN -> ProfileStatusDto.NOT_LOGGED_IN
    },
)

private fun error(e: LoadError) = LoadErrorDto(
    resource = e.resource,
    status = e.status,
    detail = e.detail,
)

private fun warning(w: ConfigWarning) = ConfigWarningDto(
    path = w.path,
    message = w.message,
    detail = w.detail,
)

private fun config(c: Config) = ConfigDto(
    model = c.model,
    agent = agents(c.agent),
)

private fun agents(cfg: ConfigAgent?): Map<String, AgentConfigDto> {
    if (cfg == null) return emptyMap()
    val known = listOf(
        "plan" to cfg.plan,
        "build" to cfg.build,
        "debug" to cfg.debug,
        "orchestrator" to cfg.orchestrator,
        "ask" to cfg.ask,
        "general" to cfg.general,
        "explore" to cfg.explore,
        "title" to cfg.title,
        "summary" to cfg.summary,
        "compaction" to cfg.compaction,
    ).mapNotNull { (name, item) -> item?.let { name to agent(it) } }.toMap()
    val extra = cfg.entries.associate { (name, item) -> name to agent(item) }
    return known + extra
}

private fun agent(cfg: AgentConfig) = AgentConfigDto(
    model = cfg.model,
    variant = cfg.variant,
)
