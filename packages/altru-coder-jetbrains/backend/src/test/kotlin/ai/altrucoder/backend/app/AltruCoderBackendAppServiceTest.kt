package ai.altrucoder.backend.app

import ai.altrucoder.backend.app.AltruCoderAppState
import ai.altrucoder.backend.app.AltruCoderBackendAppService
import ai.altrucoder.backend.rpc.appStateDto
import ai.altrucoder.backend.testing.FakeCliServer
import ai.altrucoder.backend.testing.MockCliServer
import ai.altrucoder.backend.testing.TestLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.assertContains

class AltruCoderBackendAppServiceTest {

    private val mock = MockCliServer()
    private val log = TestLog()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @AfterTest
    fun tearDown() {
        scope.cancel()
        mock.close()
    }

    private fun create(): AltruCoderBackendAppService =
        AltruCoderBackendAppService.create(scope, FakeCliServer(mock), log)

    @Test
    fun `full lifecycle reaches Ready`() = runBlocking {
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        val ready = svc.appState.value as AltruCoderAppState.Ready
        assertNotNull(ready.data.config)
        assertNotNull(ready.data.notifications)
    }

    @Test
    fun `config is loaded`() = runBlocking {
        mock.config = """{"model":"claude-4","username":"testuser"}"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertNotNull(svc.config)
        assertEquals("claude-4", svc.config!!.model)
    }

    @Test
    fun `ready dto maps model config`() = runBlocking {
        mock.config = """{"model":"openai/gpt","agent":{"plan":{"model":"anthropic/claude","variant":"high"}}}"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        val dto = appStateDto(svc.appState.value)
        assertEquals("openai/gpt", dto.config?.model)
        assertEquals("anthropic/claude", dto.config?.agent?.get("plan")?.model)
        assertEquals("high", dto.config?.agent?.get("plan")?.variant)
    }

    @Test
    fun `config warnings are loaded without blocking Ready`() = runBlocking {
        mock.warnings = """[{"path":".altru-coder/altru-coder.json","message":"Invalid JSON","detail":"CloseBraceExpected"}]"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        val ready = svc.appState.value as AltruCoderAppState.Ready
        assertEquals(1, ready.data.warnings.size)
        assertEquals(".altru-coder/altru-coder.json", ready.data.warnings.first().path)
        assertEquals("Invalid JSON", ready.data.warnings.first().message)
    }

    @Test
    fun `retry refreshes warnings while Ready`() = runBlocking {
        mock.warnings = """[{"path":".altru-coder/altru-coder.json","message":"Invalid JSON","detail":"CloseBraceExpected"}]"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        val before = svc.appState.value as AltruCoderAppState.Ready
        assertEquals(1, before.data.warnings.size)

        mock.warnings = "[]"
        svc.retry()

        withTimeout(5_000) {
            while ((svc.appState.value as? AltruCoderAppState.Ready)?.data?.warnings?.isNotEmpty() == true) {
                delay(100)
            }
        }

        val ready = svc.appState.value as AltruCoderAppState.Ready
        assertTrue(ready.data.warnings.isEmpty())
        assertTrue(svc.warnings.isEmpty())
    }

    @Test
    fun `retry restarts app when warnings remain after refresh`() = runBlocking {
        mock.warnings = """[{"path":".altru-coder/altru-coder.json","message":"Invalid JSON","detail":"CloseBraceExpected"}]"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        val before = mock.requestCount("/global/config")
        svc.retry()

        withTimeout(15_000) {
            while (mock.requestCount("/global/config") <= before) {
                delay(100)
            }
        }

        assertTrue(mock.requestCount("/global/config") > before)
        assertTrue(log.messages.any { it.contains("retry: restarted connection") })
    }

    @Test
    fun `profile is loaded when available`() = runBlocking {
        mock.profile = """{"profile":{"email":"alice@test.com","name":"Alice"},"balance":null,"currentOrgId":null}"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertNotNull(svc.profile)
        assertEquals("alice@test.com", svc.profile!!.profile.email)
    }

    @Test
    fun `profile 401 does not prevent Ready`() = runBlocking {
        mock.profileStatus = 401
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        // Profile is null but we still reached Ready
        assertNull(svc.profile)
        assertIs<AltruCoderAppState.Ready>(svc.appState.value)
    }

    @Test
    fun `config failure retries then transitions to Error`() = runBlocking {
        mock.configStatus = 500
        mock.config = """{"error":"internal"}"""
        val svc = create()
        svc.connect()

        withTimeout(15_000) {
            svc.appState.first { it is AltruCoderAppState.Error }
        }

        val err = svc.appState.value as AltruCoderAppState.Error
        assertEquals("Failed to load required data", err.message)
        assertTrue(err.errors.any { it.resource == "config" })
    }

    @Test
    fun `notifications failure transitions to Error`() = runBlocking {
        mock.notificationsStatus = 500
        mock.notifications = """{"error":"internal"}"""
        val svc = create()
        svc.connect()

        withTimeout(15_000) {
            svc.appState.first { it is AltruCoderAppState.Error }
        }

        val err = svc.appState.value as AltruCoderAppState.Error
        assertTrue(err.errors.any { it.resource == "notifications" })
    }

    @Test
    fun `retry reruns load for app load error`() = runBlocking {
        mock.configStatus = 500
        mock.config = """{"error":"internal"}"""
        val svc = create()
        svc.connect()

        withTimeout(15_000) {
            svc.appState.first { it is AltruCoderAppState.Error }
        }

        assertEquals(3, mock.requestCount("/global/config"))

        mock.configStatus = 200
        mock.config = """{"model":"retry/model"}"""
        svc.retry()

        withTimeout(15_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertEquals("retry/model", svc.config?.model)
        assertEquals(4, mock.requestCount("/global/config"))
    }

    @Test
    fun `connection error surfaces details as connection load error`() = runBlocking {
        val failing = object : ai.altrucoder.backend.cli.CliServer {
            override var forceExtract = false
            override fun process(): Process? = null
            override suspend fun init() = ai.altrucoder.backend.cli.CliServer.State.Error(
                message = "CLI startup failed",
                details = "stderr: missing dependency",
            )
            override fun exited(proc: Process) {}
            override fun stop() {}
            override fun dispose() {}
        }
        val svc = AltruCoderBackendAppService.create(scope, failing, log)
        svc.connect()

        withTimeout(5_000) {
            svc.appState.first { it is AltruCoderAppState.Error }
        }

        val err = svc.appState.value as AltruCoderAppState.Error
        assertEquals("CLI startup failed", err.message)
        assertContains(err.errors.map { it.resource }, "connection")
        assertEquals("stderr: missing dependency", err.errors.first { it.resource == "connection" }.detail)
        assertTrue(log.messages.any { it.contains("App error: CLI startup failed") })
    }

    @Test
    fun `warning state emits final warn log`() = runBlocking {
        mock.warnings = """[{"path":".altru-coder/altru-coder.json","message":"Invalid JSON","detail":"CloseBraceExpected"}]"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertTrue(log.messages.any {
            it.contains("App warnings:") && it.contains(".altru-coder/altru-coder.json: Invalid JSON")
        })
    }

    @Test
    fun `app load error emits final warn log`() = runBlocking {
        mock.configStatus = 500
        mock.config = """{"error":"internal"}"""
        val svc = create()
        svc.connect()

        withTimeout(15_000) {
            svc.appState.first { it is AltruCoderAppState.Error }
        }

        assertTrue(log.messages.any {
            it.contains("App error: Failed to load required data") && it.contains("config")
        })
    }

    @Test
    fun `connect when already Ready is no-op`() = runBlocking {
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        // Second connect should not change state
        svc.connect()
        assertIs<AltruCoderAppState.Ready>(svc.appState.value)
    }

    @Test
    fun `health returns HealthDto when connected`() = runBlocking {
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        val dto = svc.health()
        assertTrue(dto.healthy)
        assertEquals("1.0.0", dto.version)
    }

    @Test
    fun `health forwards healthy false from server`() = runBlocking {
        mock.health = """{"healthy":false,"version":"1.0.0"}"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        val dto = svc.health()
        assertFalse(dto.healthy)
        assertEquals("1.0.0", dto.version)
    }

    @Test
    fun `profile 500 does not prevent Ready`() = runBlocking {
        mock.profileStatus = 500
        mock.profile = """{"error":"internal"}"""
        val svc = create()
        svc.connect()

        withTimeout(15_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertNull(svc.profile)
        assertIs<AltruCoderAppState.Ready>(svc.appState.value)
    }

    @Test
    fun `dispose transitions to Disconnected`() = runBlocking {
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        svc.dispose()
        assertEquals(AltruCoderAppState.Disconnected, svc.appState.value)
    }

    @Test
    fun `loading tracks progress through Loading state`() = runBlocking {
        val svc = create()
        val states = mutableListOf<AltruCoderAppState>()

        val collector = scope.launch {
            svc.appState.collect { states.add(it) }
        }

        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        collector.cancel()

        // Should have passed through Loading at least once
        assertTrue(states.any { it is AltruCoderAppState.Loading })
        // Should have reached Ready
        assertTrue(states.any { it is AltruCoderAppState.Ready })
    }

    @Test
    fun `SSE config updated event refreshes config`() = runBlocking {
        mock.config = """{"model":"initial"}"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertEquals("initial", svc.config?.model)

        // Change the config response and push an SSE event
        mock.config = """{"model":"updated"}"""
        mock.awaitSseConnection()
        mock.pushEvent("global.config.updated", """{"type":"global.config.updated"}""")

        // Wait for config to be refreshed
        withTimeout(5_000) {
            while (svc.config?.model != "updated") {
                delay(100)
            }
        }

        assertEquals("updated", svc.config?.model)
    }

    @Test
    fun `SSE config updated refreshes warnings`() = runBlocking {
        mock.warnings = """[{"path":".altru-coder/altru-coder.json","message":"Invalid JSON","detail":"CloseBraceExpected"}]"""
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertEquals(1, (svc.appState.value as AltruCoderAppState.Ready).data.warnings.size)

        mock.warnings = "[]"
        mock.awaitSseConnection()
        mock.pushEvent("global.config.updated", """{"type":"global.config.updated"}""")

        withTimeout(5_000) {
            while ((svc.appState.value as? AltruCoderAppState.Ready)?.data?.warnings?.isNotEmpty() == true) {
                delay(100)
            }
        }

        assertTrue((svc.appState.value as AltruCoderAppState.Ready).data.warnings.isEmpty())
    }

    // ------ Concurrency & lifecycle tests ------

    @Test
    fun `rapid disposed events produce single valid Ready`() = runBlocking {
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        mock.awaitSseConnection()

        // Fire rapid global.disposed events to trigger concurrent load() calls
        repeat(5) {
            mock.pushEvent("global.disposed", """{"type":"global.disposed"}""")
        }

        // Wait for the app to settle back to Ready
        withTimeout(15_000) {
            // Allow transient Loading states, wait for final Ready
            while (true) {
                val state = svc.appState.value
                if (state is AltruCoderAppState.Ready) {
                    // Verify it's stable
                    delay(500)
                    if (svc.appState.value is AltruCoderAppState.Ready) break
                }
                delay(100)
            }
        }

        assertIs<AltruCoderAppState.Ready>(svc.appState.value)
        assertNotNull(svc.config)
    }

    @Test
    fun `restart lifecycle transitions correctly`() = runBlocking {
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        // Restart should tear down and reconnect
        svc.restart()

        // Should transition back to Ready after restart
        withTimeout(15_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertIs<AltruCoderAppState.Ready>(svc.appState.value)
        assertNotNull(svc.config)
    }

    @Test
    fun `reconnect after SSE close restores Ready state`() = runBlocking {
        val svc = create()
        svc.connect()

        withTimeout(10_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        // Close SSE to trigger reconnect path
        mock.closeSse()

        // Should eventually recover to Connected/Ready through reconnect
        // (connection service reconnects SSE if process is alive — but
        // FakeCliServer returns no process, so it delegates to onReconnect
        // which calls reconnect() under mutex)
        withTimeout(15_000) {
            svc.appState.first { it is AltruCoderAppState.Ready }
        }

        assertIs<AltruCoderAppState.Ready>(svc.appState.value)
    }
}
