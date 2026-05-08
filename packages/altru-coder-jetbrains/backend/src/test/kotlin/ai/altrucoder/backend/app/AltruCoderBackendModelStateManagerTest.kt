package ai.altrucoder.backend.app

import ai.altrucoder.backend.cli.AltruCoderBackendHttpClients
import ai.altrucoder.backend.testing.MockCliServer
import ai.altrucoder.backend.testing.TestLog
import ai.altrucoder.rpc.dto.ModelFavoriteUpdateDto
import ai.altrucoder.rpc.dto.ModelSelectionDto
import ai.altrucoder.rpc.dto.ModelSelectionUpdateDto
import ai.altrucoder.rpc.dto.ModelVariantUpdateDto
import kotlinx.coroutines.runBlocking
import java.nio.file.Files
import kotlin.io.path.createTempDirectory
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AltruCoderBackendModelStateManagerTest {
    private val mock = MockCliServer()
    private val log = TestLog()
    private val dir = createTempDirectory("altru-coder-model-state-test")
    private val http = AltruCoderBackendHttpClients.api(mock.password)

    @AfterTest
    fun tearDown() {
        AltruCoderBackendHttpClients.shutdown(http)
        mock.close()
        Files.walk(dir).sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }

    @Test
    fun `state loads favorites from cli model json`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("""{"favorite":[{"providerID":"altru-coder","modelID":"auto"}],"recent":[{"providerID":"anthropic","modelID":"claude"}],"model":{"code":{"providerID":"openai","modelID":"gpt"}},"variant":{"openai/gpt":"high"}}""")
        val mgr = AltruCoderBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.state()

        assertEquals(1, state.favorite.size)
        assertEquals("altru-coder", state.favorite[0].providerID)
        assertEquals("auto", state.favorite[0].modelID)
        assertEquals("gpt", state.model["code"]?.modelID)
        assertEquals("high", state.variant["openai/gpt"])
        assertEquals(listOf("anthropic/claude"), state.recent.map { "${it.providerID}/${it.modelID}" })
        assertEquals(1, mock.requestCount("/path"))
    }

    @Test
    fun `favorite update writes parser built model json`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText(
            """{"model":{"code":{"providerID":"altru-coder","modelID":"auto"}},"recent":[{"providerID":"openai","modelID":"gpt"}],"variant":{"altru-coder/auto":"fast"},"favorite":[]}""",
        )
        val mgr = AltruCoderBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.favorite(ModelFavoriteUpdateDto("add", "anthropic", "claude"))
        val raw = dir.resolve("model.json").readText()

        assertEquals(listOf("anthropic/claude"), state.favorite.map { "${it.providerID}/${it.modelID}" })
        assertTrue(raw.contains("\"model\""), raw)
        assertTrue(raw.contains("\"recent\""), raw)
        assertTrue(raw.contains("\"variant\""), raw)
        assertTrue(raw.contains("claude"), raw)
    }

    @Test
    fun `selection update writes model json`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("""{"favorite":[],"recent":[]}""")
        val mgr = AltruCoderBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.selection(ModelSelectionUpdateDto("code", "altru-coder", "auto"))
        val raw = dir.resolve("model.json").readText()

        assertEquals("auto", state.model["code"]?.modelID)
        assertEquals(emptyList<ModelSelectionDto>(), state.recent)
        assertTrue(raw.contains("\"model\""), raw)
        assertTrue(raw.contains("\"recent\""), raw)
    }

    @Test
    fun `clear selection removes agent model`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("""{"model":{"code":{"providerID":"altru-coder","modelID":"auto"},"plan":{"providerID":"openai","modelID":"gpt"}}}""")
        val mgr = AltruCoderBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.clear("code")

        assertTrue("code" !in state.model)
        assertEquals("gpt", state.model["plan"]?.modelID)
    }

    @Test
    fun `variant update writes model json`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("{}")
        val mgr = AltruCoderBackendModelStateManager(log)
        mgr.start(http, port)

        val state = mgr.variant(ModelVariantUpdateDto("altru-coder/auto", "medium"))

        assertEquals("medium", state.variant["altru-coder/auto"])
        assertTrue(dir.resolve("model.json").readText().contains("medium"))
    }

    @Test
    fun `malformed model json returns empty favorites`() = runBlocking {
        val port = start()
        dir.resolve("model.json").writeText("not-json")
        val mgr = AltruCoderBackendModelStateManager(log)
        mgr.start(http, port)

        assertTrue(mgr.state().favorite.isEmpty())
    }

    private fun start(): Int {
        mock.path = """{"home":"$dir","state":"$dir","config":"$dir","worktree":"$dir","directory":"$dir"}"""
        return mock.start()
    }
}
