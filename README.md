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

### Neural Local

When available, PredictLM first tries a browser-native language model. Users can also load a quantized local model directly in the browser:

- **Lite** — Qwen 0.5B-class local inference for weaker machines
- **Smart** — Qwen 1.5B-class local inference when WebGPU is available

Model weights are downloaded on demand and are not bundled into the Vercel deployment. Ollama is not required.

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

GitHub Actions still runs `npm ci` and `npm run build` against PredictLM itself before changes are merged.


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
