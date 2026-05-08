---
title: "Using the Altru Coder Provider"
description: "The built-in Altru Coder provider gives you access to top AI models with one account. Setup and sign-in guide."
sidebar_label: Altru Coder Provider
---

# Using Altru Coder's Built-in Provider

Altru Coder provides its own built-in API provider that gives you access to the latest frontier coding models through a simple registration process. No need to manage API keys from multiple providers - just sign up and start coding.

**Website:** [https://altru-coder.ai/](https://altru-coder.ai/)

## Getting Started

When you sign up for Altru Coder, you can start immediately with free models, or add credits to your account to access premium models.

1. **Sign up:** Complete the registration process
2. **Add credits:** Top up your account at [app.altru-coder.ai](https://app.altru-coder.ai/profile)
3. **Start Coding:** Use 500+ models including the latest frontier coding models

## Registration Process

Altru Coder offers a streamlined registration that connects you directly to frontier coding models:

1. **Start Registration:** Click "Try Altru Coder for Free" in the extension
2. **Sign In:** Use your Google account to sign in at altru-coder.ai
3. **Authorize VS Code:**
   - altru-coder.ai will prompt you to open Visual Studio Code
   - For web-based IDEs, you'll copy the API key manually instead
4. **Complete Setup:** Allow VS Code to open the authorization URL when prompted

<!-- <img src="/img/setting-up/signupflow.gif" alt="Sign up and registration flow with Altru Coder" width="600" /> -->

## Supported Models

Altru Coder provides access to the latest frontier coding models through its built-in provider. The specific models available are automatically updated and managed by the Altru Coder service, ensuring you always have access to the most capable models for coding tasks.

## Altru Coder Gateway integration

Altru Coder routes requests through the Altru Coder Gateway for model access, usage tracking, and organization controls. For BYOK setup, provider routing, and full model availability, use the Gateway docs as the source of truth:

- [Altru Coder Gateway overview](/docs/gateway)
- [Models & Providers](/docs/gateway/models-and-providers)
- [Authentication & BYOK](/docs/gateway/authentication)

## Configuration in Altru Coder

Once you've completed the registration process, Altru Coder is automatically configured:

1. **Automatic Setup:** After successful registration, Altru Coder is ready to use immediately
2. **No API Key Management:** Your authentication is handled seamlessly through the registration process
3. **Model Selection:** Access to frontier models is provided automatically through your Altru Coder account

## Connected Accounts

With the Altru Coder provider, if you sign up with Google you can also connect other sign in accounts - like GitHub - by:

1. Go to your profile
2. Select [**Connected Accounts**](https://app.altru-coder.ai/connected-accounts)
3. Under "Link a New account" select the type of account to link
4. Complete the OAuth authorization, and you'll see your connected accounts!

<!-- <img src="/docs/img/altru-coder-provider/connected-accounts.png" alt="Connect account screen" width="600" /> -->

## Tips and Notes

- **Free Models:** New users can start with free models to explore Altru Coder's capabilities
- **Identity Verification:** The temporary hold system ensures service reliability while preventing misuse
- **Seamless Integration:** No need to manage multiple API keys or provider configurations
- **Latest Models:** Automatic access to the most current frontier coding models
- **Support Available:** Contact [hi@altru-coder.ai](mailto:hi@altru-coder.ai) for questions about pricing or tokens

For detailed setup instructions, see [Setting up Altru Coder](/docs/getting-started/setup-authentication).
