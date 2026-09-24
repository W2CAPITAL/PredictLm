# PredictLM

PredictLM has two distinct product surfaces:

- **Chat** — the default assistant experience for normal questions, explanations, research, planning and coding help.
- **Build** — the developer workspace for creating and modifying applications with files, editor, preview, project memory, review gates and runnable export.

The product is local-first and does not require Ollama or an API key for its main workflow.

## Chat

Chat is intentionally separate from the IDE. It includes:

- normal multi-turn conversations and local history
- DeepThink knowledge retrieval
- optional zero-key web research
- optional **Neural Local** inference in the browser
- Chat ↔ Build switch

### Predict Auto

Chat exposes one model identity: **Predict Auto**. Provider/model selection is internal.

For substantive prompts the route is:

```
research/skills/context
  → server Provider Mesh
  → previously configured local runtime
  → browser-local engine already loaded
  → grounded Predict Core fallback
```

Browser-local weights are **never downloaded on first visit**. The model menu contains only an optional **Ativar modo offline** action. On weak machines, Lite CPU/WASM uses one bounded pass; WebGPU is used only after a real adapter test. The experimental browser LanguageModel API is disabled by default.

### Model catalog and weight policy

The canonical model map lives in `src/lib/neural-model-catalog.ts`.

| Tier/target | Model | Format | Runtime | License posture |
| --- | --- | --- | --- | --- |
| Browser Lite | `onnx-community/Qwen2.5-0.5B-Instruct` | ONNX | Transformers.js / ONNX Runtime Web | upstream Apache-2.0 |
| Browser Smart | `onnx-community/Qwen2.5-1.5B-Instruct` | ONNX | Transformers.js / ONNX Runtime Web | upstream Apache-2.0 |
| Desktop planned | Qwen2.5-7B-Instruct | GGUF conversion | embedded llama.cpp | Apache-2.0 |
| Desktop planned | Phi-4-mini-instruct | GGUF conversion | embedded llama.cpp | MIT |
| Desktop alternative | Mistral-7B-Instruct-v0.3 | GGUF conversion | embedded llama.cpp | Apache-2.0 |
| Review only | Qwen2.5-3B-Instruct | GGUF conversion | llama.cpp | Qwen Research; review before distribution |

The web product intentionally does **not** expose 7B as a browser button. A larger model belongs in a future desktop package with embedded llama.cpp and explicit weight installation/download. Skills, retrieval and adaptive memory augment the model; they do not rewrite the foundation weights.

The neural model is only one layer. PredictLM combines it with local memory, curated knowledge packs, web retrieval and tools. Repositories and guides improve the system as **knowledge/skills/context**; they are not falsely treated as if reading a repository trained a foundation model.

## Build

Build follows a multi-pass workflow instead of a one-shot template generator:

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

### Prompt Enhancer

The Build composer includes presets:

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

When enabled, Provider Mesh builds a server-only cascade from the providers that are actually configured:

```
CACHE
  → GitHub top-k / skills / memory
  → generic AI_* / FreeLLMAPI
  → OpenCode / NVIDIA / DeepSeek / Kimi / Z.AI / MiniMax / Gemini
  → Groq / OpenRouter / Anthropic / Ark
  → self-hosted Ollama when reachable
  → local Neural/Knowledge fallback
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
