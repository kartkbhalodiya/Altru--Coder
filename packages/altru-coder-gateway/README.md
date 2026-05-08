# @altru-coder/altru-coder-gateway

Unified Altru Coder Gateway package for OpenCode providing authentication, AI provider integration, and API access.

## Features

- **Authentication**: Device authorization flow for Altru Coder Gateway
- **AI Provider**: OpenRouter-based provider with Altru Coder Gateway integration
- **API Integration**: Profile, balance, and model management
- **TUI Helpers**: Utilities for terminal UI components

## Installation

```bash
bun add @altru-coder/altru-coder-gateway
```

## Usage

### Plugin Registration

```typescript
import { AltruCoderAuthPlugin } from "@altru-coder/altru-coder-gateway"

// Register with OpenCode
const plugins = [AltruCoderAuthPlugin]
```

### Provider Usage

```typescript
import { createAltruCoder } from "@altru-coder/altru-coder-gateway"

const provider = createAltruCoder({
  altrucoderToken: process.env.ALTRUCODER_API_KEY,
  altrucoderOrganizationId: "org-123",
})

const model = provider.languageModel("anthropic/claude-sonnet-4")
```

### API Access

```typescript
import { fetchProfile, fetchBalance } from "@altru-coder/altru-coder-gateway"

const profile = await fetchProfile(token)
const balance = await fetchBalance(token)
```

## License

MIT
