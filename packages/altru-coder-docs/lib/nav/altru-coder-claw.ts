import { NavSection } from "../types"

export const AltruCoderClawNav: NavSection[] = [
  {
    title: "AltruCoderClaw",
    links: [
      { href: "/altru-coder-claw/overview", children: "Overview" },
      { href: "/altru-coder-claw/dashboard", children: "Dashboard" },
      { href: "/altru-coder-claw/pre-installed-software", children: "Pre-installed Software" },
      { href: "/altru-coder-claw/end-to-end", children: "End to End Config" },
      {
        href: "/altru-coder-claw/control-ui/overview",
        children: "Control UI",
        subLinks: [
          { href: "/altru-coder-claw/control-ui/overview", children: "Overview" },
          { href: "/altru-coder-claw/control-ui/changing-models", children: "Changing Models" },
          { href: "/altru-coder-claw/control-ui/exec-approvals", children: "Exec Approvals" },
          { href: "/altru-coder-claw/control-ui/version-pinning", children: "Version Pinning" },
        ],
      },
      {
        href: "/altru-coder-claw/chat-platforms",
        children: "Chat Platforms",
        subLinks: [
          { href: "/altru-coder-claw/chat-platforms", children: "Overview" },
          { href: "/altru-coder-claw/chat-platforms/telegram", children: "Telegram" },
          { href: "/altru-coder-claw/chat-platforms/discord", children: "Discord" },
          { href: "/altru-coder-claw/chat-platforms/slack", children: "Slack" },
        ],
      },
      {
        href: "/altru-coder-claw/development-tools",
        children: "Development Tools",
        subLinks: [
          { href: "/altru-coder-claw/development-tools", children: "Overview" },
          { href: "/altru-coder-claw/development-tools/github", children: "GitHub" },
          { href: "/altru-coder-claw/development-tools/google", children: "Google Workspace" },
        ],
      },
      {
        href: "/altru-coder-claw/triggers",
        children: "Triggers",
        subLinks: [
          { href: "/altru-coder-claw/triggers", children: "Overview" },
          { href: "/altru-coder-claw/triggers/webhooks", children: "Webhooks" },
          { href: "/altru-coder-claw/triggers/scheduled", children: "Scheduled" },
        ],
      },
      {
        href: "/altru-coder-claw/tools",
        children: "Tools",
        subLinks: [
          { href: "/altru-coder-claw/tools", children: "Overview" },
          { href: "/altru-coder-claw/tools/1password", children: "1Password" },
          { href: "/altru-coder-claw/tools/brave-search", children: "Brave Search" },
          { href: "/altru-coder-claw/tools/agentcard", children: "AgentCard" },
          { href: "/altru-coder-claw/tools/other-tools", children: "Other Tools" },
        ],
      },
      {
        href: "/altru-coder-claw/troubleshooting/common-questions",
        children: "Troubleshooting",
        subLinks: [
          { href: "/altru-coder-claw/troubleshooting/common-questions", children: "Common Questions" },
          { href: "/altru-coder-claw/troubleshooting/gateway-process", children: "Gateway Process States" },
          { href: "/altru-coder-claw/troubleshooting/architecture", children: "Architecture Notes" },
        ],
      },
      {
        href: "/altru-coder-claw/faq/general",
        children: "FAQ",
        subLinks: [
          { href: "/altru-coder-claw/faq/general", children: "General" },
          { href: "/altru-coder-claw/faq/pricing", children: "Pricing" },
        ],
      },
    ],
  },
]
