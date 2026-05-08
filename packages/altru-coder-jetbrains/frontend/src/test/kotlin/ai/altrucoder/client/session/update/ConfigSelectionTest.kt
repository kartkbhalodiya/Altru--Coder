package ai.altrucoder.client.session.update

import ai.altrucoder.rpc.dto.AgentDto
import ai.altrucoder.rpc.dto.AgentConfigDto
import ai.altrucoder.rpc.dto.ConfigDto
import ai.altrucoder.rpc.dto.AltruCoderAppStateDto
import ai.altrucoder.rpc.dto.AltruCoderAppStatusDto
import ai.altrucoder.rpc.dto.ModelDto
import ai.altrucoder.rpc.dto.ModelSelectionDto
import ai.altrucoder.rpc.dto.ModelStateDto
import ai.altrucoder.rpc.dto.ProviderDto

class ConfigSelectionTest : SessionControllerTestBase() {

    fun `test selectModel updates SessionModel and persists model state`() {
        projectRpc.state.value = workspaceReady()
        val m = controller()
        collect(m)
        flush()

        edt { m.selectModel("altru-coder", "gpt-5") }
        flush()

        assertTrue(rpc.configs.isEmpty())
        assertEquals("code", appRpc.selections.single().agent)
        assertEquals("altru-coder", appRpc.selections.single().providerID)
        assertEquals("gpt-5", appRpc.selections.single().modelID)
        assertSession(
            """
            [code] [altru-coder/gpt-5] [app: DISCONNECTED] [workspace: READY]
            """,
            m,
            show = false,
        )
    }

    fun `test selectAgent updates SessionModel and calls updateConfig`() {
        val m = controller()
        collect(m)
        flush()

        edt { m.selectAgent("plan") }
        flush()

        assertEquals(1, rpc.configs.size)
        assertEquals("plan", rpc.configs[0].second.agent)
        assertSession(
            """
            [plan] [app: DISCONNECTED] [workspace: PENDING]
            """,
            m,
            show = false,
        )
    }

    fun `test selectModel fires WorkspaceReady event`() {
        projectRpc.state.value = workspaceReady()
        val m = controller()
        val events = collect(m)
        flush()
        events.clear()

        edt { m.selectModel("altru-coder", "gpt-5") }
        flush()

        assertControllerEvents("WorkspaceReady", events)
    }

    fun `test clearModelOverride restores default model`() {
        appRpc.models = ModelStateDto(model = mapOf("code" to ModelSelectionDto("openai", "gpt")))
        appRpc.state.value = AltruCoderAppStateDto(
            AltruCoderAppStatusDto.READY,
            config = ConfigDto(agent = mapOf("code" to AgentConfigDto(model = "anthropic/claude"))),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "altru-coder",
                    name = "Altru Coder",
                    models = mapOf("altru-coder-auto/free" to ModelDto(id = "altru-coder-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("altru-coder", "anthropic", "openai"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("openai/gpt", m.model.model)
        assertTrue(m.model.modelOverride)

        edt { m.clearModelOverride() }
        flush()

        assertEquals("anthropic/claude", m.model.model)
        assertFalse(m.model.modelOverride)
        assertEquals(listOf("code"), appRpc.cleared)
    }

    fun `test global config supplies computed default`() {
        appRpc.state.value = AltruCoderAppStateDto(
            AltruCoderAppStatusDto.READY,
            config = ConfigDto(model = "openai/gpt"),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "altru-coder",
                    name = "Altru Coder",
                    models = mapOf("altru-coder-auto/free" to ModelDto(id = "altru-coder-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("altru-coder", "openai"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("openai/gpt", m.model.defaultModel)
        assertEquals("openai/gpt", m.model.model)
        assertFalse(m.model.modelOverride)
    }

    fun `test recent supplies computed default when config is absent`() {
        appRpc.models = ModelStateDto(recent = listOf(ModelSelectionDto("anthropic", "claude")))
        appRpc.state.value = AltruCoderAppStateDto(AltruCoderAppStatusDto.READY)
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "altru-coder",
                    name = "Altru Coder",
                    models = mapOf("altru-coder-auto/free" to ModelDto(id = "altru-coder-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude")),
                ),
            ),
            connected = listOf("altru-coder", "anthropic"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("anthropic/claude", m.model.defaultModel)
        assertEquals("anthropic/claude", m.model.model)
        assertFalse(m.model.modelOverride)
    }

    fun `test invalid config falls through to recent`() {
        appRpc.models = ModelStateDto(recent = listOf(ModelSelectionDto("anthropic", "claude")))
        appRpc.state.value = AltruCoderAppStateDto(
            AltruCoderAppStatusDto.READY,
            config = ConfigDto(model = "openai/gpt"),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "altru-coder",
                    name = "Altru Coder",
                    models = mapOf("altru-coder-auto/free" to ModelDto(id = "altru-coder-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("altru-coder", "anthropic"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("anthropic/claude", m.model.defaultModel)
        assertEquals("anthropic/claude", m.model.model)
    }

    fun `test no valid candidates falls back to altru-coder auto`() {
        appRpc.models = ModelStateDto(recent = listOf(ModelSelectionDto("openai", "gpt")))
        appRpc.state.value = AltruCoderAppStateDto(
            AltruCoderAppStatusDto.READY,
            config = ConfigDto(model = "missing/model"),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "altru-coder",
                    name = "Altru Coder",
                    models = mapOf("altru-coder-auto/free" to ModelDto(id = "altru-coder-auto/free", name = "Auto")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("altru-coder"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("altru-coder/altru-auto/free", m.model.defaultModel)
        assertEquals("altru-coder/altru-auto/free", m.model.model)
        assertFalse(m.model.modelOverride)
    }

    fun `test reset recomputes variants for computed model`() {
        appRpc.models = ModelStateDto(
            model = mapOf("code" to ModelSelectionDto("openai", "gpt")),
            variant = mapOf("anthropic/claude" to "high"),
        )
        appRpc.state.value = AltruCoderAppStateDto(
            AltruCoderAppStatusDto.READY,
            config = ConfigDto(agent = mapOf("code" to AgentConfigDto(model = "anthropic/claude"))),
        )
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude", variants = listOf("low", "high"))),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT", variants = listOf("fast"))),
                ),
            ),
            connected = listOf("anthropic", "openai"),
            defaults = emptyMap(),
        )
        val m = controller()
        collect(m)
        flush()

        assertEquals("openai/gpt", m.model.model)
        assertEquals(listOf("fast"), m.model.variants)

        edt { m.clearModelOverride() }
        flush()

        assertEquals("anthropic/claude", m.model.model)
        assertEquals(listOf("low", "high"), m.model.variants)
        assertEquals("high", m.model.variant)
    }

    fun `test selectAgent uses saved model for selected agent`() {
        appRpc.models = ModelStateDto(model = mapOf("plan" to ModelSelectionDto("openai", "gpt")))
        appRpc.state.value = AltruCoderAppStateDto(AltruCoderAppStatusDto.READY, config = ConfigDto(model = "altru-coder/gpt-5"))
        projectRpc.state.value = workspaceReady(
            agents = listOf(
                AgentDto(name = "code", displayName = "Code", mode = "code"),
                AgentDto(name = "plan", displayName = "Plan", mode = "code"),
            ),
            providers = listOf(
                ProviderDto(
                    id = "altru-coder",
                    name = "Altru Coder",
                    models = mapOf("gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5")),
                ),
                ProviderDto(
                    id = "openai",
                    name = "OpenAI",
                    models = mapOf("gpt" to ModelDto(id = "gpt", name = "GPT")),
                ),
            ),
            connected = listOf("altru-coder", "openai"),
            defaults = mapOf("code" to "altru-coder/gpt-5", "plan" to "altru-coder/gpt-5"),
        )
        val m = controller()
        collect(m)
        flush()

        edt { m.selectAgent("plan") }
        flush()

        assertEquals("openai/gpt", m.model.model)
        assertTrue(m.model.modelOverride)
    }

    fun `test selectVariant persists current model variant`() {
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "altru-coder",
                    name = "Altru Coder",
                    models = mapOf(
                        "gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5", variants = listOf("low", "medium", "high")),
                    ),
                ),
            ),
        )
        val m = controller()
        collect(m)
        flush()

        edt { m.selectVariant("high") }
        flush()

        assertEquals("high", m.model.variant)
        assertEquals("altru-coder/gpt-5", appRpc.variants.single().key)
        assertEquals("high", appRpc.variants.single().value)
    }
}
