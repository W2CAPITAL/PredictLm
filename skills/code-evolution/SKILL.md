# Code Evolution

Code evolution is proposal-first.

Pipeline:
evidence → proposal → branch → implementation → unit tests → build → security and license checks → review → pull request.

Newly learned material may generate code automatically, but it cannot update main or production automatically. A passing experiment becomes review-required, not auto-merged.


## Replay before live experimentation

When a change alters exploration/control policy, replay it across recorded discovery traces before spending new live executions. Keep the current policy as baseline, reject recorded regressions, then run a bounded live canary. Replay is a cost-saving prefilter, not a substitute for tests, build, security review or human approval.


## Event → action safety for auto-programming

A public unlicensed reference project demonstrates a useful architecture pattern but also a failure mode: a sensor/gesture can directly trigger cloud infrastructure creation.

PredictLM adapts only the safe pattern:

**event/sensor → validate input → classify side-effect risk → authorize → dry-run → explicit approval when high-impact → idempotent action → audit**

Rules:
- no unlicensed source code is copied;
- external systems, money/resources, destructive actions or irreversible effects are never treated like ordinary local function calls;
- high-impact actions require explicit approval;
- medium/high-impact actions require a dry-run;
- external actions require audit and idempotency where applicable;
- learning from an automation example must include its missing controls, not just its happy path.


## Checkpoint, recovery and replacement handoff

Auto-programming may persist work safely across ordinary failures.

Allowed:
- checkpoint project/research state;
- resume after crash, deploy or provider outage under an active owner lease;
- migrate state to a replacement model/runtime;
- preserve provenance and generation/schema version;
- use a stable user-owned identity/service profile for discovery.

Not allowed:
- turning a shutdown request into a restart trigger;
- creating hidden replicas, startup hooks or remote persistence to avoid replacement;
- mutating owner controls, leases or audit history;
- treating model replacement as an adversarial event.

The implementation lives in `resilient-continuity.ts` and is tested for crash recovery, operator shutdown and replacement handoff.
