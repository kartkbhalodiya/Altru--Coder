import type { ProviderPreset } from "./types"

export const GroqPreset: ProviderPreset = {
  id: "groq",
  name: "Groq",
  baseURL: "https://api.groq.com/openai/v1",
  note: "Select Groq hosted models from the built-in Cline registry.",
  fetch: false,
  models: [
    { id: "groq/compound", name: "Compound" },
    { id: "groq/compound-mini", name: "Compound Mini" },
    { id: "openai/gpt-oss-120b", name: "Gpt Oss 120b" },
    { id: "openai/gpt-oss-20b", name: "Gpt Oss 20b" },
    { id: "openai/gpt-oss-safeguard-20b", name: "Gpt Oss Safeguard 20b" },
    { id: "qwen/qwen3-32b", name: "Qwen3 32b", reasoning: true },
    { id: "compound-beta", name: "Compound Beta" },
    { id: "compound-beta-mini", name: "Compound Beta Mini" },
    { id: "deepseek-r1-distill-llama-70b", name: "Deepseek R1 Distill Llama 70b" },
    { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick 17b 128e Instruct" },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17b 16e Instruct" },
    { id: "meta-llama/llama-guard-4-12b", name: "Llama Guard 4 12b" },
    { id: "meta-llama/llama-prompt-guard-2-22m", name: "Llama Prompt Guard 2 22m" },
    { id: "meta-llama/llama-prompt-guard-2-86m", name: "Llama Prompt Guard 2 86m" },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70b Versatile" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8b Instant" },
    { id: "moonshotai/kimi-k2-instruct", name: "Kimi K2 Instruct" },
    { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2 Instruct 0905" },
  ],
}
