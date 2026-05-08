package ai.altrucoder.backend.app

import ai.altrucoder.backend.testing.MockCliServer
import ai.altrucoder.backend.testing.TestLog
import ai.altrucoder.rpc.dto.ModelSelectionDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import okhttp3.OkHttpClient
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class AltruCoderBackendChatManagerTest {

    private val mock = MockCliServer()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @AfterTest
    fun tearDown() {
        scope.cancel()
        mock.close()
    }

    @Test
    fun `compact posts summarize request with selected model`() {
        val port = mock.start()
        val chat = AltruCoderBackendChatManager(scope, TestLog())
        chat.start(OkHttpClient(), port, MutableSharedFlow())

        chat.compact("ses_abc", "/test/project", ModelSelectionDto("anthropic", "claude-4"))

        assertEquals(1, mock.requestCount("/session/ses_abc/summarize"))
        assertNotNull(mock.lastSummarizePath)
        assertTrue(mock.lastSummarizePath!!.startsWith("/session/ses_abc/summarize?directory="))
        assertEquals("""{"providerID":"anthropic","modelID":"claude-4"}""", mock.lastSummarizeBody)
    }
}
