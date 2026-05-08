package ai.altrucoder.backend.workspace

import ai.altrucoder.backend.app.LoadError

/**
 * Workspace data lifecycle state, combining connection readiness
 * with directory-scoped data loading progress.
 *
 * Only populated after [AltruCoderAppState.Ready][ai.altrucoder.backend.app.AltruCoderAppState.Ready]
 * — the CLI server must be connected and global data loaded before
 * workspace data can be fetched.
 */
sealed class AltruCoderWorkspaceState {
    data object Pending : AltruCoderWorkspaceState()
    data class Loading(val progress: AltruCoderWorkspaceLoadProgress) : AltruCoderWorkspaceState()
    data class Ready(
        val providers: ProviderData,
        val agents: AgentData,
        val commands: List<CommandInfo>,
        val skills: List<SkillInfo>,
    ) : AltruCoderWorkspaceState()
    data class Error(val message: String, val errors: List<LoadError> = emptyList()) : AltruCoderWorkspaceState()
}

/**
 * Tracks which workspace data fetches have completed during
 * the [AltruCoderWorkspaceState.Loading] phase.
 */
data class AltruCoderWorkspaceLoadProgress(
    val providers: Boolean = false,
    val agents: Boolean = false,
    val commands: Boolean = false,
    val skills: Boolean = false,
)

data class ProviderData(
    val providers: List<ProviderInfo>,
    val connected: List<String>,
    val defaults: Map<String, String>,
)

data class ProviderInfo(
    val id: String,
    val name: String,
    val source: String?,
    val models: Map<String, ModelInfo>,
)

data class ModelInfo(
    val id: String,
    val name: String,
    val attachment: Boolean,
    val reasoning: Boolean,
    val temperature: Boolean,
    val toolCall: Boolean,
    val free: Boolean,
    val status: String?,
    val recommendedIndex: Double?,
    val variants: List<String>,
    val limit: ModelLimitInfo?,
)

data class ModelLimitInfo(
    val context: Long = 0,
    val input: Long? = null,
    val output: Long = 0,
)

data class AgentData(
    val agents: List<AgentInfo>,
    val all: List<AgentInfo>,
    val default: String,
)

data class AgentInfo(
    val name: String,
    val displayName: String?,
    val description: String?,
    val mode: String,
    val native: Boolean?,
    val hidden: Boolean?,
    val color: String?,
    val deprecated: Boolean?,
)

data class CommandInfo(
    val name: String,
    val description: String?,
    val source: String?,
    val hints: List<String>,
)

data class SkillInfo(
    val name: String,
    val description: String,
    val location: String,
)
