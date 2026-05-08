package ai.altrucoder.backend.app

import ai.altrucoder.jetbrains.api.model.Config
import ai.altrucoder.jetbrains.api.model.AltruCoderNotifications200ResponseInner
import ai.altrucoder.jetbrains.api.model.AltruCoderProfile200Response

/**
 * Full application lifecycle state, combining CLI transport connection
 * status with data-loading progress.
 *
 * [ConnectionState] stays internal to [AltruCoderConnectionService] for the
 * transport layer. This sealed class is what the frontend observes.
 */
sealed class AltruCoderAppState {
    data object Disconnected : AltruCoderAppState()
    data object Connecting : AltruCoderAppState()
    data class Loading(val progress: LoadProgress) : AltruCoderAppState()
    data class Ready(val data: AppData) : AltruCoderAppState()
    data class Error(val message: String, val errors: List<LoadError> = emptyList()) : AltruCoderAppState()
}

/**
 * Tracks which global data fetches have completed during the [AltruCoderAppState.Loading] phase.
 */
data class LoadProgress(
    val config: Boolean = false,
    val notifications: Boolean = false,
    val profile: ProfileResult = ProfileResult.PENDING,
)

/** Outcome of the profile fetch. */
enum class ProfileResult { PENDING, LOADED, NOT_LOGGED_IN }

/**
 * Error detail for a single resource that failed to load.
 */
data class LoadError(
    val resource: String,
    val status: Int? = null,
    val detail: String? = null,
)

data class ConfigWarning(
    val path: String,
    val message: String,
    val detail: String? = null,
)

/**
 * All global data that has been successfully loaded.
 * Present only in [AltruCoderAppState.Ready].
 */
data class AppData(
    val profile: AltruCoderProfile200Response?,
    val config: Config,
    val notifications: List<AltruCoderNotifications200ResponseInner>,
    val warnings: List<ConfigWarning> = emptyList(),
)
