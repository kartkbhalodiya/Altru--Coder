import { generateText } from "ai"
import { mergeDeep } from "remeda"
import { Provider } from "@/provider/provider"
import { ModelID, ProviderID } from "@/provider/schema"
import { ProviderTransform } from "@/provider/transform"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "enhance-prompt" })

const INSTRUCTION =
  "Generate an enhanced version of this prompt (reply with only the enhanced prompt - no conversation, explanations, lead-in, bullet points, placeholders, or surrounding quotes):"

export function clean(text: string) {
  const stripped = text.replace(/^```\w*\n?|```$/g, "").trim()
  return stripped.replace(/^(['"])([\s\S]*)\1$/, "$2").trim()
}

interface Options {
  providerID?: string
  modelID?: string
}

async function model(opts?: Options) {
  const base =
    opts?.providerID && opts.modelID
      ? { providerID: ProviderID.make(opts.providerID), modelID: ModelID.make(opts.modelID) }
      : await Provider.defaultModel()

  const small = await Provider.getSmallModel(base.providerID).catch((err: unknown) => {
    log.warn("small model unavailable", { providerID: base.providerID, error: err })
    return undefined
  })

  return small ?? Provider.getModel(base.providerID, base.modelID)
}

/**
 * Lightweight prompt enhancement that mirrors the legacy singleCompletionHandler.
 * Calls generateText directly — no agent identity, no system prompt, no tools,
 * no plugins. Just the bare instruction + user text as a single user message.
 */
export async function enhancePrompt(text: string, opts?: Options): Promise<string> {
  log.info("enhancing", { length: text.length })

  const target = await model(opts)
  const language = await Provider.getLanguage(target)

  const result = await generateText({
    model: language,
    temperature: target.capabilities.temperature ? 0.7 : undefined,
    providerOptions: ProviderTransform.providerOptions(
      target,
      mergeDeep(ProviderTransform.smallOptions(target), target.options),
    ),
    maxRetries: 3,
    system: INSTRUCTION,
    messages: [{ role: "user" as const, content: text }],
  })

  log.info("enhanced", { length: result.text.length })
  return clean(result.text)
}
