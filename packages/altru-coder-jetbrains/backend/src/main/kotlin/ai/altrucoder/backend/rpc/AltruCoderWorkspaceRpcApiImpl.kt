@file:Suppress("UnstableApiUsage")

package ai.altrucoder.backend.rpc

import ai.altrucoder.backend.app.AltruCoderAppState
import ai.altrucoder.backend.app.AltruCoderBackendAppService
import ai.altrucoder.backend.app.LoadError
import ai.altrucoder.backend.workspace.AgentData
import ai.altrucoder.backend.workspace.AgentInfo
import ai.altrucoder.backend.workspace.CommandInfo
import ai.altrucoder.backend.workspace.AltruCoderBackendWorkspaceManager
import ai.altrucoder.backend.workspace.AltruCoderWorkspaceLoadProgress
import ai.altrucoder.backend.workspace.AltruCoderWorkspaceState
import ai.altrucoder.backend.workspace.ModelInfo
import ai.altrucoder.backend.workspace.ProviderData
import ai.altrucoder.backend.workspace.ProviderInfo
import ai.altrucoder.backend.workspace.SkillInfo
import ai.altrucoder.rpc.AltruCoderWorkspaceRpcApi
import ai.altrucoder.rpc.dto.AgentDto
import ai.altrucoder.rpc.dto.AgentsDto
import ai.altrucoder.rpc.dto.CommandDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceLoadProgressDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStateDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStatusDto
import ai.altrucoder.rpc.dto.LoadErrorDto
import ai.altrucoder.rpc.dto.ModelDto
import ai.altrucoder.rpc.dto.ModelLimitDto
import ai.altrucoder.rpc.dto.ProviderDto
import ai.altrucoder.rpc.dto.ProvidersDto
import ai.altrucoder.rpc.dto.SkillDto
import com.intellij.openapi.components.service
import com.intellij.openapi.project.ProjectManager
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map

/**
 * Backend implementation of [AltruCoderWorkspaceRpcApi].
 *
 * Routes through the [AltruCoderBackendWorkspaceManager] to get a workspace
 * for the given directory. No [ProjectManager] dependency — any
 * directory (including worktrees) can get a workspace.
 */
class AltruCoderWorkspaceRpcApiImpl : AltruCoderWorkspaceRpcApi {

    private val app: AltruCoderBackendAppService get() = service()

    private val manager: AltruCoderBackendWorkspaceManager
        get() = app.workspaces

    override suspend fun resolveProjectDirectory(hint: String): String {
        // In monolith mode, find the open project whose basePath matches the hint.
        // In split mode, the backend's project.basePath is the real directory.
        val projects = ProjectManager.getInstance().openProjects
        val match = projects.firstOrNull { !it.isDefault }
        return match?.basePath ?: hint
    }

    /**
     * Emits workspace state for [directory]. Waits for the app to
     * reach [AltruCoderAppState.Ready] before creating the workspace —
     * until then, emits [AltruCoderWorkspaceStatusDto.PENDING].
     *
     * When the app leaves Ready (e.g. during restart/reconnect),
     * the flow falls back to PENDING again and re-subscribes to
     * the new workspace once Ready returns.
     */
    @OptIn(ExperimentalCoroutinesApi::class)
    override suspend fun state(directory: String): Flow<AltruCoderWorkspaceStateDto> =
        app.appState.flatMapLatest { state ->
            if (state is AltruCoderAppState.Ready) {
                manager.get(directory).state.map(::dto)
            } else {
                flowOf(AltruCoderWorkspaceStateDto(AltruCoderWorkspaceStatusDto.PENDING))
            }
        }.distinctUntilChanged()

    override suspend fun reload(directory: String) {
        if (app.appState.value !is AltruCoderAppState.Ready) return
        manager.get(directory).reload()
    }

    // ------ mapping: domain model → DTO ------

    private fun dto(state: AltruCoderWorkspaceState): AltruCoderWorkspaceStateDto =
        when (state) {
            AltruCoderWorkspaceState.Pending -> AltruCoderWorkspaceStateDto(AltruCoderWorkspaceStatusDto.PENDING)
            is AltruCoderWorkspaceState.Loading -> AltruCoderWorkspaceStateDto(
                status = AltruCoderWorkspaceStatusDto.LOADING,
                progress = progress(state.progress),
            )
            is AltruCoderWorkspaceState.Ready -> AltruCoderWorkspaceStateDto(
                status = AltruCoderWorkspaceStatusDto.READY,
                providers = providers(state.providers),
                agents = agents(state.agents),
                commands = state.commands.map(::command),
                skills = state.skills.map(::skill),
            )
            is AltruCoderWorkspaceState.Error -> AltruCoderWorkspaceStateDto(
                status = AltruCoderWorkspaceStatusDto.ERROR,
                error = state.message,
                errors = state.errors.map(::error),
            )
        }

    private fun error(e: LoadError) = LoadErrorDto(
        resource = e.resource,
        status = e.status,
        detail = e.detail,
    )

    private fun progress(p: AltruCoderWorkspaceLoadProgress) = AltruCoderWorkspaceLoadProgressDto(
        providers = p.providers,
        agents = p.agents,
        commands = p.commands,
        skills = p.skills,
    )

    private fun providers(d: ProviderData) = ProvidersDto(
        providers = d.providers.map(::provider),
        connected = d.connected,
        defaults = d.defaults,
    )

    private fun provider(p: ProviderInfo) = ProviderDto(
        id = p.id,
        name = p.name,
        source = p.source,
        models = p.models.mapValues { (_, m) -> model(m) },
    )

    private fun model(m: ModelInfo) = ModelDto(
        id = m.id,
        name = m.name,
        attachment = m.attachment,
        reasoning = m.reasoning,
        temperature = m.temperature,
        toolCall = m.toolCall,
        free = m.free,
        status = m.status,
        recommendedIndex = m.recommendedIndex,
        variants = m.variants,
        limit = m.limit?.let { ModelLimitDto(it.context, it.input, it.output) },
    )

    private fun agents(d: AgentData) = AgentsDto(
        agents = d.agents.map(::agent),
        all = d.all.map(::agent),
        default = d.default,
    )

    private fun agent(a: AgentInfo) = AgentDto(
        name = a.name,
        displayName = a.displayName,
        description = a.description,
        mode = a.mode,
        native = a.native,
        hidden = a.hidden,
        color = a.color,
        deprecated = a.deprecated,
    )

    private fun command(c: CommandInfo) = CommandDto(
        name = c.name,
        description = c.description,
        source = c.source,
        hints = c.hints,
    )

    private fun skill(s: SkillInfo) = SkillDto(
        name = s.name,
        description = s.description,
        location = s.location,
    )
}
