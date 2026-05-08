@file:Suppress("UnstableApiUsage")

package ai.altrucoder.backend.rpc

import ai.altrucoder.backend.app.AltruCoderBackendAppService
import ai.altrucoder.backend.app.AltruCoderBackendChatManager
import ai.altrucoder.backend.app.AltruCoderBackendSessionManager
import ai.altrucoder.backend.workspace.AltruCoderBackendWorkspaceManager
import ai.altrucoder.log.ChatLogSummary
import ai.altrucoder.rpc.AltruCoderSessionRpcApi
import ai.altrucoder.rpc.dto.ChatEventDto
import ai.altrucoder.rpc.dto.ConfigUpdateDto
import ai.altrucoder.rpc.dto.MessageWithPartsDto
import ai.altrucoder.rpc.dto.ModelSelectionDto
import ai.altrucoder.rpc.dto.PermissionAlwaysRulesDto
import ai.altrucoder.rpc.dto.PermissionReplyDto
import ai.altrucoder.rpc.dto.PermissionRequestDto
import ai.altrucoder.rpc.dto.PromptDto
import ai.altrucoder.rpc.dto.QuestionReplyDto
import ai.altrucoder.rpc.dto.QuestionRequestDto
import ai.altrucoder.rpc.dto.SessionDto
import ai.altrucoder.rpc.dto.SessionListDto
import ai.altrucoder.rpc.dto.SessionStatusDto
import com.intellij.openapi.components.service
import ai.altrucoder.log.AltruCoderLog
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter

/**
 * Backend implementation of [AltruCoderSessionRpcApi].
 *
 * Session CRUD routes through the [AltruCoderBackendWorkspaceManager] to
 * get the correct workspace for a directory. Status tracking and
 * worktree directory management go directly to the
 * [AltruCoderBackendSessionManager]. Chat operations delegate to
 * [AltruCoderBackendChatManager].
 */
class AltruCoderSessionRpcApiImpl : AltruCoderSessionRpcApi {
    companion object {
        private val LOG = AltruCoderLog.create(AltruCoderSessionRpcApiImpl::class.java)
    }

    private val workspaces: AltruCoderBackendWorkspaceManager
        get() = service<AltruCoderBackendAppService>().workspaces

    private val sessions: AltruCoderBackendSessionManager
        get() = service<AltruCoderBackendAppService>().sessions

    private val chat: AltruCoderBackendChatManager
        get() = service<AltruCoderBackendAppService>().chat

    override suspend fun list(directory: String): SessionListDto =
        workspaces.get(directory).sessions()

    override suspend fun recent(directory: String, limit: Int): SessionListDto =
        sessions.recent(directory, limit)

    override suspend fun create(directory: String): SessionDto {
        LOG.info("create session: directory=$directory")
        return workspaces.get(directory).createSession()
    }

    override suspend fun get(id: String, directory: String): SessionDto {
        val dir = sessions.getDirectory(id, directory)
        return sessions.get(id, dir)
    }

    override suspend fun delete(id: String, directory: String) {
        val dir = sessions.getDirectory(id, directory)
        workspaces.get(dir).deleteSession(id)
    }

    override suspend fun statuses(): Flow<Map<String, SessionStatusDto>> =
        sessions.statuses

    override suspend fun setDirectory(id: String, directory: String) =
        sessions.setDirectory(id, directory)

    override suspend fun getDirectory(id: String, fallback: String): String =
        sessions.getDirectory(id, fallback)

    // ------ chat ------

    override suspend fun prompt(id: String, directory: String, prompt: PromptDto) {
        LOG.info("prompt RPC: session=$id, dir=$directory, parts=${prompt.parts.size}")
        chat.prompt(id, directory, prompt)
    }

    override suspend fun abort(id: String, directory: String) =
        chat.abort(id, directory)

    override suspend fun compact(id: String, directory: String, model: ModelSelectionDto) =
        chat.compact(id, directory, model)

    override suspend fun messages(id: String, directory: String): List<MessageWithPartsDto> =
        chat.messages(id, directory)

    override suspend fun events(id: String, directory: String): Flow<ChatEventDto> =
        chat.events.filter { event ->
            val sid = when (event) {
                is ChatEventDto.MessageUpdated -> event.sessionID
                is ChatEventDto.PartUpdated -> event.sessionID
                is ChatEventDto.PartDelta -> event.sessionID
                is ChatEventDto.PartRemoved -> event.sessionID
                is ChatEventDto.TurnOpen -> event.sessionID
                is ChatEventDto.TurnClose -> event.sessionID
                is ChatEventDto.Error -> event.sessionID
                is ChatEventDto.MessageRemoved -> event.sessionID
                is ChatEventDto.PermissionAsked -> event.sessionID
                is ChatEventDto.PermissionReplied -> event.sessionID
                is ChatEventDto.QuestionAsked -> event.sessionID
                is ChatEventDto.QuestionReplied -> event.sessionID
                is ChatEventDto.QuestionRejected -> event.sessionID
                is ChatEventDto.SessionStatusChanged -> event.sessionID
                is ChatEventDto.SessionUpdated -> event.sessionID
                is ChatEventDto.SessionIdle -> event.sessionID
                is ChatEventDto.SessionCompacted -> event.sessionID
                is ChatEventDto.SessionDiffChanged -> event.sessionID
                is ChatEventDto.TodoUpdated -> event.sessionID
            }
            val passes = sid == null || sid == id
            if (passes) LOG.debug { "${ChatLogSummary.sid(id)} pass=true ${ChatLogSummary.eventBody(event)}" }
            else LOG.debug { "${ChatLogSummary.sid(id)} pass=false srcSid=$sid ${ChatLogSummary.eventBody(event)}" }
            passes
        }

    override suspend fun updateConfig(directory: String, config: ConfigUpdateDto) =
        chat.updateConfig(directory, config)

    // ------ permission / question resolution ------

    override suspend fun replyPermission(requestId: String, directory: String, reply: PermissionReplyDto) {
        LOG.info("replyPermission: requestId=$requestId, reply=${reply.reply}")
        chat.replyPermission(requestId, directory, reply)
    }

    override suspend fun savePermissionRules(requestId: String, directory: String, rules: PermissionAlwaysRulesDto) {
        LOG.info("savePermissionRules: requestId=$requestId")
        chat.savePermissionRules(requestId, directory, rules)
    }

    override suspend fun replyQuestion(requestId: String, directory: String, answers: QuestionReplyDto) {
        LOG.info("replyQuestion: requestId=$requestId, answers=${answers.answers.size}")
        chat.replyQuestion(requestId, directory, answers)
    }

    override suspend fun rejectQuestion(requestId: String, directory: String) {
        LOG.info("rejectQuestion: requestId=$requestId")
        chat.rejectQuestion(requestId, directory)
    }

    override suspend fun pendingPermissions(directory: String): List<PermissionRequestDto> =
        chat.pendingPermissions(directory)

    override suspend fun pendingQuestions(directory: String): List<QuestionRequestDto> =
        chat.pendingQuestions(directory)
}
