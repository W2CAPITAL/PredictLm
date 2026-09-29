# PredictLM — Agent Rules

## Product
PredictLM is one legal-first general assistant governed by PredictLM Master. The public product is Chat + a legal shortcut + lightweight Imagine. Build, Work, Research and Tutor are capabilities invoked from Chat; Minecraft, neuroscience, agent simulation and other experiments remain internal labs and must not load into the main client bundle.

## Four-core runtime contract
- Fly, Mouse, Macaque and Human cores remain shared lightweight control layers for Chat, Legal, Build, Work, Tutor, Research, Imagine and Report.
- Normal product surfaces use compact controller signals only. They must not preload Minecraft, 3D renderers, full connectome datasets, neuroscience lab UI or simulation engines.
- Fly contributes salience/fast action filtering; Mouse contributes visual/spatial discrimination and uncertainty control; Macaque contributes regional/visual hierarchy integration; Human contributes working memory, executive control and metacognition.
- A core failure is non-blocking: the requested product function must continue with safe defaults.
- Browser Chat may use persisted cognitive state; stateless server routes use deterministic lightweight state so caching remains effective.

## Launch-video contract
- Product/commercial/launch-video requests use `skills/brag-launch-video/SKILL.md` as creative-direction contract.
- Inspect the real product before scripting; show the actual user flow instead of generic SaaS filler.
- Brag/Hyperframes patterns are optional execution references, not boot-time dependencies.
- A storyboard, accepted prompt or submitted async job is not a finished video. Completion requires a verified playable asset.
- Public media must exclude secrets, PII, real customer data and unsupported product claims.

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
