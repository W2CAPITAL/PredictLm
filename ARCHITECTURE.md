# PredictLM Studio architecture

## Layers

1. **Studio shell** — agent, explorer, research, council, graph, skills, memory, browser/media/connectors and runtime settings.
2. **Workspace model** — persistent local files, messages, runs and memory notes.
3. **Agent layer** — Build, Plan, Review, Research and Media modes.
4. **Predict Core** — deterministic offline generation and review paths.
5. **Provider layer** — Puter, local Ollama/llama.cpp-compatible endpoints and server-side OpenAI-compatible providers.
6. **Knowledge layer** — file/import graph inspired by codebase-understanding tools.
7. **Quality layer** — static security audit + local council (architecture, security, taste, QA, humanizer).
8. **Visual layer** — sandbox preview with an opt-in DOM inspect bridge.
9. **Research layer** — server-side Firecrawl v2 search with web/news/image sources.
10. **Skill registry** — capabilities are metadata + adapters, not blindly copied repositories.
11. **Native bridges** — browser automation, shell, DaVinci, APK inspection, local model runtimes and other desktop tools stay outside Vercel Functions.
12. **Delivery** — GitHub CI validates production builds; Vercel remains the preferred web deployment target.

## Security boundaries

- Cloud API keys remain server-side.
- The preview runs in a sandboxed iframe.
- Inspect mode returns only lightweight DOM metadata to the parent Studio.
- Research sources are treated as untrusted external content.
- The static gate detects common vibe-coded security mistakes before ship.
- External provider compatibility never implies bypassing authentication, subscriptions or access controls.

## Design principles

- Local-first and useful without an API key.
- Review before ship.
- No fake buttons for unavailable integrations.
- Explicit bridges for native capabilities.
- Small deterministic tools before expensive model calls.
- Preserve human control over generated changes.
