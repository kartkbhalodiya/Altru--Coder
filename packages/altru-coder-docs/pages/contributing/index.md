---
title: "Contributing"
description: "Contribute to Altru Coder"
---

# Contributing Overview

{% callout type="info" %}
**New versions of the VS Code extension and CLI are being developed in [Altru-Coder/altrucoder](https://github.com/Altru-Coder/altrucoder)** (extension at `packages/altru-coder-vscode`, CLI at `packages/opencode`). If you're looking to contribute to the extension or CLI, please head over to that repository.
{% /callout %}

Altru Coder is an open-source project that welcomes contributions from developers of all skill levels. This guide will help you get started with contributing to Altru Coder, whether you're fixing bugs, adding features, improving documentation, or sharing custom modes.

## Ways to Contribute

There are many ways to contribute to Altru Coder:

1. **Code Contributions**: Implement new features or fix bugs
2. **Documentation**: Improve existing docs or create new guides
3. **Marketplace Contributions**: Create and share custom modes, skills, and MCP servers via the [Altru Coder Marketplace](https://github.com/Altru-Coder/altru-marketplace)
4. **Bug Reports**: Report issues you encounter
5. **Feature Requests**: Suggest new features or improvements
6. **Community Support**: Help other users in the community

## Setting Up the Development Environment

Setting Up the Development Environment is described in details on the [Development Environment](/docs/contributing/development-environment) page.

## Understanding the Architecture

Before diving into the code, we recommend reviewing the [Architecture Overview](/docs/contributing/architecture) to understand how the different components of Altru Coder fit together.

## Development Workflow

### Branching Strategy

- Create a new branch for each feature or bugfix
- Use descriptive branch names (e.g., `feature/new-tool-support` or `fix/browser-action-bug`)
- **For documentation only changes**: Use the `docs/` prefix (e.g., `docs/improve-mcp-guide`)

```bash
git checkout -b your-branch-name

# For documentation changes:
git checkout -b docs/your-change-description
```

### Coding Standards

- Follow the existing code style and patterns
- Use TypeScript for new code
- Include appropriate tests for new features
- Update documentation for any user-facing changes

### Commit Guidelines

- Write clear, concise commit messages
- Reference issue numbers when applicable
- Keep commits focused on a single change

### Changesets

User-facing changes (features, fixes, breaking changes) require a changeset file so the update shows up in the next release notes. Run the interactive tool, or create the file by hand:

```bash
bunx changeset add
```

Or create `.changeset/<slug>.md` manually:

```md
---
"altru-coder": minor
---

Short description of the change for the changelog.
```

Guidelines:

- Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes.
- Descriptions are read by end users in release notes — keep them concise and feature-oriented. Describe **what changed from the user's perspective**, not implementation details.
- Write in imperative mood (e.g. "Support exporting conversations as markdown" rather than "Add a new export handler that serializes session messages to .md files").
- Changesets are consumed at release time by the `publish.yml` workflow, which generates changelog entries for the GitHub release notes.

Skip the changeset only for internal refactors, CI tweaks, test-only changes, or docs that do not affect users.

### Testing Your Changes

- Run the test suite:
  ```bash
  npm test
  ```
- Manually test your changes in the development extension

### Creating a Pull Request

1. Push your changes to your fork:

   ```bash
   git push origin your-branch-name
   ```

2. Go to the [Altru Coder repository](https://github.com/Altru-Coder/altrucoder)

3. Click "New Pull Request" and select "compare across forks"

4. Select your fork and branch

5. Fill out the PR template with:
   - A clear description of the changes
   - Any related issues
   - Testing steps
   - Screenshots (if applicable)

## Contributing to the Altru Coder Marketplace

The [Altru Coder Marketplace](https://github.com/Altru-Coder/altru-marketplace) is a community-driven repository of agent tooling that extends Altru Coder's capabilities. You can contribute:

- **Skills**: Modular workflows and domain expertise that teach agents how to perform specific tasks
- **MCP Servers**: Standardized integrations that connect agents to external tools and services
- **Modes**: Custom agent personalities and behaviors with tailored tool access

To contribute:

1. Follow the documentation for [Custom Modes](/docs/customize/custom-modes), [Skills](/docs/customize/skills), or [MCP Servers](/docs/automate/mcp/overview) to create your resource

2. Test your contribution thoroughly

3. Submit a pull request to the [Altru Coder Marketplace repository](https://github.com/Altru-Coder/altru-marketplace)

## Engineering Specs

For larger features, we write engineering specs to align on requirements before implementation. Check out the [Architecture](/docs/contributing/architecture) section to see planned features and learn how to contribute specs.

## Documentation Contributions

Documentation improvements are highly valued contributions:

1. Follow the documentation style guide:
   - Use clear, concise language
   - Include examples where appropriate
   - Use absolute paths starting from `/docs/` for internal links (except within the same directory)
   - Don't include `.md` extensions in links

2. Test your documentation changes by running the docs site locally:

   ```bash
   cd packages/altru-coder-docs
   pnpm install
   pnpm dev
   ```

3. Submit a PR with your documentation changes

## Community Guidelines

When participating in the Altru Coder community:

- Be respectful and inclusive
- Provide constructive feedback
- Help newcomers get started
- Follow the [Code of Conduct](https://github.com/Altru-Coder/altrucoder/blob/main/CODE_OF_CONDUCT.md)

## Getting Help

If you need help with your contribution:

- Join our [Discord community](https://altru-coder.ai/discord) for real-time support
- Ask questions on [GitHub Discussions](https://github.com/Altru-Coder/altrucoder/discussions)
- Visit our [Reddit community](https://www.reddit.com/r/altrucoder)

## Recognition

All contributors are valued members of the Altru Coder community. Contributors are recognized in:

- Release notes
- The project's README
- The contributors list on GitHub

Thank you for contributing to Altru Coder and helping make AI-powered coding assistance better for everyone!
