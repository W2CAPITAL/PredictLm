# PredictLM architecture — v8

## Product surface — one Chat AI

The public product has one primary conversational entrypoint.

Chat detects intent and invokes internal capabilities:

```
Chat
  -> general answer
  -> Research when freshness/evidence is needed
  -> Processos/DataJud/DJEN when CNJ/legal intent is detected
  -> Build when project/code modification is requested
  -> Cognitive Mesh on every turn
  -> Imagine/Simulation/other explicit visual tools when appropriate
```

Legacy `/processos` and `/cognitive/*` pages redirect to Chat. Build and Research are no longer required as separate public tabs.

Build state, files, snapshots and validation remain persistent internal capabilities. Consolidating the UI does not delete those runtimes.

## JEV-style routing and context selection

PredictLM uses a deterministic JEV-inspired policy for `fast | balanced | strong | long` routing.

- policy/control flow stays in code;
- difficult build/deep/research/legal work is not downgraded to a tiny/free model merely for cost;
- retained history/file content remains verbatim;
- stale or irrelevant context is dropped instead of lossy rewriting;
- Build keeps relevant source files intact up to the context budget;
- low-confidence routing fails open to the stronger/current path rather than blocking the turn.

The configured Vercel AI Gateway quality floor currently defaults to a Gemini-class model. Provider identity remains internal.

## Unified cognitive mesh

Normal Chat advances one persistent multi-species workspace:

- FlyWire Fly Core;
- H01 Human Core;
- Macaque cortical/projectome proxy;
- MICrONS + Allen Mouse Core.

The mesh is a derived software controller. Dataset provenance stays separate and no mapped dataset is relabeled as a complete biological brain.

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


## Cognitive architecture

PredictLM's cognitive layer is a software control architecture, not a scientific claim of phenomenal consciousness.

Persistent/inspectable concepts include:
- self-model and stable entity identity;
- attention/salience/inhibition;
- working, episodic, autobiographical and semantic memory;
- prediction error and confidence;
- metacognition as uncertainty/contradiction/evidence-demand control;
- software homeostasis/drives;
- cognitive workspace/global-broadcast-style coordination;
- Human/Macaque/Fly reference cores with provenance boundaries.

Evidence classes remain separate:
1. measured/published neuroscience data;
2. derived controller behavior;
3. simulated runtime state;
4. unresolved/unknown.

No derived or simulated state is promoted to a biological measurement.

## Gated self-improvement

The engineering loop is:

```
OBSERVE -> VERIFY -> LEARN -> DESIGN -> EXPERIMENT
        -> ANALYZE -> COMPARE -> PROMOTE
```

The experiment store should preserve baseline commit, hypothesis, candidate patch, tests/evals, metrics, failures and promotion decision. Candidate-selection techniques may search the engineering space, but they do not grant external autonomous goals or bypass CI/human gates.

Patterns are informed by:
- GAIR-NLP/ASI-Evolve for evaluation-driven program evolution;
- MIT-licensed ACI work for memory layering/observability;
- jasonkresch/bots for bounded evolutionary simulation/fitness;
- ASI Alliance material for self-audit/failure-mode references.

Repositories that make stronger sentience/consciousness claims are treated as engineering/research references; their labels are not imported as evidence.

## Autonomous operational learning

Runtime feedback now closes a bounded learning loop in Supabase:

```
predict_feedback_events
  -> private trigger classifier
  -> predict_auto_lessons
  -> evidence/confidence threshold
  -> promoted lesson
  -> Chat / Stream / Browser Brain context
```

The trigger can emit only fixed operational templates. It cannot convert arbitrary user text, model output or repository text into executable code or unrestricted global instructions.

Current promoted categories include:
- media reliability;
- chat failure recovery;
- chat relevance / retrieval contamination.

The public runtime sees only promoted aggregate lessons through RLS. Raw feedback remains private. The GitHub snapshot exposes aggregate counts/confidence only.

Code and model-weight self-modification remain benchmark-gated; operational memory promotion and executable-code promotion are intentionally different trust levels.

## Browser neural scaling

Predict Auto treats browser inference as hardware-adaptive:

```
strong WebGPU -> Qwen3.5 9B
ordinary WebGPU -> Qwen3.5 4B
limited WebGPU -> Qwen3 1.7B
no usable WebGPU -> web/provider mesh
```

Small ONNX CPU/WASM models remain compatibility fallbacks rather than the primary intelligence path. Hardware hints choose an attempt order; the real WebLLM load/self-test decides whether a tier fits.

## Chat semantic firewall

Normal Chat has a strict boundary before output:
- current/research tasks may retrieve evidence;
- ordinary conversation is kept out of broad RAG;
- retrieval is context, never the final answer by itself;
- provider drafts must pass semantic alignment;
- streamed provider output is buffered/validated before public emission;
- `Relacionado:`, README dumps, skill names and internal context are rejected;
- captured production failures live in regression tests.

This firewall was introduced after the 2026-09-26 baseline exposed systematic retrieval contamination.
