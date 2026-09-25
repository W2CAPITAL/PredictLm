# Agent Fabric

## Goal

Use specialized agents as bounded capabilities under PredictLM orchestration instead of letting independent agents compete for control.

## Core roles

- **Planner/Coordinator** — decomposes multi-step work and owns acceptance criteria.
- **Builder** — edits code/artifacts.
- **Reviewer** — reviews diffs and behavior.
- **Bug Hunter (defensive)** — searches for reproducible defects, unsafe assumptions and security regressions.
- **Researcher** — gathers current evidence with provenance.
- **SEO** — audits crawlability, metadata, schema, content architecture and measurable SEO issues.
- **Writing Quality** — removes AI-slop patterns while preserving facts, intent and voice.
- **Tool Orchestrator** — maps requested actions to connected tools with explicit permission boundaries.
- **Media Director** — compiles image/video briefs and selects configured media adapters.

## Sources and boundaries

Patterns may be distilled from:
- OpenHands and agency-agents: planning, delegation, review and handoff;
- Composio: tool schema/orchestration patterns;
- Voyager/OpenMythos/Colibri: iterative agent/memory patterns, only after provenance review;
- no-ai-slop + avoid-ai-writing: deterministic writing audit/repair;
- open-seo: SEO audit patterns;
- Higgsfield CLI/Open-Higgsfield references: media workflow adapters;
- DeskcommCRM: CRM architecture reference only;
- LinkedIn MCP: external opt-in bridge only; never store credentials in source or automate actions without an authorized connector/session;
- Agentic-Bug-Hunter: defensive QA/repro/threat-model patterns only;
- Claude-Red and similar red-team repositories: quarantine/reference-only. Never import offensive or bypass behavior into normal agents.

## Orchestration contract

RECALL → CLASSIFY → PLAN → ASSIGN → EXECUTE → DIFF/RESULT REVIEW → AEGIS → VERIFY → CAPTURE.

Rules:
- one owner per side effect;
- tools require explicit capability;
- secrets stay server-side or local-only as appropriate;
- no fabricated tool success;
- no agent may silently broaden scope;
- reviewer cannot approve its own unverified mutation;
- security findings are evidence, not accusations;
- user-facing output contains results, not hidden agent debate.

## Writing Quality gate

For reusable prose:
1. detect generic filler, fake quotations, repetitive transitions, inflated claims and vague authority;
2. preserve concrete facts and constraints;
3. rewrite only when the result is measurably clearer;
4. never erase domain terminology merely to sound human.

## SEO gate

For web builds:
- title/description/canonical/robots/sitemap;
- heading and information architecture;
- structured data where justified;
- performance/accessibility basics that affect discoverability;
- internal linking and duplicate-content checks;
- measurable findings before cosmetic recommendations.


## API-first staged orchestration

For complex work, PredictLM uses a bounded staged pipeline rather than one giant prompt:

1. **Explore** — one or more independent API agents inspect the current workspace, requirements, project instructions and relevant evidence. They do not edit yet.
2. **Architect** — a planning agent reconciles explorer reports into an executable file/test/acceptance plan.
3. **Implement** — a provider receives only the relevant files plus selected skill contracts and produces focused changes.
4. **Independent review** — a different provider/role reviews changed behavior, tests, errors, security, types and requirement coverage.
5. **Validation of findings** — findings are treated as candidates until they match the actual changed files and constraints.
6. **Repair/finalize** — high-confidence blocking defects are sent back to an API finalizer for a focused repair.
7. **Deterministic verify** — smoke, type/build/diff/security checks verify output. Local runtimes may advise but do not author the public/build result.

Simple Chat turns bypass this machinery and stay direct.

## Deferred skills and tools

Do not serialize the entire skill/tool catalog into every request. Route first, then inject only the small set of contracts relevant to the current task. This improves signal, latency and token efficiency and reduces accidental instruction conflict.

A skill is context, not a personality. The API remains the answer/implementation engine.

## Scoped project instructions

Workspace-owned instruction files may guide agents:
- root `AGENTS.md`, `CLAUDE.md` or PredictLM instruction files apply broadly;
- nested instruction files apply only to files under their directory;
- more specific scoped instructions may refine broader ones inside that subtree;
- project instructions never override platform safety, permission or secret boundaries.

This is an independently implemented compatibility pattern; PredictLM does not copy Claude Code's proprietary engine.

## Independent review rules

Generated code or answers are not approved merely because another agent produced them.

- prefer a different provider/role for review when available;
- review only relevant changed behavior instead of generating speculative repo-wide criticism;
- separate tests, silent error handling, security, architecture and UX concerns;
- validate issues before escalating them;
- a small set of high-confidence findings is better than a long list of guesses;
- repair only validated defects and missing requirements.

## Media agent chain

Specific image/video requests can use:
- **identity/reference specialist** — locks subject identity/category/count/forms/colors/costume and negatives;
- **composition/action specialist** — handles framing, spatial separation, action readability, environment and camera;
- **semantic verifier** — compares generated pixels to the literal request;
- **repair finalizer** — regenerates once with concrete visible corrections.

Technical pixel quality and semantic fidelity remain separate checks.

## Provenance boundary

The official `anthropics/claude-code` repository is used only as a public architecture/documentation reference. Its license is all-rights-reserved under Anthropic's Commercial Terms. The `tanbiralam/claude-code` mirror explicitly describes itself as leaked source and is quarantined: its source is not copied, ingested, redistributed, trained on or made a runtime dependency. PredictLM independently implements general agentic patterns from lawful public descriptions.


## Plugin ownership and bounded loops

Patterns adopted from permissively licensed DeepSeek Harness and Hermes Agent sources are implemented as PredictLM-native contracts, not as a wholesale framework transplant.

- capabilities own their own settings, state, errors and side effects;
- tool/plugin boundaries expose explicit input/output contracts;
- runtime errors distinguish configuration, invalid arguments, transient provider failures and permanent capability absence;
- every complex agent run has an iteration/pass budget;
- interruption and stop gates must preserve already completed work;
- parallel subagents receive narrow objectives and scoped context, then merge through one parent/finalizer;
- durable learning happens only after verified outcomes and never from raw model confidence alone;
- session history remains searchable separately from the live prompt so long conversations do not have to be replayed in full.

## Provider resilience

The Provider Mesh keeps a bounded health record per provider/model.

- rate limits and transient 5xx/network failures enter a short cooldown;
- authentication failures cool down longer instead of being hammered on every turn;
- a successful call clears the failure streak;
- if another healthy remote API exists, recently failing providers are skipped for that turn;
- provider health is ephemeral operational state, not user memory;
- no cooldown path is allowed to promote Ollama/WebLLM/other local runtimes into the final-answer role.

This is based on general multi-provider reliability patterns visible in Free Claude Code and Hermes Agent, implemented independently in TypeScript for PredictLM.

## Source governance additions

- `Alishahryar1/free-claude-code` — MIT allowlist for provider catalog/fallback/session/tool-schema patterns. Free-tier and quota claims are volatile and are not treated as durable facts.
- `deepseek-ai/deepseek-harness` — MIT allowlist for plugin ownership, lifecycle, structured errors, tool-schema assembly and sparse prompt sections. Developer-preview compatibility changes are expected.
- `NousResearch/hermes-agent` — MIT allowlist for bounded loops, provider lifecycle, memory/session search, subagent isolation, learning and verification patterns.
- `deepseek-ai/awesome-deepseek-agent` — reference-only discovery catalog until a root license is verified.
- `realasfngl/Grok-Api` — quarantine: unlicensed, discontinued and explicitly designed around unauthenticated access/proxy evasion. It is not a provider dependency or knowledge source.
