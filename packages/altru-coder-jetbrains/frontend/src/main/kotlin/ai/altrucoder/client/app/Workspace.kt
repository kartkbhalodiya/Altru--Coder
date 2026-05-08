package ai.altrucoder.client.app

import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStateDto
import kotlinx.coroutines.flow.StateFlow

/**
 * A workspace for a single directory. Mirrors the CLI concept of a
 * workspace — a directory with its providers, agents, commands, skills.
 *
 * Immutable reference — [state] flows internally as the workspace loads.
 * Lifecycle managed by [AltruCoderWorkspaceService].
 */
class Workspace(
    val directory: String,
    val state: StateFlow<AltruCoderWorkspaceStateDto>,
    val reload: () -> Unit,
)
