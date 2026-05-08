---
title: "Installation"
description: "How to install Altru Coder on your system"
---

# Installation

Get started with Altru Coder by installing it on your preferred platform. Choose your development environment below:

## Choose Your Platform

{% tabs %}
{% tab label="VS Code" %}

## VS Code Extension

The current Altru Coder extension is built on the [Altru Coder CLI](https://github.com/Altru-Coder/altrucoder) and is distributed as the **pre-release version** on the VS Code Marketplace.

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Altru Coder"
4. Click the dropdown arrow next to **Install** and select **Install Pre-Release Version**

{% callout type="info" %}
The "pre-release" label is a VS Code Marketplace distribution channel — the extension is stable and recommended for all users.
{% /callout %}

{% /tab %}
{% tab label="CLI" %}

## Command Line Interface

{% partial file="install-cli.md" /%}

{% /tab %}
{% tab label="VS Code (Legacy)" %}

## VS Code Legacy Extension

The legacy extension is the previous version of Altru Coder for VS Code. It is still available but is no longer actively developed. We recommend installing the current extension (see the **VS Code** tab).

To install or switch back to the legacy version:

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Altru Coder"
4. Click the dropdown arrow next to **Install** and select **Switch to Release Version**

{% /tab %}
{% tab label="JetBrains" %}

## JetBrains IDEs

{% partial file="install-jetbrains.md" /%}

{% /tab %}
{% tab label="Slack" %}

## Slack Integration

{% partial file="install-slack.md" /%}

{% /tab %}
{% tab label="Other IDEs" %}

{% partial file="install-other-ides.md" /%}

{% /tab %}
{% /tabs %}

## Manual Installations

### Open VSX Registry

[Open VSX Registry](https://open-vsx.org/) is an open-source alternative to the VS Code Marketplace for VS Code-compatible editors that cannot access the official marketplace due to licensing restrictions.

For VS Code-compatible editors like VSCodium, Gitpod, Eclipse Theia, and Windsurf, you can browse and install directly from the [Altru Coder page on Open VSX Registry](https://open-vsx.org/extension/altrucoder/Altru-Coder).

1. Open your editor
2. Access the Extensions view (Side Bar icon or `Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Your editor should be pre-configured to use Open VSX Registry
4. Search for "Altru Coder"
5. Select "Altru Coder" and click **Install**
6. Reload the editor if prompted

{% callout type="note" %}
If your editor isn't automatically configured for Open VSX Registry, you may need to set it as your extension marketplace in settings. Consult your specific editor's documentation for instructions.
{% /callout %}

### Via VSIX

If you prefer to download and install the VSIX file directly:

1. **Download the VSIX file:**
   - Find official releases on the [Altru Coder GitHub Releases page](https://github.com/Altru-Coder/altrucoder/releases)
   - Download the `.vsix` file from the [latest release](https://github.com/Altru-Coder/altrucoder/releases/latest)

2. **Install in VS Code:**
   - Open VS Code
   - Access Extensions view
   - Click the "..." menu in the Extensions view
   - Select "Install from VSIX..."
   - Browse to and select your downloaded `.vsix` file

If you need to temporarily go back to an earlier version, use the same flow with a `.vsix` asset from an older release:

1. Open the [Altru Coder GitHub Releases page](https://github.com/Altru-Coder/altrucoder/releases)
2. Pick the release you want to stay on and download its VS Code `.vsix` asset
3. In VS Code, open Extensions, click the "..." menu, and select "Install from VSIX..."
4. Choose the downloaded `.vsix` file to install that version

If you plan to remain on that version for a while, you may also want to temporarily disable extension auto-update in VS Code so it does not immediately update again.

{% image src="/docs/img/installing-vsix.png" alt="Installing Altru Coder using VS Code's Install from VSIX dialog" width="600px" caption="Installing Altru Coder using VS Code's \"Install from VSIX\" dialog" /%}

## Troubleshooting

**Extension Not Visible**

- Restart VS Code
- Verify Altru Coder is listed and enabled in Extensions
- Try disabling and re-enabling the extension in Extensions
- Check Output panel for errors (View → Output, select "Altru Coder")

**Installation Problems**

- Ensure stable internet connection
- Verify VS Code version 1.84.0 or later
- If VS Code Marketplace is inaccessible, try the Open VSX Registry method

**Windows Users**

- Ensure that **`PowerShell` is added to your `PATH`**:
  1. Open **Edit system environment variables** → **Environment Variables**
  2. Under **System variables**, select **Path** → **Edit** → **New**
  3. Add: `C:\Windows\System32\WindowsPowerShell\v1.0\`
  4. Click **OK** and restart VS Code

## Next Steps

After installation, check out these resources to get started:

- [Quickstart Guide](/docs/getting-started/quickstart) - Get up and running in minutes
- [Setting Up Authentication](/docs/getting-started/setup-authentication) - Configure your AI provider
- [Your First Task](/docs/code-with-ai/agents/chat-interface) - Learn the basics of working with Altru Coder

## Getting Support

If you encounter issues not covered here:

- Join our [Discord community](https://altru-coder.ai/discord) for real-time support
- Submit issues on [GitHub](https://github.com/Altru-Coder/altrucoder/issues)
- Visit our [Reddit community](https://www.reddit.com/r/AltruCoder)
