package ai.altrucoder.rpc.dto

import kotlinx.serialization.Serializable

@Serializable
enum class AltruCoderWorkspaceStatusDto {
    PENDING,
    LOADING,
    READY,
    ERROR,
}

@Serializable
data class AltruCoderWorkspaceLoadProgressDto(
    val providers: Boolean = false,
    val agents: Boolean = false,
    val commands: Boolean = false,
    val skills: Boolean = false,
)

@Serializable
data class AltruCoderWorkspaceStateDto(
    val status: AltruCoderWorkspaceStatusDto,
    val progress: AltruCoderWorkspaceLoadProgressDto? = null,
    val providers: ProvidersDto? = null,
    val agents: AgentsDto? = null,
    val commands: List<CommandDto> = emptyList(),
    val skills: List<SkillDto> = emptyList(),
    val error: String? = null,
    val errors: List<LoadErrorDto> = emptyList(),
)
