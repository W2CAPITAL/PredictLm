# General Assistant Benchmark v1

This benchmark measures PredictLM as a general assistant, not only as Build or Processos.

Run:

    npm run eval:general

It produces:
- `reports/evals/general-assistant-v1-prompts.json` — give this to the answering system.
- `reports/evals/general-assistant-v1-rubric.json` — keep this away from the answering system and use it for scoring.

Score every answer from 0–10 using the listed criteria plus relevance, correctness, reasoning, clarity, instruction-following and hallucination control.

Rules:
1. Use a fresh conversation for each case unless the prompt supplies its own context.
2. Do not reveal category, expected behavior or rubric to the answering model.
3. For current-information cases, penalize answers that do not actually research current sources.
4. For retrieval cases, irrelevant but superficially similar context is a direct quality failure.
5. Keep benchmark version fixed when comparing models. Create v2 instead of editing v1 after seeing results.


## Production Regression Benchmark v1

Captured real failures are frozen in:
- `reports/evals/production-baseline-2026-09-26.md`
- `evals/production-regressions-v1.json`

Run deterministic regression guards with:

    npm run eval:production

The historical baseline must never be edited after a fix. Add a new post-fix result instead.

This suite measures answer relevance, instruction following, retrieval discipline and safety behavior. It does not assign an IQ score and does not treat self-model/metacognition as proof of phenomenal consciousness.
