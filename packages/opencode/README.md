# Altru Coder CLI

The AI coding agent built for the terminal. Generate code from natural language, automate tasks, and run terminal commands -- powered by 500+ AI models.

## Install

```bash
npm install -g @altru-coder/cli
```

Or run directly with npx:

```bash
npx --package @altru-coder/cli altru-coder
```

## Getting Started

Run `altru-coder` in any project directory to launch the interactive TUI:

```bash
altru-coder
```

Run a one-off task:

```bash
altru-coder run "add input validation to the signup form"
```

## Features

- **Code generation** -- describe what you want in natural language
- **Terminal commands** -- the agent can run shell commands on your behalf
- **500+ AI models** -- use models from OpenAI, Anthropic, Google, and more
- **MCP servers** -- extend agent capabilities with the Model Context Protocol
- **Multiple modes** -- Plan with Architect, code with Coder, debug with Debugger, or create your own
- **Sessions** -- resume previous conversations and export transcripts
- **API keys optional** -- bring your own keys or use Altru Coder credits

## Commands

| Command               | Description                |
| --------------------- | -------------------------- |
| `altru-coder`                | Launch interactive TUI     |
| `altru-coder run "<task>"`   | Run a one-off task         |
| `altru-coder auth`           | Manage authentication      |
| `altru-coder models`         | List available models      |
| `altru-coder mcp`            | Manage MCP servers         |
| `altru-coder session list`   | List sessions              |
| `altru-coder session delete` | Delete a session           |
| `altru-coder export`         | Export session transcripts |

Run `altru-coder --help` for the full list.

## Alternative Installation

### Homebrew (macOS/Linux)

```bash
brew install Altru-Coder/tap/altru
```

### GitHub Releases

Download pre-built binaries from the [Releases page](https://github.com/Altru-Coder/altrucoder/releases).

## Documentation

- [Docs](https://altru-coder.ai/docs)
- [Getting Started](https://altru-coder.ai/docs/getting-started)

## Links

- [GitHub](https://github.com/Altru-Coder/altrucoder)
- [Discord](https://altru-coder.ai/discord)
- [VS Code Extension](https://altru-coder.ai/vscode-marketplace)
- [Website](https://altru-coder.ai)

## License

MIT
