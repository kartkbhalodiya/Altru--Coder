# Altru Coder

<p align="center">
  <img src="packages/altru-coder-vscode/assets/icons/altru-logo.png" alt="Altru Coder" width="128">
</p>

<h3 align="center">An open-source AI coding agent for serious engineering work.</h3>

<p align="center">
  <a href="https://github.com/kartkbhalodiya/Altru-Coder"><img alt="GitHub Repository" src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white"></a>
  <img alt="Bun" src="https://img.shields.io/badge/Bun-1.3.13-FBF0DF?style=for-the-badge&logo=bun&logoColor=000000">
  <img alt="VS Code Extension" src="https://img.shields.io/badge/VS_Code-Extension-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge&logo=opensourceinitiative&logoColor=white"></a>
  <a href="https://chat.whatsapp.com/J0XfY7LF9RDDNQN54CQOTY"><img alt="WhatsApp Support" src="https://img.shields.io/badge/WhatsApp-Support-25D366?style=for-the-badge&logo=whatsapp&logoColor=white"></a>
  <a href="mailto:altru.coder.ai@gmail.com"><img alt="Email Support" src="https://img.shields.io/badge/Email-Support-EA4335?style=for-the-badge&logo=gmail&logoColor=white"></a>
</p>

Altru Coder is a VS Code extension, CLI, local agent server, and TypeScript SDK built for agentic development. It can generate code from natural language, inspect and edit files, run terminal commands, stream tool results, manage model providers, and keep coding sessions organized around the active workspace.

This repository is a branded fork of OpenCode with Altru Coder-specific extension UI, provider onboarding, local model saving, prompt enhancement, mode behavior, and model selection work.

Need setup help or model-provider support? Join the WhatsApp community at <https://chat.whatsapp.com/J0XfY7LF9RDDNQN54CQOTY> or email <altru.coder.ai@gmail.com>.

## Quick Start

```bash
git clone https://github.com/kartkbhalodiya/Altru-Coder.git
cd Altru-Coder
bun install
bun run extension
```

For a faster relaunch after one successful build:

```bash
bun run extension -- --no-build
```

## Core Features

| Area | Capability |
|---|---|
| AI chat coding | Ask for fixes, refactors, file creation, project explanations, and implementation plans from the VS Code sidebar. |
| Local agent server | Runs a bundled `altru-coder serve` process and streams HTTP/SSE events into the extension. |
| Multi-mode workflow | Switch between Code, Ask, Debug, Orchestrator, and Plan modes with mode-specific prompt behavior. |
| Provider setup | Add OpenAI-compatible providers, save API keys locally, fetch remote models, and expose saved models in chat. |
| Model picker | Keeps the chat model selector focused on locally saved models instead of flooding users with every remote model. |
| Prompt enhancement | Improves rough prompts through the active model before sending work to the agent. |
| Tool execution | Lets the agent read files, edit code, run shell commands, inspect diagnostics, search the web, and summarize changes. |
| Agent Manager | Coordinates isolated sessions and worktrees for larger engineering tasks. |
| Mermaid support | Repairs common flowchart label issues so Mermaid diagrams render more reliably in chat. |
| Glass UI | Uses a clean glass-style webview surface with rounded chat boxes, visible borders, provider logos, and a polished welcome state. |
| SDK access | Ships generated TypeScript clients for the same local server API used by the extension. |
| Local-first workflow | Works from your machine and your workspace; remote services are only used for the model/provider you configure. |

## Agent Tools

Altru Coder's agent runtime is useful because it can observe, reason, and act through explicit tools instead of only returning text.

| Tool | What it is used for |
|---|---|
| `read` | Read source files with line-aware context. |
| `write` | Create or replace files when the user asks for generated output. |
| `edit` | Apply focused edits to existing files. |
| `apply_patch` | Apply structured code patches. |
| `bash` | Run shell commands, scripts, package managers, and local checks. |
| `glob` | Find files by path patterns. |
| `grep` | Search text and symbols across the workspace. |
| `warpgrep` | Run faster codebase search flows where available. |
| `diagnostics` | Inspect editor/compiler diagnostics. |
| `lsp` | Query language-server information. |
| `webfetch` | Fetch a specific web page when context is required. |
| `websearch` | Search the web when current external information is needed. |
| `task` | Delegate structured sub-work inside the agent runtime. |
| `todo` | Track multi-step work during longer tasks. |
| `plan` | Enter or exit planning flows. |
| `question` | Ask the user for a required decision. |
| `suggest` | Present selectable suggestions inside the UI. |
| `skill` | Load reusable local guidance for specialized work. |
| `recall` | Retrieve relevant remembered context. |

## Product Surfaces

| Surface | Description |
|---|---|
| VS Code sidebar | Primary chat interface with model picker, modes, settings, and tool output. |
| Settings UI | Provider setup, custom model saving, API-key entry, and local model preferences. |
| CLI TUI | Terminal-first agent interface for developers who prefer command-line workflows. |
| Local server | Headless API process used by the extension and SDK. |
| TypeScript SDK | Programmatic client for integrations and automation. |
| Agent Manager | Multi-session orchestration surface for worktree-backed work. |

## System Map

The diagram uses one muted color family so the data flow stays readable instead of decorative.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#f3f4f6","primaryTextColor":"#111827","primaryBorderColor":"#6b7280","lineColor":"#6b7280","secondaryColor":"#f9fafb","tertiaryColor":"#ffffff","fontFamily":"Inter,Segoe UI,Arial"}}}%%
flowchart LR
  U["Developer"] --> V["VS Code Sidebar"]
  U --> C["CLI TUI"]
  V --> S["Local altru-coder serve"]
  C --> S
  S --> A["Agent Runtime"]
  A --> T["Tools: read, edit, bash, git, diagnostics"]
  A --> M["Model Provider"]
  M --> R["Streaming response"]
  T --> R
  R --> V
  S --> K["Generated SDK"]
  S --> G["Gateway and telemetry packages"]
```

## Repository Layout

| Path | Purpose |
|---|---|
| `packages/opencode` | Core CLI, local HTTP and SSE server, tools, prompts, sessions, and agent runtime. |
| `packages/altru-coder-vscode` | VS Code extension, bundled CLI launcher, sidebar webview, settings UI, model picker, and Agent Manager. |
| `packages/sdk/js` | Generated TypeScript SDK for the local server API. |
| `packages/altru-coder-ui` | Shared SolidJS UI components used by Altru Coder views. |
| `packages/altru-coder-gateway` | Gateway-facing auth and provider routing package. |
| `packages/altru-coder-telemetry` | PostHog and OpenTelemetry integration. |
| `packages/altru-coder-i18n` | Translation and localization utilities. |
| `packages/plugin` | Plugin and tool interface definitions. |

## Provider Logo Matrix

These are the provider logo assets currently shipped in the VS Code extension and used by the model setup flow.

| Icon | Provider | Provider type |
|---|---|---|
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/alibaba-cn.png" width="24" alt="Alibaba DashScope"> | Alibaba DashScope | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/anthropic.png" width="24" alt="Anthropic"> | Anthropic | Hosted model provider |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/ask-sage.png" width="24" alt="Ask Sage"> | Ask Sage | Hosted model provider |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/azure.png" width="24" alt="Azure OpenAI"> | Azure OpenAI | Hosted enterprise endpoint |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/cerebras.png" width="24" alt="Cerebras"> | Cerebras | Hosted inference |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/clawrouter.png" width="24" alt="ClawRouter"> | ClawRouter | Local router |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/cohere.png" width="24" alt="Cohere"> | Cohere | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/cometapi.png" width="24" alt="CometAPI"> | CometAPI | Hosted router |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/deepseek.png" width="24" alt="DeepSeek"> | DeepSeek | Hosted reasoning and chat |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/docker.png" width="24" alt="Docker Model Runner"> | Docker Model Runner | Local model runtime |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/fireworks.png" width="24" alt="Fireworks AI"> | Fireworks AI | Hosted inference |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/function-network.png" width="24" alt="Function Network"> | Function Network | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/gemini.png" width="24" alt="Gemini"> | Gemini | Google model family |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/google.png" width="24" alt="Google"> | Google | Hosted Gemini endpoint |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/groq.png" width="24" alt="Groq"> | Groq | Hosted low-latency inference |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/inception.png" width="24" alt="Inception Labs"> | Inception Labs | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/lemonade.png" width="24" alt="Lemonade"> | Lemonade | Local model runtime |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/llama.cpp.png" width="24" alt="llama.cpp"> | llama.cpp | Local model runtime |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/llamacpp.png" width="24" alt="llamacpp"> | llamacpp | Local model runtime |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/llamafile.png" width="24" alt="Llamafile"> | Llamafile | Local model runtime |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/lmstudio.png" width="24" alt="LM Studio"> | LM Studio | Local model runtime |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/mimo.png" width="24" alt="Mimo"> | Mimo | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/mistral.png" width="24" alt="Mistral"> | Mistral | Hosted model provider |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/moonshot.png" width="24" alt="Moonshot AI"> | Moonshot AI | Hosted Kimi models |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/morph.ico" width="24" alt="Morph"> | Morph | Hosted apply models |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/ncompass.png" width="24" alt="NCompass"> | NCompass | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/nebius.png" width="24" alt="Nebius AI Studio"> | Nebius AI Studio | Hosted inference |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/novita.png" width="24" alt="Novita AI"> | Novita AI | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/nvidia.png" width="24" alt="NVIDIA NIM"> | NVIDIA NIM | Hosted NIM endpoint |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/ollama.png" width="24" alt="Ollama"> | Ollama | Local model runtime |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/openai.png" width="24" alt="OpenAI"> | OpenAI | Hosted model provider |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/openrouter.png" width="24" alt="OpenRouter"> | OpenRouter | Hosted router |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/ovhcloud.png" width="24" alt="OVHcloud"> | OVHcloud | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/qwen.png" width="24" alt="Qwen"> | Qwen | Alibaba model family |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/replicate.png" width="24" alt="Replicate"> | Replicate | Hosted model provider |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/sambanova.png" width="24" alt="SambaNova"> | SambaNova | Hosted inference |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/scaleway.png" width="24" alt="Scaleway"> | Scaleway | Hosted generative APIs |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/siliconflow.png" width="24" alt="SiliconFlow"> | SiliconFlow | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/tensorix.ico" width="24" alt="Tensorix"> | Tensorix | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/together.png" width="24" alt="Together AI"> | Together AI | Hosted open models |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/venice.png" width="24" alt="Venice"> | Venice | Hosted OpenAI-compatible |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/xAI.png" width="24" alt="xAI"> | xAI | Hosted Grok models |
| <img src="packages/altru-coder-vscode/assets/icons/provider-logos/zai.svg" width="24" alt="Z.ai"> | Z.ai | Hosted GLM models |

## Built-In Model Presets

The Add Model dialog ships with provider presets so a user can select a provider, enter an API key, optionally fetch remote models, and save the chosen model locally. Saved models are the ones shown in the chat model picker.

| Provider | Seed models |
|---|---|
| OpenAI | GPT-5 Codex, GPT-5.2, GPT-5, GPT-4.1, o3 |
| OpenRouter | OpenRouter Auto, Claude Sonnet 4.5, GPT-5, Gemini 2.5 Pro, DeepSeek R1 |
| ClawRouter | BlockRun Free, Auto Router |
| CometAPI | GPT-5 Chat Latest, Claude Sonnet 4.6, Gemini 3.1 Pro Preview, DeepSeek V3.1, Qwen3 Coder Plus |
| Google Gemini | Gemini 3.1 Pro Preview, Gemini 3 Flash Preview, Gemini 2.5 Pro, Gemini 2.5 Flash |
| Groq | Llama 3.3 70B Versatile, Llama 3.1 8B Instant, Mixtral 8x7B, Gemma 2 9B |
| Mistral | Mistral Large, Devstral Medium, Magistral Medium, Codestral |
| DeepSeek | DeepSeek Chat, DeepSeek Reasoner |
| Inception Labs | Mercury 2, Mercury Edit 2, Mercury Coder Small |
| xAI | Grok Code Fast 1, Grok 4.1 Fast Reasoning, Grok 4 Fast, Grok 3 |
| Cerebras | Llama 3.1 70B, Llama 4 Scout |
| Fireworks AI | StarCoder 7B, Llama 3.1 405B |
| Function Network | DeepSeek R1, Qwen2.5 Coder 32B |
| Together AI | Llama 3.1 405B Turbo, Llama 3.1 70B Turbo, CodeLlama 70B, Mixtral 8x7B |
| DeepInfra | DeepSeek R1, DeepSeek V3, Qwen2.5 Coder 32B, Llama 3.1 405B |
| Perplexity | Sonar Deep Research, Sonar Reasoning Pro, Sonar Pro |
| Cohere | Command A Reasoning, Command A, Command A Vision |
| Moonshot AI | Moonshot 128K, Moonshot 32K |
| MiniMax | MiniMax M2.7, MiniMax M2.7 Highspeed, MiniMax M2.5 |
| Mimo | Mimo VL 7B, Mimo Embedding |
| Novita AI | DeepSeek R1, DeepSeek V3, Llama 3.1 405B, Llama 3.3 70B |
| Nebius AI Studio | DeepSeek R1, DeepSeek V3, Llama 3.1 405B |
| NVIDIA NIM | Qwen3 Coder 480B A35B, GLM-4.7, Kimi K2 Instruct 0905 |
| NCompass | Qwen2.5 Coder 32B, Qwen2.5 72B, Llama 3.3 70B |
| SambaNova | Llama 4 Maverick, Llama 3.3 70B, DeepSeek R1, QwQ 32B |
| SiliconFlow | DeepSeek R1, DeepSeek V3, Qwen2.5 Coder 32B, Nemotron 70B |
| Tensorix | GLM-5, GLM-4.7, MiniMax M2.5, DeepSeek V3.1 |
| OVHcloud | Qwen2.5 Coder 32B, Qwen3 Coder 30B, GPT OSS 120B, DeepSeek R1 Distill 70B |
| Nous Research | Hermes 3 Llama 405B, DeepHermes 3 Mistral 24B |
| Kindo | GPT-4o, Claude 3.5 Sonnet, Gemini Pro |
| Alibaba DashScope | Qwen3 Coder Plus, Qwen3 Max, Qwen Plus, Qwen Turbo |
| Z.ai | GLM-5, GLM-4.7, GLM-4 Plus, GLM-4.5 |
| Morph | Auto, Morph V3 Fast, Morph V3 Large |
| Hugging Face | GPT OSS 120B, DeepSeek R1, Qwen2.5 Coder 32B |
| Venice | Llama 3.3 70B, Qwen2.5 Coder 32B, DeepSeek R1 |
| Scaleway | Qwen3 Coder 30B, Qwen2.5 Coder 32B, GPT OSS 120B, DeepSeek R1 Distill 70B |
| LM Studio | Qwen2.5 Coder 32B, Llama 3.1 8B |
| Ollama | Llama 3.1 8B, Qwen2.5 Coder 7B, Qwen2.5 Coder 32B |
| llama.cpp | Qwen2.5 Coder 7B, Llama 3.1 8B |
| Llamafile | Llama 3.1 8B, CodeLlama 7B |
| Lemonade | Llama 3.1 8B, Qwen2.5 Coder 7B |
| Text Generation WebUI | Mistral 7B, CodeLlama 34B |
| Llama Stack | Llama 3.1 8B, Llama 3.1 70B |
| vLLM | Qwen2.5 Coder 32B, Llama 3.1 70B |
| Docker Model Runner | Llama 3.1, Qwen2.5 Coder |

## Local Model Saving

Altru Coder treats models as local extension settings:

1. Open Settings in the Altru Coder sidebar.
2. Open Models.
3. Select Add model.
4. Pick a provider preset.
5. Choose a built-in seed model or fetch the provider model list from the API.
6. Enter the API key and save.
7. The saved model appears in the chat model picker.

The key design rule is simple: the chat picker should show models the user saved, not every possible provider model in the world.

## Modes

| Mode | Default behavior |
|---|---|
| Code | Implements only when the user asks for implementation or file creation. |
| Ask | Explains, compares, and answers without changing files by default. |
| Debug | Investigates failures, reads logs, and proposes or applies fixes. |
| Orchestrator | Breaks broad work into ordered steps and coordinates execution. |
| Plan | Produces implementation plans before code changes. |

## Development

Install dependencies with Bun:

```bash
bun install
```

Run the CLI:

```bash
bun run dev
```

Build and launch the VS Code extension:

```bash
bun run extension
```

Fast launch after a successful build:

```bash
bun run extension -- --no-build
```

Useful checks:

```bash
bun run typecheck
bun run lint
```

Package-scoped tests should be run from the package directory. Do not run root `bun test`; the root test script intentionally exits.

## Extension Launch Notes

On Windows, a previous Extension Development Host can keep `packages/altru-coder-vscode/bin/altru-coder.exe` locked. If the build fails with `EACCES` while removing that file, close the old dev host or stop the stale `altru-coder.exe serve` process, then rerun the extension command.

## Quality Bar

This repo expects production-grade changes:

| Expectation | Meaning |
|---|---|
| Type safety | Run the smallest relevant `typecheck` before declaring work ready. |
| Narrow edits | Keep Altru Coder-specific changes in Altru Coder paths when possible. |
| Local persistence | Extension settings and saved models should work without a remote dashboard. |
| Merge discipline | Shared OpenCode files should be touched only when necessary and marked when required. |
| Real verification | Prefer real implementation tests over mocks. |

## Support

| Channel | Use it for |
|---|---|
| WhatsApp | Setup help, provider configuration, model saving, extension launch help, and community discussion: <https://chat.whatsapp.com/J0XfY7LF9RDDNQN54CQOTY> |
| Email | Direct help and support requests: <altru.coder.ai@gmail.com> |
| Security | Vulnerability reports only; follow `SECURITY.md`. |

## License

MIT. See `LICENSE` for the license text.
