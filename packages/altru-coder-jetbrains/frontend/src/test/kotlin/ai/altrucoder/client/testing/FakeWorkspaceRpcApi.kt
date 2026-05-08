package ai.altrucoder.client.testing

import ai.altrucoder.rpc.AltruCoderWorkspaceRpcApi
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStateDto
import ai.altrucoder.rpc.dto.AltruCoderWorkspaceStatusDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Fake [AltruCoderWorkspaceRpcApi] for testing.
 *
 * Push workspace state changes via [state].
 * Directory resolution returns [directory].
 *
 * Every `suspend` method asserts it is NOT called on the EDT.
 */
class FakeWorkspaceRpcApi : AltruCoderWorkspaceRpcApi {

    var directory = "/test"
    val state = MutableStateFlow(AltruCoderWorkspaceStateDto(AltruCoderWorkspaceStatusDto.PENDING))
    var reloads = 0
        private set

    override suspend fun resolveProjectDirectory(hint: String): String {
        assertNotEdt("resolveProjectDirectory")
        return directory
    }

    override suspend fun state(directory: String): Flow<AltruCoderWorkspaceStateDto> {
        assertNotEdt("state")
        return state
    }

    override suspend fun reload(directory: String) {
        assertNotEdt("reload")
        reloads += 1
    }
}
