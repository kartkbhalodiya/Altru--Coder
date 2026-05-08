---
title: "Integrations"
description: "Overview of Altru Coder integrations"
---

# Altru Coder Integrations

Altru Coder Integrations lets you connect your GitHub or GitLab account (soon Bitbucket) to enable advanced features inside Altru Coder. Once connected, Altru Coder can access your repositories securely, enabling features like **Code Reviews**, **Cloud Agents**, and **Altru Coder Deploy**.

## Supported Platforms

| Platform | Integration Type | Details |
|---|---|---|
| GitHub | GitHub App | [GitHub Setup](#connecting-github) |
| GitLab | OAuth or PAT | [GitLab Setup](#connecting-gitlab) |

## What You Can Do With Integrations

- **Connect GitHub or GitLab to Altru Coder** in a few clicks
- **Enable advanced features** like Cloud Agents, Code Reviews, and Altru Coder Deploy
- **Authorize repository access** so Altru Coder can analyze and work with your code

## Prerequisites

Before connecting:

- You must have a **GitHub** or **GitLab** account.
- For GitHub: You need permission to install GitHub Apps for the repositories you want Altru Coder to access.
- For GitLab: You need **Maintainer** role (or higher) on the projects you want to connect.
- (Optional) If you're connecting an organization, you must be an admin or have app installation permissions.

---

## Connecting GitHub

### 1. Open the Integrations Page

Go to your **Personal** or **Organization Dashboard**, and navigate to the [Integrations](https://app.altru-coder.ai/integrations) tab.

### 2. Start the Connection Flow

1. Click **Configure** on the GitHub panel.
2. You'll be redirected to GitHub to authorize the **AltruCoderConnect** App.
3. Select the GitHub account or organization you want to connect.

### 3. Choose Repository Access

GitHub will ask which repositories you want Altru Coder to access:

- **All repositories** (recommended if you plan to use Cloud Agents or Deploy across multiple projects)
- **Only selected repositories** (choose specific repos)

Click **Install & Authorize** to continue.

### 4. Complete Authorization

Once approved:

- You'll return to the Altru Coder Integrations page.
- GitHub will show a **Connected** status.
- Your Altru Coder workspace can now access GitHub repositories securely.

---

## Connecting GitLab

You can connect GitLab using **OAuth** or a **Personal Access Token (PAT)**. Both **GitLab.com** and **self-hosted GitLab instances** are supported.

{% tabs %}
{% tab label="OAuth (GitLab.com)" %}

1. Go to the **Integrations** page:
   - **Personal**: [app.altru-coder.ai/integrations/gitlab](https://app.altru-coder.ai/integrations/gitlab)
   - **Organization**: Your organization → Integrations → GitLab
2. Click **Connect GitLab**
3. Authorize the application on GitLab
4. You'll be redirected back to Altru Coder with the connection active

{% /tab %}
{% tab label="OAuth (Self-Hosted)" %}

For self-hosted GitLab instances using OAuth, you need to register an OAuth application first:

1. In your GitLab instance, go to **Admin Area → Applications** (or **User Settings → Applications**)
2. Create a new application:
   - **Name**: `Altru Coder`
   - **Redirect URI**: `https://app.altru-coder.ai/api/integrations/gitlab/callback`
   - **Scopes**: `api`, `read_user`, `read_repository`, `write_repository`
   - **Confidential**: Yes
3. Copy the **Application ID** and **Secret**
4. In Altru Coder, go to the GitLab integration page
5. Enter your **Instance URL**, **Client ID**, and **Client Secret**
6. Click **Connect** and authorize

{% /tab %}
{% tab label="Personal Access Token" %}

1. In GitLab, go to **User Settings → Access Tokens**
2. Create a token with the `api` scope
3. Copy the token
4. In Altru Coder, go to the GitLab integration page
5. Paste the token (and enter your Instance URL for self-hosted)
6. Click **Connect**

> PAT tokens cannot be refreshed automatically. When your token expires, create a new one in GitLab and reconnect in Altru Coder.

{% /tab %}
{% /tabs %}

---

## What Happens After Connecting

Once your Git provider is connected, the following features are enabled in Altru Coder:

### Cloud Agents

- Run Altru Coder in the cloud from any device
- Auto-create branches and push work continuously
- Work from anywhere while keeping your repo in sync

### Code Reviews

- Automated AI review on every pull request or merge request
- Consistent feedback based on your team's standards
- See the [Code Reviews guide](/docs/automate/code-reviews/overview) for setup

### Altru Coder Deploy

- Deploy Next.js 14 & 15 apps directly from Altru Coder
- Trigger rebuilds automatically on push
- Manage deployment logs and history

### Upcoming:

- **Bitbucket Integration**

---

## Managing or Removing the Integration

### GitHub

From the **Integrations** page, click "Manage on GitHub" to:

- View the GitHub account you connected
- Update which repositories Altru Coder has access to
- Disconnect GitHub entirely
- Reauthorize the app if permissions change

### GitLab

From the **Integrations** page:

- Click **Disconnect** to remove the GitLab connection
- Your tokens are cleared, but webhook configuration is preserved so reconnecting restores your setup

> Disconnecting from Altru Coder does not revoke OAuth tokens on GitLab's side. You can manually revoke them from **GitLab → User Settings → Applications → Authorized Applications**.

---

## Troubleshooting

### GitHub

**"I don't see my repositories."**
Ensure the AltruCoderConnect App is installed for the correct GitHub org and that repo access includes the repositories you need.

**"My organization blocks third-party apps."**
You may need an admin to approve installing GitHub Apps.

**"Cloud Agents or Deploy can't access my repo."**
Revisit the GitHub app settings and confirm the app has the correct repo scope.

### GitLab

**"No projects listed after connecting."**
Click the refresh button to sync projects from GitLab. Ensure your GitLab account has access to the projects you expect.

**"Permission denied" errors.**
You need **Maintainer role** on the GitLab project for webhook and bot token creation.

**"Token expired."**

- **OAuth**: Tokens refresh automatically. If refresh fails, reconnect from the integration page.
- **PAT**: Create a new token in GitLab and reconnect in Altru Coder.

**"Self-hosted connection issues."**

- Verify your instance URL is accessible from the internet
- Ensure HTTPS is configured
- Check that OAuth application scopes include all required scopes
- Verify the redirect URI matches: `https://app.altru-coder.ai/api/integrations/gitlab/callback`
