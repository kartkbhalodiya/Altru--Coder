# Altru Coder GitHub Action

A GitHub Action that integrates [Altru Coder AI](https://altru-coder.ai) directly into your GitHub workflow.

Mention `/altru` or `/kc` in your comment, and Altru Coder will execute tasks within your GitHub Actions runner.

## Features

#### Explain an issue

Leave the following comment on a GitHub issue. Altru Coder will read the entire thread, including all comments, and reply with a clear explanation.

```
/altru explain this issue
```

#### Fix an issue

Leave the following comment on a GitHub issue. Altru Coder will create a new branch, implement the changes, and open a PR with the changes.

```
/altru fix this
```

#### Review PRs and make changes

Leave the following comment on a GitHub PR. Altru Coder will implement the requested change and commit it to the same PR.

```
Delete the attachment from S3 when the note is removed /kc
```

#### Review specific code lines

Leave a comment directly on code lines in the PR's "Files" tab. Altru Coder will automatically detect the file, line numbers, and diff context to provide precise responses.

```
[Comment on specific lines in Files tab]
/kc add error handling here
```

When commenting on specific lines, Altru Coder receives:

- The exact file being reviewed
- The specific lines of code
- The surrounding diff context
- Line number information

This allows for more targeted requests without needing to specify file paths or line numbers manually.

## Installation

Run the following command in the terminal from your GitHub repo:

```bash
altru-coder github install
```

This will walk you through installing the AltruCoderConnect GitHub app, creating the workflow, and setting up secrets.

### Manual Setup

1. Install the AltruCoderConnect GitHub app at https://github.com/apps/altruconnect. Make sure it is installed on the target repository.

2. Add the following workflow file to `.github/workflows/altru.yml` in your repo. Set the appropriate `model` and required API keys.

   ```yml
   name: altru-coder

   on:
     issue_comment:
       types: [created]
     pull_request_review_comment:
       types: [created]

   jobs:
     altru-coder:
       if: |
         contains(github.event.comment.body, '/kc') ||
         contains(github.event.comment.body, '/altru')
       runs-on: ubuntu-latest
       permissions:
         id-token: write
         contents: write
         pull-requests: write
         issues: write
       steps:
         - name: Checkout repository
           uses: actions/checkout@v6
           with:
             persist-credentials: false

         - name: Run Altru Coder
           uses: Altru-Coder/altrucoder/github@latest
           with:
             model: altru-coder/claude-sonnet-4-20250514
             altru_coder_api_key: ${{ secrets.ALTRU_CODER_API_KEY }}
             altru_coder_org_id: ${{ secrets.ALTRU_CODER_ORG_ID }}
   ```

3. Store the API keys in secrets. In your organization or project **settings**, expand **Secrets and variables** on the left and select **Actions**. Add `ALTRU_CODER_API_KEY` and `ALTRU_CODER_ORG_ID`.

## Configuration

### Inputs

- `model` (required) - The AI model to use (e.g., `altru-coder/claude-sonnet-4-20250514`)
- `altru_coder_api_key` (optional) - Altru Coder API key for gateway authentication
- `altru_coder_org_id` (optional) - Altru Coder organization ID
- `agent` (optional) - Agent to use. Must be a primary agent.
- `share` (optional) - Share the Altru Coder session (defaults to true for public repos)
- `prompt` (optional) - Custom prompt to override the default prompt
- `mentions` (optional) - Comma-separated list of trigger phrases (defaults to `/altru,/kc`)
- `use_github_token` (optional) - Use GITHUB_TOKEN directly instead of Altru Coder App token exchange (defaults to `false`)
- `oidc_base_url` (optional) - Base URL for OIDC token exchange API (defaults to `https://api.altru-coder.ai`)

### Using Other Providers

You can also use other AI providers by setting their API keys:

```yml
- name: Run Altru Coder
  uses: Altru-Coder/altrucoder/github@latest
  with:
    model: anthropic/claude-sonnet-4-20250514
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Support

If you encounter issues or have feedback, please create an issue at https://github.com/Altru-Coder/altrucoder/issues.

## Development

This directory contains the composite GitHub Action definition. The actual implementation is in the Altru Coder CLI (`packages/opencode/src/cli/cmd/github.ts`).

To test locally, see the main [AGENTS.md](../AGENTS.md) for development instructions.
