package ai.altrucoder.rpc.dto

import kotlinx.serialization.Serializable

@Serializable
data class SkillDto(
    val name: String,
    val description: String,
    val location: String,
)
