package ai.altrucoder.client.session

import ai.altrucoder.rpc.dto.SessionDto
import com.intellij.openapi.actionSystem.DataKey

interface SessionManager {
    companion object {
        val KEY = DataKey.create<SessionManager>("ai.altrucoder.client.session.SessionManager")
    }

    fun newSession()

    fun openSession(session: SessionDto)
}
