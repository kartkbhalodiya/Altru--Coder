package ai.altrucoder.client.session.ui

interface SessionView {
    val sessionViewKind: Kind

    enum class Kind {
        Default,
        UserPrompt,
    }
}
