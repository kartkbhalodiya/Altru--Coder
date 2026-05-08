package ai.altrucoder.client.testing

import ai.altrucoder.rpc.AltruCoderAppRpcApi
import ai.altrucoder.rpc.dto.HealthDto
import ai.altrucoder.rpc.dto.AltruCoderAppStateDto
import ai.altrucoder.rpc.dto.AltruCoderAppStatusDto
import ai.altrucoder.rpc.dto.ModelFavoriteUpdateDto
import ai.altrucoder.rpc.dto.ModelSelectionDto
import ai.altrucoder.rpc.dto.ModelSelectionUpdateDto
import ai.altrucoder.rpc.dto.ModelStateDto
import ai.altrucoder.rpc.dto.ModelVariantUpdateDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Fake [AltruCoderAppRpcApi] for testing.
 *
 * Push state changes via [state]. Health check returns [health].
 *
 * Every `suspend` method asserts it is NOT called on the EDT.
 */
class FakeAppRpcApi : AltruCoderAppRpcApi {

    val state = MutableStateFlow(AltruCoderAppStateDto(AltruCoderAppStatusDto.DISCONNECTED))
    var health = HealthDto(healthy = true, version = "1.0.0")
    var models = ModelStateDto()
    val selections = mutableListOf<ModelSelectionUpdateDto>()
    val cleared = mutableListOf<String>()
    val variants = mutableListOf<ModelVariantUpdateDto>()

    var connected = false
        private set
    var retries = 0
        private set

    override suspend fun connect() {
        assertNotEdt("connect")
        connected = true
    }

    override suspend fun state(): Flow<AltruCoderAppStateDto> {
        assertNotEdt("state")
        return state
    }

    override suspend fun health(): HealthDto {
        assertNotEdt("health")
        return health
    }

    override suspend fun retry() {
        assertNotEdt("retry")
        retries += 1
    }

    override suspend fun restart() {
        assertNotEdt("restart")
    }

    override suspend fun reinstall() {
        assertNotEdt("reinstall")
    }

    override suspend fun modelState(): ModelStateDto {
        assertNotEdt("modelState")
        return models
    }

    override suspend fun updateModelFavorite(update: ModelFavoriteUpdateDto): ModelStateDto {
        assertNotEdt("updateModelFavorite")
        val key = update.providerID to update.modelID
        val next = when (update.action) {
            "add" -> if (models.favorite.any { it.providerID to it.modelID == key }) {
                models.favorite
            } else {
                listOf(ModelSelectionDto(update.providerID, update.modelID)) + models.favorite
            }
            "remove" -> models.favorite.filterNot { it.providerID to it.modelID == key }
            else -> models.favorite
        }
        models = models.copy(favorite = next)
        return models
    }

    override suspend fun updateModelSelection(update: ModelSelectionUpdateDto): ModelStateDto {
        assertNotEdt("updateModelSelection")
        selections.add(update)
        models = models.copy(model = models.model + (update.agent to ModelSelectionDto(update.providerID, update.modelID)))
        return models
    }

    override suspend fun clearModelSelection(agent: String): ModelStateDto {
        assertNotEdt("clearModelSelection")
        cleared.add(agent)
        models = models.copy(model = models.model - agent)
        return models
    }

    override suspend fun updateModelVariant(update: ModelVariantUpdateDto): ModelStateDto {
        assertNotEdt("updateModelVariant")
        variants.add(update)
        models = models.copy(variant = models.variant + (update.key to update.value))
        return models
    }
}
