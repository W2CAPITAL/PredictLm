# PredictLM Studio

PredictLM Studio is a hybrid local-first agentic app builder designed to run as a lightweight web IDE on Vercel and scale to a desktop bridge for local models, browser automation, shell tools, media tools and MCP servers.

## Implemented

- Predict Core deterministic offline starter generator (no API key required)
- Puter/Grok provider
- Local model bridge (Ollama / llama.cpp-compatible endpoint)
- Server-side OpenAI-compatible provider through Vercel environment variables
- Multi-file editor + live sandbox preview
- Build, Plan, Review, Research and Media modes
- Second Brain local recall/capture for runs and decisions
- Skills registry for Vercel, browser, media, legal, APK, design and AI bridges
- ZIP export and responsive IDE shell
- Health and agent API routes

## Server provider env vars

```bash
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=...
AI_MODEL=...
```

Secrets are used only server-side in `src/app/api/agent/route.ts`.

## Local AI

Choose **Local model** in the provider switcher and configure an Ollama-compatible endpoint. Vercel cannot access your PC localhost, so local inference is intentionally executed from the user's desktop/browser session.

## Architecture

PredictLM separates the **agent/runtime** from the **model provider**. The studio remains usable with Predict Core when no cloud API or local LLM is configured.
