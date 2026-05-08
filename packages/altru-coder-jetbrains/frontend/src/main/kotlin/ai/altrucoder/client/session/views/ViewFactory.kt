package ai.altrucoder.client.session.views

import ai.altrucoder.client.session.model.Compaction
import ai.altrucoder.client.session.model.Content
import ai.altrucoder.client.session.model.Generic
import ai.altrucoder.client.session.model.Reasoning
import ai.altrucoder.client.session.model.StepFinish
import ai.altrucoder.client.session.model.Text
import ai.altrucoder.client.session.model.Tool

/**
 * Creates the appropriate [PartView] for a given [Content] subtype.
 *
 * Adding a new content type means:
 * 1. Add a subclass of [Content] in the model.
 * 2. Add a [PartView] subclass in this package.
 * 3. Add a branch here — the exhaustive `when` will surface the gap as a compile error.
 */
object ViewFactory {
    fun create(content: Content): PartView = when (content) {
        is Text -> TextView(content)
        is Reasoning -> ReasoningView(content)
        is Tool -> ToolView(content)
        is Compaction -> CompactionView(content)
        is StepFinish -> error("step-finish is timeline-only")
        is Generic -> GenericView(content)
    }
}
