# PredictLM Studio

PredictLM Studio is a local-first agentic app builder designed to remain useful **without API keys and without Ollama**.

## Predict DeepThink v4

The default engine is deterministic and runs in the browser/app runtime. It does not pretend to be a foundation model: it analyzes the request, scores supported intents, extracts functional requirements, chooses a blueprint, generates editable files, wires state/actions, and prepares the project for review.

Supported functional blueprints currently include:

- premium calculator with history, memory, keyboard controls, percent, sign, backspace and theme
- CRM/pipeline
- dashboard
- todo/task manager
- notes workspace
- Pomodoro/timer
- unit converter
- store/cart
- portfolio
- functional landing/generic starter

DeepThink depth can be set to **Fast / Deep / Max**.

## Zero-API features

- Build with Predict DeepThink
- Plan mode
- deterministic Council review
- Vibe Security static gate
- Knowledge Graph
- visual DOM Inspect
- free Research fallback using public Wikipedia, DuckDuckGo and GitHub endpoints
- Browser Lab smoke tests
- Media pre-production: storyboard, launch script and image prompt pack
- project ZIP import/export
- local project clone + restorable snapshots
- searchable skills
- Second Brain memory
- capability self-test endpoint

## Optional providers

External providers are upgrades, not requirements:

- Puter / Grok
- OpenAI-compatible server provider
- Firecrawl for deeper research
- local Ollama/llama.cpp bridge (advanced only)

If an optional AI provider fails and **Automatic fallback** is enabled, PredictLM reruns the task through Predict DeepThink instead of ending with a provider error.

## Optional environment variables

```bash
FIRECRAWL_API_KEY=

AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

Secrets remain server-side.

## Recommended flow

```
prompt
  → DeepThink
  → functional files
  → live preview
  → visual inspect
  → smoke test
  → knowledge graph
  → council/security review
  → snapshot/export
```

## Health/self-test

`GET /api/health` generates a premium calculator through DeepThink and runs the local smoke-test suite against the generated workspace. This validates the zero-API generator path itself.
