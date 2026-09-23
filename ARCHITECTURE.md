# PredictLM Studio architecture

## Layers

1. **Studio shell** — editor, preview, agent, explorer, skills, memory, media, connectors.
2. **Agent layer** — task mode, context assembly, approval-friendly multi-file outputs, run log.
3. **Second Brain** — recall/capture in local persistent state; no secrets.
4. **Provider layer** — Predict Core, Puter, local model bridge, server OpenAI-compatible provider.
5. **Skill registry** — capabilities are metadata + adapters, not copied repositories.
6. **Bridges** — browser automation, shell, DaVinci, APK inspection, llama.cpp/Bonsai and other native tools belong in a desktop/MCP bridge.
7. **Deployment** — Next.js on Vercel for web; local bridge for capabilities Vercel cannot safely/technically provide.

## Design principles

- Local-first by default.
- No API key is mandatory.
- Cloud secrets stay server-side.
- External repositories are inspirations/adapters; code is not vendored blindly.
- Heavy model inference stays off Vercel Functions.
- Native tools require an explicit desktop bridge.
