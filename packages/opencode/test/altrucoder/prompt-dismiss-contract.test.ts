/**
 * Contract test for prompt.ts Altru Coder-specific invariants.
 *
 * prompt.ts is a shared upstream file. The Altru Coder-specific "new prompt unblocks
 * pending suggestions/questions then enqueues without cancelling the in-flight
 * stream" behaviour lives inside a altrucoder_change block. An upstream merge
 * that restructures the prompt handling could silently remove these calls —
 * this test catches that.
 */

import { describe, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const PROMPT_FILE = path.resolve(import.meta.dir, "../../src/session/prompt.ts")

describe("prompt.ts Altru Coder-specific invariants", () => {
  test("imports Suggestion from altrucoder/suggestion", () => {
    const content = fs.readFileSync(PROMPT_FILE, "utf-8")
    expect(content).toMatch(/import\s*\{[^}]*Suggestion[^}]*\}\s*from\s*["']@\/altrucoder\/suggestion["']/)
  })

  test("imports Question from the question module", () => {
    const content = fs.readFileSync(PROMPT_FILE, "utf-8")
    expect(content).toMatch(/import\s*\{[^}]*Question[^}]*\}\s*from\s*["']@\/question["']/)
  })

  test("calls Suggestion.dismissAll before restarting the session loop", () => {
    const content = fs.readFileSync(PROMPT_FILE, "utf-8")
    expect(content).toContain("Suggestion.dismissAll")
  })

  test("dismissAll for suggestions and questions runs before enqueue, without cancelling the in-flight fiber", () => {
    const content = fs.readFileSync(PROMPT_FILE, "utf-8")
    // dismissAll for both suggestions and questions must precede the enqueue so
    // an in-flight handle.process blocked on a pending tool prompt can return.
    // Critically, the block must NOT call state.cancel or AltruCoderSessionPromptQueue.reserve —
    // either of those would abort the running streamText mid-tokens, which was
    // the #9332 regression. Order: dismissAll(Suggestion) → dismissAll(Question) → enqueue.
    const block = content.match(
      /altrucoder_change start[^\n]*unblock tools[\s\S]*?Suggestion\.dismissAll[\s\S]*?Question\.dismissAll[\s\S]*?AltruCoderSessionPromptQueue\.enqueue/,
    )
    expect(block).not.toBeNull()
    expect(content).not.toMatch(/state\.cancel\(input\.sessionID\)/)
    expect(content).not.toMatch(/AltruCoderSessionPromptQueue\.reserve/)
  })

  test("runLoop breaks out between LLM steps when a newer prompt was enqueued", () => {
    const content = fs.readFileSync(PROMPT_FILE, "utf-8")
    // hasFollowup has to be checked inside runLoop so the current handle.process
    // finishes naturally (tokens + inline tool calls) and the next LLM step is
    // skipped when a follow-up is already queued.
    expect(content).toContain("AltruCoderSessionPromptQueue.hasFollowup(sessionID)")
  })
})
