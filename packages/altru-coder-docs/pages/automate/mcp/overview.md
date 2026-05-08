---
title: "MCP Overview"
description: "Overview of the Model Context Protocol"
---

# Model Context Protocol (MCP)

The Model Context Protocol (MCP) is a standard for extending Altru Coder's capabilities by connecting to external tools and services. MCP servers provide additional tools and resources that help Altru Coder accomplish tasks beyond its built-in capabilities, such as accessing databases, custom APIs, and specialized functionality.

## MCP Documentation

This documentation is organized into several sections:

- [**Using MCP in Altru Coder**](using-in-altru-coder) - Comprehensive guide to configuring, enabling, and managing MCP servers with Altru Coder. Includes server settings, tool approval, and troubleshooting.

- [**MCP Tool Permissions**](using-in-altru-coder#auto-approve-tools) - Control which MCP tools auto-approve, prompt, or are blocked entirely using the same `allow` / `ask` / `deny` permission system as built-in tools.

- [**What is MCP?**](what-is-mcp) - Clear explanation of the Model Context Protocol, its client-server architecture, and how it enables AI systems to interact with external tools.

- [**STDIO & SSE Transports**](server-transports) - Detailed comparison of local (STDIO) and remote (SSE) transport mechanisms with deployment considerations for each approach.

- [**MCP vs API**](mcp-vs-api) - Analysis of the fundamental distinction between MCP and REST APIs, explaining how they operate at different layers of abstraction for AI systems.

## Contributing to the Marketplace

Have you created an MCP server that others might find useful? Share it with the community by contributing to the [Altru Coder Marketplace](https://github.com/Altru-Coder/altru-marketplace)!

### How to Submit Your MCP Server

1. **Develop your server**: Create an MCP server following the [MCP specification](https://github.com/modelcontextprotocol/)
2. **Test thoroughly**: Ensure your server works correctly with Altru Coder and handles edge cases gracefully
3. **Fork the marketplace repository**: Visit [github.com/Altru-Coder/altru-marketplace](https://github.com/Altru-Coder/altru-marketplace) and create a fork
4. **Add your server**: Include your server configuration and documentation following the repository's structure
5. **Submit a pull request**: Create a PR with a clear description of what your server does and its requirements

### Submission Guidelines

- Document all available tools and resources your server provides
- Include example configurations for both STDIO and SSE transports if applicable
- Specify any required environment variables or API keys
- Note any platform-specific requirements (Windows, macOS, Linux)
- Follow the [contribution guidelines](https://github.com/Altru-Coder/altru-marketplace/blob/main/CONTRIBUTING.md) in the marketplace repository

For more details on contributing to Altru Coder, see the [Contributing Guide](/docs/contributing).
