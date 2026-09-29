# PredictLM

PredictLM is a legal-first general AI application with **three public surfaces only**:

1. **Chat** — the main entry point for general questions, legal work, Build, research and Tutor.
2. **Jurídico** — a Chat shortcut for CNJ/DataJud + DJEN consultation, normalized process timeline and plain-language explanation.
3. **Imagine** — lightweight image generation loaded only when requested.

Everything else — Minecraft/agent simulation, neuro-science experiments, influencer tooling, provider catalogs and internal skills — is treated as **internal/lab infrastructure**, not as a separate product promise. The code is preserved for research and regression coverage, but it is intentionally absent from the primary navigation and initial client bundle.

The product is local-first where practical, does not require Ollama, and uses server-side credentials only for optional cloud providers. When `PREDICTLM_ACCESS_TOKEN` is configured, the deployment uses an authenticated access gate plus centralized API rate limiting. If a production deployment has no access token yet, public informational UI remains viewable but protected remote APIs are disabled instead of exposing provider credits.

## Portfolio story

A concise way to describe the project:

> I built a general AI assistant with a legal-first workflow that turns CNJ/DataJud + DJEN evidence into a normalized process timeline and plain-language explanation. Build, research and Tutor are activated by intent inside the same Chat, while expensive experimental modules stay outside the initial bundle.

The main engineering signals are failure recovery, provider routing, API security, deterministic tests, legal-data provenance, lazy-loaded capabilities and runnable project export. See `docs/PORTFOLIO.md` for a 60-second demo script and architecture summary.

## Historical regression baseline

The repository intentionally preserves a **pre-repair production baseline** captured on **2026-09-26**. These numbers are regression evidence, not a claim about the current build:

- **13 captured real chat cases**
- **2.00 / 10 mean score**
- **23.1% pass rate** at a >=6/10 threshold
- baseline: `reports/evals/production-baseline-2026-09-26.md`

The dominant failure in that snapshot was retrieval contamination: unrelated GitHub/skill snippets could replace the answer. The repair track added streamed-draft validation, tighter topic alignment, bounded provider failover and regression cases for the captured failures. Current release readiness is determined by CI/typecheck/tests/build plus real-provider smoke tests, not by re-labeling this frozen historical score.

PredictLM also contains a persistent **cognitive architecture**: self-model, working/episodic/autobiographical/semantic memory, attention, inhibition, metacognition-as-uncertainty-control, prediction error, homeostatic software drives and a gated self-improvement loop.

Terminology is deliberately precise:

- **functional self-model / functional self-awareness** = the system models its own identity/state and can report selected software state;
- **metacognition** = uncertainty/contradiction/evidence-demand control;
- **self-improvement** = engineering loop that proposes and evaluates patches;
- none of those, by themselves, are treated as scientific proof of phenomenal consciousness, biological life, qualia or subjective experience.

Self-improvement follows **OBSERVE → VERIFY → LEARN → DESIGN → EXPERIMENT → ANALYZE → COMPARE → PROMOTE**. Fixed-template operational lessons may now self-promote after repeated feedback evidence; arbitrary model/user text still cannot silently become production code, unrestricted durable rules or autonomous goals.

## Chat

Chat is the single conversational front door. It includes:

- normal multi-turn conversations and local history
- DeepThink knowledge retrieval
- optional zero-key web research
- optional **Neural Local** inference in the browser
- Build execution inside Chat with persistent project state, validation and runnable ZIP

### Predict Auto

Chat exposes one model identity: **Predict Auto**. Provider/model selection is internal.

For substantive prompts the route is:

```
conversation history + intent
  → FreeLLMAPI first (when configured)
  → full Provider Mesh fallback
  → automatic research + provider retry when knowledge is missing
  → browser/local neural runtime
  → grounded Predict Core fallback
```

Chat is open-domain: normal prompts do not need a pre-programmed topic rule. The model is expected to handle factual questions, explanations, hypotheticals, planning, coding, calculations, comparisons, writing, rewriting, translation, summarization and brainstorming directly. Deterministic topic helpers are floors/fallbacks, not a whitelist of what PredictLM can answer.

Browser-local weights are **never downloaded on first visit**. The optional **Ativar Neural Local** action now auto-selects the strongest WebLLM tier that fits: **Qwen3.5 9B → Qwen3.5 4B → Qwen3 1.7B**. A real load/self-test decides whether the tier actually fits. PCs without usable WebGPU remain fully usable through the normal web/provider route instead of being forced to load a multi-GB local model. The small ONNX Qwen path is compatibility/offline fallback only.

### Model catalog and weight policy

The canonical model map lives in `src/lib/neural-model-catalog.ts`.

| Tier/target | Model | Format | Runtime | Role |
| --- | --- | --- | --- | --- |
| WebLLM Lite | `Qwen3-1.7B-q4f16_1-MLC` | MLC | WebLLM/WebGPU | weak-GPU fallback |
| WebLLM Smart | `Qwen3.5-4B-q4f16_1-MLC` | MLC | WebLLM/WebGPU | default local quality tier |
| WebLLM Power | `Qwen3.5-9B-q4f16_1-MLC` | MLC | WebLLM/WebGPU | stronger local tier |
| Compatibility Lite | `onnx-community/Qwen2.5-0.5B-Instruct` | ONNX | Transformers.js CPU/WASM | emergency/offline compatibility |
| Compatibility Smart | `onnx-community/Qwen2.5-1.5B-Instruct` | ONNX | Transformers.js | compatibility path |

The web product intentionally does **not** expose 7B as a browser button. A larger model belongs in a future desktop package with embedded llama.cpp and explicit weight installation/download. Skills, retrieval and adaptive memory augment the model; they do not rewrite the foundation weights.

The neural model is only one layer. PredictLM combines it with local memory, curated knowledge packs, web retrieval and tools. Repositories and guides improve the system as **knowledge/skills/context**; they are not falsely treated as if reading a repository trained a foundation model.

## Imagine — lightweight public generator

The public Imagine surface now prioritizes one reliable operation: **prompt → provider → valid image**. It is loaded only when opened and does not preload video/storyboard, Minecraft, semantic-review or identity-memory clients into the main Chat bundle.

Advanced identity grounding, editing, video and review code remains available as internal/experimental infrastructure. It can be reintroduced selectively after the direct image path is stable instead of blocking basic generation.

## Minecraft Cognitive World vs Neuroscience Lab

PredictLM now treats these as two different products with different success criteria.

### Minecraft Cognitive World

Minecraft is the **arena de inteligência / closed-loop**, not a complete biological-brain simulation. Four neuro-informed controllers share the same persistent voxel world:

- `H01-informed Human Controller`;
- `MICrONS/Allen-informed Mouse Controller`;
- `Atlas/projectome-informed Macaque Controller`;
- `FlyWire-informed Fly Controller`.

Each controller has a visible evidence-coverage sheet, abstraction level and a list of present/proxy/absent subsystems. The 0–100 value is an **internal evidence-coverage index**, never a percentage of a reconstructed brain.

The arena measures operational behavior: exploration, memory, food seeking, threat avoidance, crafting, long-path navigation, multi-objective planning and, as the multi-agent runner grows, cooperation/competition. Fixed seeds, action budgets, replay events, deterministic baselines and a renderer-free headless runner make results reproducible in CI.

The common contract is `step(observation) -> action`. The stable action vocabulary is `move | jump | craft | attack | interact | wait`. LLM assistance is optional/high-abstraction and must never bypass world state or claim an action happened without the Action API executing it.

### Render optimizer and simulation media

The first-person WebGL renderer has its own adaptive performance layer rather than depending on native DLSS/FSR DLLs.

Implemented browser path:
- persistent WebGL program/buffer instead of recompiling shaders every camera update;
- geometry cache keyed by seed/dimension/player cell/LOD/world deltas/controller tick, so mouse-look can reuse the uploaded mesh;
- `requestAnimationFrame` scheduling;
- Auto / Performance / Balanced / Quality / Cinematic presets;
- adaptive internal render scale with a 60 FPS target in normal modes;
- memory-pressure feedback and cache eviction on high JS heap pressure;
- center-priority detail with coarser far-world LOD while preserving the configured 49×49 maximum view;
- high-quality screenshot export and WebM canvas recording;
- render telemetry for scene cost, geometry cost, vertex count, scale and memory pressure.

The 11 requested projects are registered in `minecraft-performance-fabric.ts`. Native Windows projects are used as architecture references only. PredictLM does **not** swap DLLs, modify Windows services/registry, clear OS memory lists, inject OpenVR, bundle NVIDIA runtimes, or claim that its browser scaler is NVIDIA DLSS/AMD FSR. FidelityFX/OpenVR FSR/Magpie/Radiance patterns are translated into portable WebGL concepts: render scale, sharpening separation, frame pacing, modern renderer boundaries and center-priority quality.

Media capture follows a lightweight browser pipeline:

```
WebGL frame
→ adaptive render scale
→ high-quality spatial resample
→ contrast/saturation preservation
→ PNG or WebM encode
```

This improves capture/export of the Minecraft simulation without pretending to run proprietary neural-rendering models in the browser.

### Neuroscience Lab

The Lab asks a different question: **does the model respect the available data and limitations of the species?**

Species-scoped task families are enforced in code:
- fly: odor plume, optomotor, orientation and gap crossing;
- mouse: visual discrimination, simple maze and circuit probes;
- macaque: fixation, visual search and simplified reach;
- human: local H01 stimulation/circuit/column experiments only, never whole-brain.

Every trial records species, task, seed, model, `dt`, duration, datasets and the separation between published connectivity and modelled dynamics. A data-only mode can prohibit invented priors. Minecraft/survival tasks are rejected from the scientific Lab contract.

**Interpretation rule:** victory in Minecraft is not biological validation; scientific fidelity in the Lab is not a game-performance score. These axes are intentionally orthogonal.

Implementation:
- `src/lib/simulation/cognitive-world-contract.ts` — coverage sheets, task suite, Controller/Action API, Experiment Runner YAML, replay/checkpoint, baselines;
- `src/lib/simulation/neuro-informed-controller-adapters.ts` — four common controller adapters with bounded episodic/spatial memory and decision trace;
- `src/lib/simulation/minecraft-headless-benchmark.ts` — renderer-free benchmark environment;
- `src/lib/neuroscience/lab-contract.ts` — species/task compatibility, provenance and release checklist;
- `tests/cognitive-world-lab-contract.test.ts` — regression tests for disclaimers, claims, seeds and contracts.


## Autonomous operational learning

Feedback no longer stops at collection. `predict_feedback_events` now feeds a bounded Supabase trigger that aggregates repeated failures into `predict_auto_lessons`.

Current policy:
- negative/error events update only fixed operational categories;
- raw arbitrary user/model text is never auto-promoted as a global rule;
- a lesson self-promotes after the evidence threshold;
- promoted lessons are injected into server chat, streaming chat and browser-local reasoning;
- `reports/selfimprove/auto-learning.json` is the auditable aggregate snapshot;
- a scheduled workflow refreshes the snapshot every six hours and runs tests/build before committing it.

At the 2026-09-26 migration, historical feedback immediately produced three promoted lessons covering media reliability, chat relevance and chat failure recovery.

## Unified Chat execution

The same composer can now:

- answer normally;
- research current information;
- recognize a CNJ and call DataJud/DJEN;
- create or modify an app/site/system/code project;
- advance Fly/Human/Macaque/Mouse cognitive state;
- return a validated runnable ZIP after Build.

Legacy Processos and Cognitive routes redirect into Chat. Research remains a behavior of Chat rather than a separate public surface.

### JEV-inspired quality routing

Routing uses complexity, reasoning demand, tools and context pressure to select `fast | balanced | strong | long`.

Complex Build/Deep/Research/Legal requests prefer stronger configured models. The Vercel AI Gateway default is `google/gemini-3.8-flash`.

Context compaction follows a verbatim-first policy inspired by JEV compaction: old irrelevant context may be dropped; retained conversation/source files are not rewritten into lossy summaries. Build now selects relevant files and can send up to a much larger exact source slice instead of the previous ~2.6k-character-per-file truncation.

### Multi-species Cognitive Mesh

Normal Chat uses one persistent workspace combining:

- FlyWire Fly Core;
- H01 Human Core;
- Macaque cortical/projectome priors;
- MICrONS mouse visual cortical microcircuit priors;
- Allen mouse whole-brain mesoscale projection priors.

These are mapped-data/derived-controller references, not claims that PredictLM runs literal biological brains.

## Build capability inside Chat

Build follows a multi-pass workflow instead of a one-shot template generator and is invoked from normal Chat:

```
intent/context
  → product spec
  → architecture
  → frontend
  → backend/data decision
  → env/setup
  → smoke test
  → Council/Security
  → runnable packaging
```

Short incremental requests such as **“cor rosa”** are interpreted against the current project and patch it instead of creating a new generic template.

### Legacy Build workspace

The old dedicated Build UI is no longer required by the main product flow. Its lower-level project/runtime code remains for continuity and rollback. Build requests should enter through Chat.

The historical Build composer included presets:

- Aprimorar
- Full-stack
- Setup repo
- Frontend
- Backend/API
- Database
- Test & Ship
- Security

Example input:

```
Set up trycompai/crm
```

Using **Setup repo** expands it into a task that asks the agent to inspect manifests/docs, install dependencies, identify/start required services such as Postgres, create safe environment configuration, list missing credentials, and run build/test/typecheck rather than merely generating UI.

## Runnable ZIP

Export creates a clean Vite/React project, not the internal preview files.

Typical export:

```
package.json
index.html
src/
  main.jsx
  App.jsx
  styles.css
  App.test.jsx
vite.config.js
.env.example
RUNME.md
```

For domains that justify a server, such as CRM, the export also includes a functional local backend:

```
server/
  index.mjs
  data.json
src/lib/api.ts
```

The CRM preview works with local state when no server is present and can connect to the exported server when it is running.

## Deeper CRM blueprint

CRM generation now draws architectural lessons from mature and agent-native open-source systems such as SuiteCRM, trycompai/crm and Relaticle. The starter includes Dashboard, Pipeline, Clientes and Financeiro views, search, client creation, stage movement, financial metrics, invoice visibility and agent-oriented activity context. The Build orchestrator also exposes backend/data/setup decisions in the Explorer.

## Zero-API capabilities

- Predict DeepThink
- Chat knowledge engine
- optional browser-local neural model
- Build orchestration
- runnable project export/import
- local project snapshots
- free Research fallback
- Council review
- security static gate
- knowledge graph
- visual inspect
- smoke tests
- prompt enhancement
- media pre-production
- Second Brain memory

## Optional cloud upgrades

```bash
FIRECRAWL_API_KEY=

AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

All are optional. If an optional AI provider fails and automatic fallback is enabled, Build continues through the local orchestrator.

## Validation

`GET /api/health` self-tests:

- premium calculator generation
- multi-pass orchestration
- functional smoke checks
- runnable package file structure
- CRM backend packaging

GitHub Actions runs dependency installation and `npm run build` against PredictLM itself on every relevant change.


## Conversational intelligence

Chat routes each turn before deciding whether to search or generate:

- greetings, acknowledgements and personal/casual questions stay in conversation and never trigger random web searches
- contextual replies such as "já está ativo" use the preceding conversation instead of treating the phrase as a new topic
- stable factual questions such as "quem é..." or "o que é..." can fetch source material and synthesize a direct answer instead of dumping result links
- current questions use fresh research when needed
- technical/general prompts prefer Neural Local when it is available and fall back to DeepThink/knowledge honestly

Neural Local is considered active only after a real inference self-test succeeds. If later generation fails, PredictLM labels the response as a local fallback instead of silently pretending the neural model answered.

## Project continuity

Once a project exists, Build treats it as the source of truth. Normal prompts continue from the current files. Repeating "crie um CRM financeiro", saying only "crie", or giving an ambiguous follow-up does not reset the app. A destructive rebuild requires explicit language such as "novo projeto" or "do zero".


## GitHub Knowledge Engine

PredictLM now includes a lightweight **Skill Forge** for repository knowledge:

```
GitHub allowlist
  → license/provenance gate
  → commit-pinned Markdown/skills
  → chunk + dedup
  → versioned JSON index
  → local BM25
  → top-k context for Chat/Build
```

The online runtime never clones repositories. The deploy reads `src/data/github-knowledge-index.json`; `npm run knowledge:sync` refreshes it offline and the GitHub Action can refresh it on schedule or after engine configuration changes.

Source policy lives in `config/github-knowledge-sources.json`:

- `allow` — permitted Markdown may enter the index;
- `reference-only` — only manually distilled architectural lessons;
- `quarantine` — never enters operational RAG;
- `asset-only` — fonts/binaries/design assets are excluded from RAG.

Each indexed chunk preserves repository, commit/ref, path and license. Runtime retrieval defaults to top-3 and caps at top-5.

Initial allowed knowledge sources include MindsHub, Rowboat, Open Claude Cowork, Baby Whale and selected Free Programming Books material. Unofficial proprietary-service wrappers, bypass/jailbreak repositories and binary-oriented listings are quarantined even when they claim a permissive license.

## Optional Cloud Cascade

Chat uses **Predict Auto** by default. Provider Mesh is automatic when server-side credentials are configured; there is no separate cloud-model picker.

When enabled, Provider Mesh builds a server-only cascade from the providers that are actually configured. Provider order is quality/task-aware. Simple turns may use fast routes; difficult turns are promoted to stronger configured routes:

```
CACHE / history / skills / memory
  → JEV-style tier decision
  → strongest suitable configured provider
  → other healthy providers
  → research-grounded retry when needed
  → local Neural/WebLLM/runtime
  → Knowledge fallback
```

The order is configurable with `PREDICTLM_PROVIDER_ORDER`. OpenAI-compatible providers use the Chat Completions adapter; Anthropic uses the native Messages adapter. Provider failure changes only the runtime path, never the requested deliverable.

All cloud keys are **server-only**. No secret belongs in `NEXT_PUBLIC_*`, GitHub source, browser bundles or Supabase tables. No cloud key is required for local-first mode. See `.env.example` for the complete provider variable list.


## Token Budget Engine

PredictLM now budgets context before every local/cloud inference path.

- recent history is selected by token budget rather than a fixed message count;
- repeated blocks are deduplicated;
- GitHub Knowledge/skills use top-k retrieval;
- Build snapshots are compacted before neural review;
- image/video prompts are compiled into a bounded visual brief;
- responses can show the estimated percentage of redundant context removed.

The default path is deterministic and has no extra model/download. LLMLingua-2-style semantic compression remains an optional future acceleration because an extra TinyBERT/MobileBERT pass can be counterproductive on weak machines.

## Local Runtime Router

Local runtimes are implementation details of Predict Auto. The app does not scan arbitrary localhost ports automatically:

```
Token Saver
  → FreeLLMAPI / Ollama / local OpenAI API / llamafile-NanoMind / GenieX / LowRAM
  → WebLLM/WebGPU or ONNX Browser Qwen
  → Cloud Cascade (optional)
  → Knowledge fallback
```

Automatic mode probes only a previously configured loopback runtime (currently FreeLLMAPI with a saved local credential). Broader localhost discovery is never run silently. Hosted Vercel cannot reach a user's localhost.

Ollama can also be configured server-side for a local/self-hosted PredictLM instance with `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.

## Media prompt budgeting

Imagine/Video does not forward the full conversation to image/video providers. The visual request is compiled into subject, intent, style, composition, constraints and continuity/review hints, then capped before provider submission.

## Tutor Mode

Explicit learning requests such as “me ensine”, “faça um quiz”, “plano de estudos” or “pratique comigo” activate a lightweight mastery-learning layer inspired by HKUDS/DeepTutor (Apache-2.0).

PROBE → TEACH / PRACTICE → ASSESS → REVIEW

Core behavior:

- advancement is based on evidence of mastery, not a fixed stage counter;
- memory/procedure objectives use recent weighted attempts with a 0.90 gate;
- one correct attempt is capped at 0.50 mastery and two attempts at 0.80;
- concept/design objectives use qualitative explanation/application checks;
- quiz mode asks one question at a time and does not reveal the answer before the attempt;
- due review takes priority over new material;
- RAG/reading answers preserve source provenance and expose truncation/gaps;
- Tutor Mode uses the same Token Budget Engine: Fast top-3 diverse sources, Deep up to top-5, LowRAM top-2.

The implementation lives in src/lib/tutor-mode.ts and is injected into Browser Neural, Local Runtime Router and Cloud Cascade. The heavy Python backend from DeepTutor is not required.


## Web Reach

Research now has three independent layers:

1. **Firecrawl** structured search when a server key is configured.
2. **Apify** as an optional dataset/run bridge for supplemental results.
3. **Free fallback** using public web sources when external research APIs are absent or fail.

Every result still passes source-quality and topic-relevance gates before entering synthesis. Agent-Reach and FastChat provide architecture patterns for tool reach and multi-model serving. Twikit/Xquik-style social bridges remain external opt-in references rather than silent dependencies.

## Build agent references

Build remains project-continuity-first and now also distills patterns from Open Lovable, Freebuff, OpenHands, agency-agents and Composio:

```
REFERENCE / REQUEST
  → requirements
  → architecture
  → implementation
  → changed-file review
  → smoke/build/typecheck
  → focused repair
  → runnable package
```

Open Lovable's public chat page is treated as a product/reference surface, not as an undocumented API endpoint. Firecrawl-backed analysis and PredictLM's own Build runtime provide the reproducible integration path.


## LexisPredict SaaS skill

The PredictLM skill fabric now includes `skills/lexispredict-saas`, distilled from `W1CAPITAL/LexisPredict`:

- SaaS tenant/RBAC patterns;
- CRM/finance/agenda/tasks/supervision;
- DataJud/DJEN/process operations;
- OCR and document extraction;
- legal documents and templates;
- KPI/report pipelines;
- offline/local provider + sync patterns;
- **Dossier Second Brain** for evidence/timeline/artifacts.

The Dossier Second Brain does not replace the normal Chat answer. It assembles evidence and artifacts, then returns normalized context to Predict Auto.

## Office Artifacts skill

`skills/office-artifacts` adds format-specific gates for real DOCX/PPTX/PDF/XLSX generation and validation, with source/license boundaries for the requested document, presentation, PDF, spreadsheet and UI repositories.


### Animal vision and response quality

Open **Visão** in the sidebar (or **+ → Identificar animal** in Chat). The browser runs a small quantized image classifier on demand without a paid API. Five model scores, uncertain/non-animal outcomes, upload validation and cancellation are supported. The three optional upstream-compatible adapters and their real weight requirements are documented in `services/animal-vision/README.md`. Image classification does not increase the text model’s weights or validate fictional characters.

`npm test` exercises the uploaded Chat/Imagine acceptance cases and vision contracts. `npm run build` validates production compilation.


## AI Influencer Studio

PredictLM now treats a virtual influencer campaign as one coordinated capability inside Chat rather than a separate toy: identity continuity, image/video briefs, voice, editorial calendar, captions, analytics-ready publishing manifests and safe audience engagement are planned by the same Predict Auto agent.

The first built-in campaign profile is a **fictional adult luxury-goth creator**. Its visual lock is intentionally aesthetic rather than identity-copying: long black hair with blunt bangs, porcelain/cool makeup, black couture layers, silver hardware, chokers, striped accents and premium editorial lighting. User-supplied reference images guide styling and composition, while the generated persona remains a distinct fictional person.

Production flow:

```
reference/style request
  → persona + brand lock
  → content pillar + hook
  → image/video prompt with continuity anchors
  → quality/identity review
  → optional voice + captions/editing
  → publish manifest
  → analytics feedback
  → next-content adaptation
```

Key rules:
- disclose realistic AI-generated media where the target platform requires it;
- use a synthetic/authorized voice only; never clone a real person's voice without permission;
- preserve one stable persona across posts through a reusable identity lock and continuity ledger;
- use OpenCut/capcut-cli/compatible editors as automation references; unofficial/bypass-oriented CapCut packages are not trusted runtime dependencies;
- growth is organic: relevant comments, collaborations, trend participation, SEO/hashtags and cross-posting are allowed; mass comment spam, fake engagement and deceptive impersonation are not;
- publishing is adapter-based. A connected social publisher (for example Metricool/Instagram) may auto-publish; when no publisher is connected, PredictLM produces a complete review-ready publishing queue instead of pretending the post was sent.

The skill contract lives in `skills/ai-influencer-studio/SKILL.md` and the deterministic campaign planner in `src/lib/social/influencer-studio.ts`.


## Chat Trust Boundary

The public Chat now treats provider, tool, research and historical assistant content as untrusted until validated.

Critical controls:
- raw third-party API payloads and transport/debug logs are rejected before public output;
- the synchronous and streaming paths share the same final public-answer gate;
- provider streams are accumulated and validated before public emission;
- assistant history is sanitized before reuse, and contaminated historical answers are dropped;
- response cache keys are session-scoped; requests without a session identifier do not reuse the global response cache;
- configurable upstream endpoints reject loopback/private/metadata targets in hosted execution;
- research results reject private/insecure targets and raw payload contamination before entering model context;
- provider cooldown is a real circuit breaker, with request rate limiting and in-flight backpressure;
- upstream bodies, stack details and provider error dumps are not exposed to the user;
- failures include a correlation/incident identifier, and the UI offers retry/report actions;
- Chat UI no longer exposes internal pass names or a public chain-of-thought/reasoning panel.

Regression tests explicitly cover SpaceX-style raw JSON leakage, truncated payloads, debug/meta-text, session isolation, streaming validation, circuit breaking and legitimate structured-JSON requests.


## Image generation reliability

The Imagine pipeline treats image generation as a bounded multi-provider workflow instead of a single long request.

- "modo avatar Kurama" is resolved as the giant complete Kurama/Nine-Tails avatar; it is not collapsed into body-scale Kurama Chakra Mode.
- Compound phrases such as "Naruto Modo Avatar Kurama" are relationships/forms, not extra subjects. The provider prompt keeps Naruto, Kurama Avatar, Sasuke and Perfect Susanoo distinct without creating duplicate protagonists.
- Large internal prompt contracts are **not** copied wholesale into /api/media/render URLs. The public render transport is compacted to the identity/form/action/composition locks required by the renderer.
- /api/media/generate and /api/media/render keep provider timeouts inside Vercel's function budget so one slow provider leaves time for failover.
- Failed image endpoints enter provider-health cooldown instead of being retried on every request.
- A configured PREDICT_PUBLIC_IMAGE_URL is tried alongside the default public renderer; a broken custom base does not remove the default fallback.
- Public-render retries interleave bases/models and can make a final text-to-image attempt when reference transport is unavailable.
- Raw upstream error bodies are not exposed in public diagnostics.

Image-capable settings include Gemini/Nano Banana, Vercel AI Gateway/OIDC, ComfyUI, a configured OpenAI-compatible image endpoint, and the public image renderer. Text-only LLM variables remain useful for Chat/media-director reasoning but are not assumed to produce image pixels.


## Qwen Image 3.0 no Vercel

O Imagine suporta `qwen-image-3.0-pro` e `qwen-image-3.0` através do endpoint OpenAI-compatible da Alibaba Cloud Model Studio. O adapter está em `src/lib/media/qwen-image.ts` e entra no cascade de `/api/media/generate`.

No Vercel, configure em **Project → Settings → Environment Variables** para Production e Preview:

```env
QWEN_IMAGE_API_KEY=<sua chave Model Studio>
QWEN_IMAGE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_IMAGE_MODEL=qwen-image-3.0-pro
QWEN_IMAGE_ENABLE_THINKING=false
QWEN_IMAGE_TIMEOUT_MS=28000
PREDICTLM_IMAGE_PROVIDER_ORDER=qwen,gemini,vercel-gateway,comfyui,nano,configured
```

`DASHSCOPE_API_KEY` também é aceito como alias de `QWEN_IMAGE_API_KEY`.

A chave e o endpoint precisam pertencer à mesma região. Para uma workspace moderna, prefira o domínio dedicado mostrado pelo Model Studio, por exemplo `https://<WorkspaceId>.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` em Singapore. O domínio antigo `dashscope-intl.aliyuncs.com` continua compatível, mas o domínio de workspace é o recomendado.

Não defina `NEXT_PUBLIC_QWEN_IMAGE_API_KEY`: a chave deve ficar somente no servidor.

O provider:
- usa `POST /images/generations` tanto para T2I quanto I2I;
- aceita 1–3 referências no campo `image`;
- envia `negative_prompt`, `seed`, `size`, `prompt_extend` e `enable_thinking`;
- desliga prompt rewriting por padrão no modo Literal para reduzir identity drift;
- respeita o orçamento de timeout do Vercel e cai para os demais providers se falhar;
- trata a URL retornada pelo Qwen como temporária; a Media Library deve persistir o arquivo se retenção longa for necessária.

Depois de salvar as ENV, faça um novo deployment. Nenhuma dependência Python/CUDA é necessária para Qwen Image: o Vercel chama a API por HTTPS.

## NVIDIA Agent Skills

As skills solicitadas de `NVIDIA/skills` foram integradas ao roteador `src/lib/nvidia-capability-router.ts` e ao contrato `skills/nvidia-accelerated/SKILL.md`.

O PredictLM não instala CUDA, cuDF, DALI, cuOpt, DeepStream ou Omniverse dentro do Vercel. Essas capacidades são roteadas corretamente:

- **Vercel-safe**: formulação, planejamento e lógica leve;
- **remote-service**: Vercel chama AI-Q, NeMo Retriever, cuOpt server ou outro serviço autorizado;
- **GPU host**: cuDF/DALI/cuOpt/DeepStream/Omniverse/Nemotron/Physical AI rodam em workstation/cloud GPU compatível;
- **local tooling**: Data Designer e Skill Card Generator permanecem ferramentas de desenvolvimento/CI.

Para instalar as cópias oficiais em um agente local, use CLI atual:

```bash
npx skills@latest add nvidia/skills --list
npx skills@latest add nvidia/skills --skill rag-blueprint --yes
npx skills@latest add nvidia/skills --skill aiq-research --yes
npx skills@latest add nvidia/skills --skill accelerated-computing-cudf --yes
npx skills@latest add nvidia/skills --skill cuopt-routing-api-python --yes
npx skills@latest add nvidia/skills --skill deepstream-dev --yes
npx skills@latest add nvidia/skills --skill omniverse-usd-performance-tuning --yes
npx skills@latest add nvidia/skills --skill nemo-retriever --yes
npx skills update
```

O app não depende dessa instalação local para compilar ou funcionar no Vercel.
