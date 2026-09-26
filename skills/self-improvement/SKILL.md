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
