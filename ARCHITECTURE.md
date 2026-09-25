# PredictLM architecture — v5

## Product surfaces

### 1. Chat surface

The default route is a conversational assistant, not an always-open IDE.

Components:

- session/history store
- normal composer
- DeepThink knowledge retrieval
- optional web research
- browser-native model detection
- optional Transformers.js/WebGPU local inference
- direct switch into Build

### 2. Build surface

Developer mode is an explicit workspace inspired by the strongest patterns from Bolt, Firebase Studio-like workflows, Kiro and code agents:

- agent conversation
- project files
- editor
- sandbox preview
- visual inspect
- project graph
- memory
- Council/Security
- import/export
- runnable packaging

## Intelligence layers

PredictLM does not claim that copying repositories creates a trained LLM.

The intelligence stack is:

1. **Local neural inference** — optional browser-native or quantized browser model.
2. **DeepThink deterministic reasoning** — intent, project context, blueprint/edit routing.
3. **Knowledge retrieval** — curated material from the provided repositories/guides.
4. **Project memory** — conversations, decisions, runs and snapshots.
5. **Build orchestrator** — explicit multi-pass product/software lifecycle.
6. **Tools** — research, project graph, smoke tests, security, preview inspect and packaging.
7. **Optional cloud providers** — boosts rather than hard dependencies.

## Build orchestration

The orchestrator decides whether a prompt means:

- a new project,
- an incremental edit,
- a planning request,
- or review/research/media work.

For build tasks it evaluates:

1. Intent and existing-project context.
2. Product requirements.
3. Architecture.
4. Frontend implementation.
5. Whether backend/data is actually justified.
6. Environment/setup artifacts.
7. Functional smoke checks.
8. Council and security review.
9. Runnable packaging.

No artificial waiting is added to simulate thinking. Each stage corresponds to actual analysis or an artifact/check.

## Incremental editing

The current project is authoritative. Short contextual prompts such as:

- “cor rosa”
- “deixe mais arredondada”
- “fonte maior”

are treated as patches when a project already exists. The engine preserves the current app and its spec rather than switching to a generic starter.

## Runnable package boundary

The internal preview format is optimized for fast sandbox rendering. Export transforms it into a clean Vite/React project. This separation lets PredictLM keep instant preview while producing a conventional project layout for users.

Server layers are generated only for product domains that justify them. CRM currently receives a local Node HTTP data service and a frontend API adapter; calculator remains intentionally frontend-only.

## CRM lessons encoded

- **SuiteCRM** — CRM breadth and mature business records.
- **trycompai/crm** — agent-first work queues, tools, skills, explicit capability availability and durable execution.
- **Relaticle** — CRUD/schema depth, MCP/API boundaries, workspace isolation and extensive testing.

These are architecture/knowledge references, not vendored copies.

## Security boundaries

- cloud keys remain server-side
- preview stays sandboxed
- local browser models do not require an inference API
- external research is untrusted input
- security gate checks generated code
- exported `.env.example` never invents secrets
- optional integrations state what is missing instead of failing silently

## Deployment

- **Vercel:** web surface, server routes and static app.
- **Browser:** preview, local persistence, optional local neural inference.
- **Desktop/native bridge (future/optional):** shell, full terminal, filesystem, DaVinci, APK tools and heavyweight local runtimes.
