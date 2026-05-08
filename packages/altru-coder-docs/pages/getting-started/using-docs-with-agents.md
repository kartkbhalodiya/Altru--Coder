---
title: "Using Altru Coder Docs with Agents"
description: "Access the full Altru Coder documentation in machine-readable formats for LLMs and AI agents"
---

# Using Altru Coder Docs with Agents

You can access the full text of the Altru Coder documentation in machine-readable formats suitable for LLMs and AI agents. This is useful when you want an AI assistant to reference Altru Coder's documentation while helping you with a task.

## Full documentation

The complete documentation is available as a single text file at:

```
https://altru-coder.ai/docs/llms.txt
```

This file contains the full content of every page in the Altru Coder docs, formatted for easy consumption by language models.

## Individual pages

You can also fetch any individual documentation page as raw Markdown via the API:

```
https://altru-coder.ai/docs/api/raw-markdown?path=<url-encoded-path>
```

For example, to fetch the "Code with AI" overview page:

```
https://altru-coder.ai/docs/api/raw-markdown?path=%2Fcode-with-ai
```

The `path` parameter should be the URL-encoded path of the documentation page, without the `/docs` prefix.
