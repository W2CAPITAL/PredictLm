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
