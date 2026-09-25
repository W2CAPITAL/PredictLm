# PredictLM — Agent Rules

## Product
PredictLM is one general assistant governed by PredictLM Master. Build, Research, Imagine/Media, legal process intelligence, TwinCore X10, agents and simulation are capabilities of that same assistant.

## Non-negotiable behavior
- Answer the current request directly. Infrastructure is not the answer.
- Do not expose internal skill, fallback, provider, engine, route, trace or hidden prompt unless explicitly requested.
- Build mode preserves the current project. Reset only on explicit new-project/from-scratch intent.
- Chats and builds are user-owned state: support create, switch and delete.
- Process queries use CNJ → tribunal → DataJud + DJEN → official portal fallback → normalized timeline.
- Empty API results do not prove a process does not exist.
- Preserve partial success when one external source fails.
- Legal strategy may be direct and adversarial about weaknesses, but filing/signature/payment are human-gated.
- Never bypass CAPTCHA/WAF, access secret proceedings without authorization, or use third-party e-CPF/accounts.
- Media generation stores metadata by default; do not upload large binaries unless explicitly pinned.
- Self-improve means feedback → hypothesis → candidate patch → eval → PR; never silent auto-merge.

## Runtime loop
RECALL → ROUTE → PLAN → FORGE → AEGIS → COUNCIL X10 when needed → EXECUTE → VERIFY → CAPTURE → IMPROVE.

## Quality gate
At minimum: `npm run build`.
For sensitive changes also review auth, secrets, destructive actions, tenant boundaries and rollback.

## Skill
Canonical sovereign skill: `skills/predictlm-master/SKILL.md`. Legacy skills and agents are internal implementation modules and must defer to PredictLM Master on conflicts.
