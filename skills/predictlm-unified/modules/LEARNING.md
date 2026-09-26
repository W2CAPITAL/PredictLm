# Learning / Training

PredictLM separates learning into layers so repository knowledge is actually usable instead of merely listed.

## 1. Autonomous operational learning

Negative/error feedback is now aggregated in Supabase into `public.predict_auto_lessons`.

Every feedback insert passes through a fixed-template trigger. It can update only bounded categories such as:

- media reliability;
- chat failure recovery;
- chat relevance / RAG contamination.

A lesson is promoted automatically after enough independent evidence (current threshold: 3 events).

Promoted lessons are consumed by:

- `src/app/api/chat/route.ts`;
- `src/app/api/chat/stream/route.ts`;
- `src/lib/browser-brain.ts`.

This closes the previous gap where PredictLM collected feedback and proposed experiments but did not apply any learning automatically.

### Safety boundary

Raw arbitrary user text never becomes a durable global instruction automatically.

The autonomous layer stores only fixed operational templates plus aggregate counts/confidence. Personal feedback rows remain separate.

## 2. Runtime learning pack

Approved authored lessons are stored in:

- `src/lib/training/source-registry.ts`
- `src/lib/training/learned-lessons.ts`
- `src/lib/training/context.ts`

The retrieval layer selects only relevant lessons for the current request.

## 3. Adaptive local memory

Useful responses can be persisted after repetition/positive feedback. Trusted experience is reusable even if the neural runtime is not loaded after a refresh.

## 4. GitHub Knowledge Engine

```bash
npm run knowledge:sync
npm run train:sync
npm run train:validate
```

The corpus job:

- reads permissive MIT/Apache sources;
- keeps unknown/NOASSERTION sources reference-only;
- chunks and deduplicates approved files;
- emits a training artifact and source report;
- never injects thousands of raw chunks into every user turn.

## 5. Autonomous audit snapshot

```bash
npm run selfimprove:snapshot
```

This writes:

```text
reports/selfimprove/auto-learning.json
```

The scheduled GitHub workflow refreshes that public aggregate snapshot every six hours and runs tests/build before committing it. Raw feedback and personal data are not exported.

## 6. Gated self-improvement

The engineering loop remains:

```text
OBSERVE -> VERIFY -> LEARN -> DESIGN -> EXPERIMENT -> ANALYZE -> COMPARE -> PROMOTE
```

Operational memory may promote itself after fixed evidence thresholds.

Code/model-weight changes remain gated by benchmark + test + build + rollback because silently turning arbitrary model output into executable code would corrupt the system.

## 7. Actual weight tuning

The repository includes:

- `training/seed-sft.jsonl`
- `training/train_lora.py`
- `training/requirements.txt`

This is an optional offline GPU workflow and does not depend on Ollama.

A tuned browser-compatible model can be selected with:

- `NEXT_PUBLIC_PREDICT_NEURAL_LITE_MODEL`
- `NEXT_PUBLIC_PREDICT_NEURAL_SMART_MODEL`

A weight-tuning run is not considered learned until the candidate beats a frozen evaluation and can be rolled back.

## Browser reload

A page refresh destroys the live JS model instance, so the app restores from browser model cache, persisted model preference/profile and adaptive local memory.

## Source policy

Training/reference sources include the user-provided chat/UI/agent/AI-learning/media/provider repositories. Unknown-license repositories stay reference-only until verified. User-owned PredictLM fixes are allowed as direct training material.
