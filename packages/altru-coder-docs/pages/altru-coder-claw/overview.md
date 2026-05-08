---
title: "AltruCoderClaw"
description: "One-click deployment of your personal AI agent with OpenClaw"
---

# AltruCoderClaw 🦀

AltruCoderClaw is Altru Coder's hosted [OpenClaw](https://openclaw.ai) service — a one-click deployment that gives you a personal AI agent without the complexity of self-hosting. OpenClaw is a 24/7, open source AI agent that connects to chat platforms like Telegram, Discord, and Slack so it can take real actions automatically, not just chat.

AltruCoderClaw is powered by AltruCoder. The API key is platform-managed, so you never need to bring your own. AltruCoderClaw is currently in **Beta**.

## Why AltruCoderClaw?

- **No infrastructure setup** — Skip Docker, servers, and configuration files
- **Instant provisioning** — Your agent is ready in seconds
- **Powered by AltruCoder** — API key is automatically generated and refreshed
- **Uses existing credits** — Runs on your Altru Coder Gateway balance
- **Multiple free models** — Choose from several models at no additional cost
- **Web UI included** — Access your agent's web interface directly from the dashboard

## Prerequisites

- **Altru Coder account** — Sign up at [altru-coder.ai](https://altru-coder.ai) if you haven't already
- **Model access** — AltruCoderClaw uses **Altru Coder Gateway by default**, which provides access to **500+ AI models** through a single integration.

You can also run AltruCoderClaw using:

- **Your own provider API keys (BYOK)** such as Anthropic, OpenAI, Google, or other supported providers.

## Creating an Instance

1. Navigate to your [Altru Coder profile](https://app.altru-coder.ai/profile)
2. Click **Claw** in the left navigation

{% image src="/docs/img/altru-coder-claw/profile-claw-nav.png" alt="Profile page showing Claw navigation" width="400" caption="Claw navigation in profile sidebar" /%}

3. Click **Create Instance**
4. Your instance will use **Altru Coder Auto Balanced** as the default model. You can optionally select a different model from the dropdown — see all available models at the [Altru Coder Leaderboard](https://altru-coder.ai/leaderboard#all-models).

{% image src="/docs/img/altru-coder-claw/create-instance.png" alt="Create instance modal with model selection" width="600" caption="Model selection during instance creation" /%}

5. Optionally configure chat channels (Telegram, Discord, Slack) — you can also do this later from [Settings](/docs/altru-coder-claw/dashboard#settings)
6. Click **Create & Provision**

Your instance will be provisioned in seconds. Each instance runs on a dedicated machine with 2 shared vCPUs, 3 GB RAM, and a 10 GB persistent SSD. Once created in a region, your instance always runs there.

## Managing Your Instance

The AltruCoderClaw dashboard gives you full control over your instance.

{% image src="/docs/img/altru-coder-claw/instance-dashboard.png" alt="Instance dashboard with controls and status" width="800" caption="Instance management dashboard" /%}

### Controls

- **Start Machine** — Boot a stopped instance (up to 60 seconds)
- **Restart OpenClaw** — Quick restart of just the OpenClaw process; the machine stays up
- **Redeploy** — This will stop the machine, apply any pending image or config updates, and restart it. The machine will be briefly offline.
- **OpenClaw Doctor** — Run diagnostics and auto-fix common issues

For full details on each control and when to use them, see the [Dashboard Reference](/docs/altru-coder-claw/dashboard).

### Changelog

The dashboard shows recent platform updates. Some updates include a deploy hint — either **Redeploy Required** or **Redeploy Suggested** — to let you know when to redeploy your instance.

### Pairing Requests

When you initialize a new channel for the first time, or a new device connects to the Control UI, you'll see a pairing request on the dashboard that you need to approve. See [Pairing Requests](/docs/altru-coder-claw/chat-platforms#pairing-requests) for details.

## Accessing Your Agent

1. Click **Open** on your dashboard to launch the OpenClaw web interface

{% image src="/docs/img/altru-coder-claw/openclaw-dashboard.png" alt="OpenClaw web interface" width="800" caption="OpenClaw web UI" /%}

## Using your OpenClaw Agent

OpenClaw lets you customize your own AI assistant that can actually take action — check your email, manage your calendar, control smart devices, browse the web, and message you on Telegram or Discord when something needs attention. It's like having a personal assistant that runs 24/7, with the skills and access you choose to give it.

### Browser Tool

AltruCoderClaw includes a headless Chromium browser, enabling your agent to browse the web, take screenshots, and automate web interactions using the OpenClaw browser tool. This works out of the box with the "full" tool profile — no additional setup needed.

### Default Tool Profile

New AltruCoderClaw instances deploy with the **full** tool profile by default, giving your agent unrestricted access to all available tools — filesystem operations, shell execution, web search, browser automation, messaging, memory, sub-agents, and more.

For more information on use cases:

- [OpenClaw Showcase](https://docs.openclaw.ai/start/showcase)
- [100 hours of OpenClaw in 35 Minutes](https://www.youtube.com/watch?v=_kZCoW-Qxnc)
- [Clawhub](https://clawhub.ai/): search for skills

## Related

- [Dashboard Reference](/docs/altru-coder-claw/dashboard)
- [Connecting Chat Platforms](/docs/altru-coder-claw/chat-platforms)
- [Troubleshooting](/docs/altru-coder-claw/troubleshooting)
- [AltruCoderClaw Pricing](/docs/altru-coder-claw/faq/pricing)
- [Gateway Usage and Billing](/docs/gateway/usage-and-billing)
- [Agent Manager](/docs/automate/agent-manager)
- [OpenClaw Documentation](https://docs.openclaw.ai)
