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
