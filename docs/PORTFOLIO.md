# PredictLM — portfolio brief

## What this project is

PredictLM is presented as two connected engineering stories rather than a catalog of unrelated AI demos:

- **AI + legal intelligence:** Chat, CNJ/DataJud, DJEN, process timelines and dossiers.
- **AI agents + simulation:** a persistent Minecraft-style voxel environment used to benchmark bounded autonomous controllers.

Imagine remains a supporting multimodal surface. Neuro-science, influencer tooling, plugin catalogs and experimental adapters remain in the repository as internal/lab code and are intentionally not part of the primary product navigation.

## 60-second demo

**0–10s — Open the app**

Show the authenticated access gate, enter the demo credential, then open Chat.

Narration:
> "PredictLM is an AI assistant I built around reliable provider routing, legal-data workflows and a Minecraft agent lab."

**10–25s — Legal workflow**

Paste a CNJ process number or open the legal/dossier flow. Show DataJud/DJEN status, the timeline and the dossier output.

Narration:
> "The legal module resolves a CNJ process through official sources, separates evidence from generated analysis and turns the result into a readable timeline and dossier."

**25–40s — Failure recovery**

Ask Chat a technical question. Briefly show the provider/runtime status rather than exposing internal chain-of-thought.

Narration:
> "The chat uses bounded failover: one primary provider and one rescue provider on hard failure, with browser-local fallback where available. Rate limiting and credentials stay server-side."

**40–55s — Minecraft Agent Lab**

Open Minecraft. Switch POV between controllers and show the same persistent world, telemetry and reproducible seed.

Narration:
> "I kept Minecraft because it demonstrates a different engineering problem: persistent world state, agent action contracts, replayable tests and adaptive WebGL rendering."

**55–60s — Close**

Show the CI badge/README validation section.

Narration:
> "The project is covered by automated typecheck, tests, build and export smoke tests."

## Architecture

```text
Browser
  ├─ Chat
  │   ├─ provider router + bounded failover
  │   ├─ research / Build tools
  │   └─ browser-local inference fallback
  ├─ Legal intelligence
  │   ├─ CNJ / DataJud
  │   ├─ DJEN
  │   ├─ timeline + provenance
  │   └─ dossier/report renderer
  ├─ Imagine
  │   └─ provider validation + identity gates
  └─ Minecraft Agent Lab
      ├─ persistent voxel world
      ├─ controller observation → action contract
      ├─ fixed seeds / replay
      └─ adaptive WebGL renderer

Server boundary
  ├─ authenticated deployment access
  ├─ same-origin mutation guard
  ├─ distributed rate-limit RPC when configured
  ├─ DNS-aware anti-SSRF fetch helper
  └─ server-only provider credentials
```

## Engineering points worth discussing in an interview

- Multi-provider failure recovery without multiplying remote calls.
- Why a serverless rate limiter cannot rely only on an in-memory `Map`.
- SSRF protection that resolves DNS and re-validates every redirect.
- Separating legal source evidence from generated interpretation.
- Persistent state and deterministic seeds in a simulation.
- Adaptive render scale and geometry caching in a browser voxel renderer.
- Build/export smoke tests rather than only unit tests.
- Human approval before external social publication.
- Why internal experimental modules are not automatically product features.

## Scope policy

Primary product surfaces:
- Chat
- Jurídico
- Minecraft
- Imagine

Secondary/internal surfaces:
- Library
- Vision utilities
- Plugins/capability catalog
- Neuro-science lab
- Influencer tooling
- experimental provider adapters

The secondary code is retained for reuse and test coverage, but it should not compete with the main product story in the default UI.
