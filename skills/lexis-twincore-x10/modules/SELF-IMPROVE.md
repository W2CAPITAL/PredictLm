# Self Improve

Observe → normalize → cluster → rank → hypothesize → patch → eval → compare → branch → PR/artifact → gate → capture.

Hierarquia:
1. regra;
2. router;
3. prompt/template;
4. skill/context;
5. modelo/few-shot;
6. provider.

Toda melhoria precisa: problema, frequência, impacto, hipótese, mudança, teste, métrica antes/depois, risco e rollback.

Sem escrita no host: gerar patch/version/changelog; não afirmar autoatualização.


## PredictLM feedback loop

Runtime signals:
- `POST /api/feedback` captures useful / incomplete / error signals.
- Supabase table: `predict_feedback_events`.
- Retention is intentionally compact; only fingerprint, short excerpt, surface and metadata are stored.
- `npm run selfimprove:collect` produces `reports/selfimprove/feedback.json`.

Application rule:
1. collect repeated failures;
2. cluster by surface/intent;
3. choose the smallest fix: rule → router → prompt → skill → code → model/provider;
4. create candidate patch;
5. run build/evals;
6. compare before/after;
7. open PR or artifact;
8. require a gate for merge/deploy.

The app may learn from errors; it may not silently rewrite production.
