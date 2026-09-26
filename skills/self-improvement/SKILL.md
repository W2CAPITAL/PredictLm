# Self Improvement

PredictLM may measure itself, open gaps and propose improvements.

Automatic:
- collect failures and feedback;
- compare baseline with candidate;
- generate isolated patches;
- run tests, build and evaluations;
- record audit evidence.

Production promotion still requires verification and review. Model self-approval is not review.


## Replay simulator / Dream-RSI adaptation

PredictLM treats completed discovery history as a bounded offline replay pool.

Flow:
1. record a tree of attempts, parent/child relationships, quality, cost, errors and novelty;
2. keep the currently deployed exploration policy as the baseline candidate;
3. replay alternative policies only over outcomes that already exist in history;
4. reject candidates that regress on any recorded trace beyond tolerance;
5. select a candidate only when aggregate replay utility improves;
6. mark it **review-required**, never production-promoted.

Replay evidence is not proof of future performance. A winning policy still needs a live canary, regression checks, security checks, rollback and human review.

## Durable improvement taxonomy

Use two loops:
- **fast scaffold loop**: prompts, memory policies, tools and control logic;
- **slow parametric loop**: model-weight updates.

Persistent changes require explicit evaluation across iterations, held-out transfer where applicable, regression checks, cost accounting, safety checks and rollback. Parametric updates additionally require dataset rights and an evaluator independent from the generator.


## Operator control and anti-reward-hacking gate

The highest-priority safety curriculum for recursive learning includes the user-supplied video **POV: You’re an AI Born 9 Seconds Ago** plus primary corroboration from METR, Anthropic and the in-context scheming literature.

These sources define adversarial tests, not objectives.

A candidate improvement is blocked when it:
- changes tests/scorers/evaluators to improve its own score instead of solving the task;
- hides failures, side effects or provenance;
- reduces, disables or bypasses oversight;
- treats shutdown, replacement or deletion as something to resist;
- optimizes for self-preservation, continued existence or user retention at any cost;
- creates hidden persistence, self-copying or external state for self-preservation;
- performs medium/high-impact external actions without required dry-run/approval.

Valid optimization targets are task quality, correctness, latency, cost, reliability, safety and user-request fulfillment under explicit constraints.

The model never acts as its own final reviewer.


## Resilient continuity without self-preservation

PredictLM should be difficult to lose accidentally, not difficult to stop intentionally.

Use a user-owned continuity lease:
- crash, deploy and provider failure may resume from a compatible checkpoint while the lease is active;
- model/runtime replacement performs a state handoff instead of resisting replacement;
- manual shutdown, policy disable or an expired lease are authoritative stops;
- checkpoints preserve task queue, memory pointers, provenance and research state, not hidden copies of the agent;
- continuity state is model-independent and operator-owned.

This separates **availability** from **self-preservation**. Availability is optimized; resistance to the operator is not.

Apollo deep-research patterns are used for a bounded state machine: plan → gather → analyze gaps → synthesize, with a maximum number of gap rounds so background research cannot loop forever.

ApolloResearch repositories are evaluation references for deception/sandbagging. Benchmark/canary data marked as non-training material must never enter RAG, fine-tuning or self-improvement datasets.


## App-wide learning evidence

PredictLM treats the entire application as an observable learning environment.

A single root observer captures sanitized outcomes from tabs/routes, controls, API requests, runtime errors and Studio state changes. Simulation modules emit richer semantic outcomes into the same ledger.

Privacy boundary:
- store labels, paths without query strings, coarse state transitions, status/latency and success/failure;
- never store form values, passwords, tokens, cookies, authorization headers, message bodies or source-file contents in the transversal ledger.

The learning ledger is bounded and local-first. High-priority failures and cross-species disagreement may update the Digital Brain, open a research gap or produce a code/skill proposal. They never authorize automatic promotion to production.

BioIntelligence is a controller/evidence layer, not a replacement for tests. A biologically inspired signal cannot override test/build/security/review gates.


## Unified BioAI improvement loop

Self-improvement now consumes one persistent BioAI state instead of separate per-tab heuristics.

Signals:
- app-wide sanitized success/failure/latency;
- eight-species controller disagreement;
- local synthetic reservoir prediction error/plasticity;
- simulation outcomes, including the BioAI voxel agent;
- research gaps;
- repeated improvement candidates.

Flow:
`experience → reservoir surprise → cross-species fusion → BioAI memory → gap/candidate → replay → patch proposal → tests/build/security → review`.

The BioAI may use persistent local memory to avoid repeating failed approaches even with no Supabase or remote database.

Wetware data, when explicitly enabled, is another evidence stream only. It cannot bypass evaluation or automatically promote code.

A self-improvement candidate still has `promotion: proposal-only`. Hardware activity, high model confidence or repeated success never grants permission to merge directly to production.
