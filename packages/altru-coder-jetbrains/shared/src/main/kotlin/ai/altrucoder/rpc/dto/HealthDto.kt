package ai.altrucoder.rpc.dto

import kotlinx.serialization.Serializable

@Serializable
data class HealthDto(
    val healthy: Boolean,
    val version: String,
)
