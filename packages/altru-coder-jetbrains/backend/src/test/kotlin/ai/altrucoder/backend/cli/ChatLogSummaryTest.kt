package ai.altrucoder.backend.cli

import ai.altrucoder.log.ChatLogSummary
import ai.altrucoder.rpc.dto.ChatEventDto
import ai.altrucoder.rpc.dto.MessageDto
import ai.altrucoder.rpc.dto.MessageTimeDto
import ai.altrucoder.rpc.dto.PartDto
import ai.altrucoder.rpc.dto.PermissionRequestDto
import ai.altrucoder.rpc.dto.PromptDto
import ai.altrucoder.rpc.dto.PromptPartDto
import ai.altrucoder.rpc.dto.QuestionInfoDto
import ai.altrucoder.rpc.dto.QuestionOptionDto
import ai.altrucoder.rpc.dto.QuestionRequestDto
import ai.altrucoder.rpc.dto.SessionStatusDto
import ai.altrucoder.rpc.dto.ToolRefDto
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ChatLogSummaryTest {

    @AfterTest
    fun tearDown() {
        System.clearProperty("altru-coder.dev.log.chat.content")
        System.clearProperty("altru-coder.dev.log.chat.preview.max")
    }

    @Test
    fun `prompt summary hides content by default`() {
        val text = "secret prompt body"

        val out = ChatLogSummary.prompt(text)

        assertTrue(out.contains("kind=prompt"))
        assertTrue(out.contains("chars=18"))
        assertFalse(out.contains("preview="))
        assertFalse(out.contains("secret"))
    }

    @Test
    fun `prompt summary includes truncated preview in preview mode`() {
        System.setProperty("altru-coder.dev.log.chat.content", "preview")
        System.setProperty("altru-coder.dev.log.chat.preview.max", "10")

        val out = ChatLogSummary.prompt("line one\nline two")

        assertTrue(out.contains("preview=\"line one l...\""), out)
    }

    @Test
    fun `event summary includes tool and ids`() {
        val event = ChatEventDto.PartUpdated(
            sessionID = "ses_1",
            part = PartDto(
                id = "prt_1",
                sessionID = "ses_1",
                messageID = "msg_1",
                type = "tool",
                tool = "grep",
                callID = "call_1",
                state = "running",
                title = "Search project",
            ),
        )

        val out = ChatLogSummary.event(event)

        assertTrue(out.contains("evt=message.part.updated"), out)
        assertTrue(out.contains("sid=ses_1"), out)
        assertTrue(out.contains("mid=msg_1"), out)
        assertTrue(out.contains("pid=prt_1"), out)
        assertTrue(out.contains("tool=grep"), out)
        assertTrue(out.contains("call=call_1"), out)
        assertTrue(out.contains("state=running"), out)
    }

    @Test
    fun `permission and question summaries include request correlation`() {
        System.setProperty("altru-coder.dev.log.chat.content", "preview")

        val permission = ChatLogSummary.permission(
            PermissionRequestDto(
                id = "req_perm",
                sessionID = "ses_1",
                permission = "edit",
                patterns = listOf("src/**/*.kt"),
                tool = ToolRefDto("msg_1", "call_1"),
            )
        )
        val question = ChatLogSummary.question(
            QuestionRequestDto(
                id = "req_q",
                sessionID = "ses_1",
                questions = listOf(
                    QuestionInfoDto(
                        question = "Pick a file",
                        header = "Files",
                        options = listOf(QuestionOptionDto("A", "desc")),
                    )
                ),
                tool = ToolRefDto("msg_2", "call_2"),
            )
        )

        assertTrue(permission.contains("rid=req_perm"), permission)
        assertTrue(permission.contains("call=call_1"), permission)
        assertTrue(question.contains("rid=req_q"), question)
        assertTrue(question.contains("options=1"), question)
        assertTrue(question.contains("call=call_2"), question)
    }

    @Test
    fun `status summary includes retry and request ids`() {
        val out = ChatLogSummary.status(
            SessionStatusDto(
                type = "offline",
                message = "No connection",
                attempt = 2,
                next = 5000L,
                requestID = "req_1",
            )
        )

        assertEquals(
            "type=offline attempt=2 next=5000 rid=req_1",
            out.substringBefore(" message="),
        )
        assertTrue(out.contains("message=\"No connection\""), out)
    }

    @Test
    fun `prompt dto summary includes types and model`() {
        System.setProperty("altru-coder.dev.log.chat.content", "preview")

        val out = ChatLogSummary.prompt(
            PromptDto(
                parts = listOf(
                    PromptPartDto(type = "text", text = "hello"),
                    PromptPartDto(type = "text", text = "world"),
                ),
                providerID = "altru-coder",
                modelID = "gpt-5",
                agent = "code",
                variant = "medium",
            )
        )

        assertTrue(out.contains("parts=2"), out)
        assertTrue(out.contains("types=text"), out)
        assertTrue(out.contains("agent=code"), out)
        assertTrue(out.contains("model=altru-coder/gpt-5"), out)
        assertTrue(out.contains("variant=medium"), out)
    }

    @Test
    fun `message updated summary includes role and model`() {
        val out = ChatLogSummary.event(
            ChatEventDto.MessageUpdated(
                sessionID = "ses_1",
                info = MessageDto(
                    id = "msg_1",
                    sessionID = "ses_1",
                    role = "assistant",
                    agent = "code",
                    providerID = "altru-coder",
                    modelID = "gpt-5",
                    time = MessageTimeDto(created = 0.0),
                ),
            )
        )

        assertTrue(out.contains("mid=msg_1"), out)
        assertTrue(out.contains("role=assistant"), out)
        assertTrue(out.contains("agent=code"), out)
        assertTrue(out.contains("model=altru-coder/gpt-5"), out)
    }
}
