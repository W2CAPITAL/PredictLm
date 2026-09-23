# PredictLM Studio

PredictLM Studio is a hybrid local-first agentic app builder. It combines a lightweight browser IDE with deterministic offline tooling and optional cloud/local AI providers.

## Core capabilities

- **Predict Core** — deterministic starter generation without an API key.
- **Providers** — Puter/Grok, Ollama/llama.cpp-compatible local models, and a server-side OpenAI-compatible provider.
- **Multi-file workspace** — CodeMirror editor, sandbox preview, ZIP export and persistent local state.
- **Visual Inspect** — click rendered DOM elements in the preview and return their tag, classes, text and geometry to the Studio.
- **Knowledge Graph** — maps workspace files and relative imports so the agent can reason about structure before editing.
- **Local Council** — Architecture, Security, Taste/UX, QA and Humanizer reviewers produce a deterministic ship score without model calls.
- **Vibe Security Gate** — scans generated workspace code for hardcoded credentials, client token storage, unsafe HTML/code execution, insecure HTTP, unsafe queries and quality gaps.
- **Research** — optional Firecrawl v2 web/news/image search with sources, kept server-side behind `FIRECRAWL_API_KEY`.
- **Second Brain** — persistent local notes, decisions, runs and saved research.
- **Skill Registry** — research, design, testing, security, Node/full-stack, browser, media, legal, local AI and agent workflows.

## Optional environment variables

### Server AI provider

```bash
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=...
AI_MODEL=...
```

### Research

```bash
FIRECRAWL_API_KEY=fc-...
```

Keys are used only by server routes. PredictLM remains usable without them.

## Local model

Select **Local model** and configure an Ollama-compatible endpoint. Local inference is called from the browser session, so a Vercel deployment cannot magically reach a PC that is offline.

## Review-first workflow

A recommended ship loop is:

```
prompt → plan/build → preview → inspect → graph → council/security → tests → export/deploy
```

The goal is not to vendor dozens of external repositories. PredictLM converts useful patterns into small built-in capabilities or explicit bridges, keeping the web IDE deployable and the desktop/native responsibilities separate.
