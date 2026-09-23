# Learning / Training

PredictLM separates learning into layers so repository knowledge is actually usable instead of merely listed.

## Runtime learning pack
Approved lessons are stored in:
- `src/lib/training/source-registry.ts`
- `src/lib/training/learned-lessons.ts`
- `src/lib/training/context.ts`

The retrieval layer selects only relevant lessons for the current request.

## Adaptive local memory
Useful responses can be persisted after repetition/positive feedback. Trusted experience is reusable even if the neural runtime is not loaded after a refresh.

## Repository corpus
```bash
npm run train:sync
npm run train:validate
```

The corpus job:
- reads permissive MIT/Apache sources;
- keeps unknown/NOASSERTION sources reference-only;
- chunks and deduplicates approved files;
- emits a training artifact and source report;
- never injects thousands of raw chunks into every user turn.

## Actual weight tuning
The repository includes:
- `training/seed-sft.jsonl`
- `training/train_lora.py`
- `training/requirements.txt`

This is an optional offline GPU workflow and does not depend on Ollama.

A tuned browser-compatible model can be selected with:
- `NEXT_PUBLIC_PREDICT_NEURAL_LITE_MODEL`
- `NEXT_PUBLIC_PREDICT_NEURAL_SMART_MODEL`

## Browser reload
A page refresh destroys the live JS model instance, so the app restores automatically from:
- browser model cache;
- persisted model preference/profile;
- adaptive local memory.

The model files should not be downloaded again when the browser cache is retained.

## Source policy
Training/reference sources include the user-provided chat/UI/agent/AI-learning/media/provider repositories. Unknown-license repositories stay reference-only until verified. User-owned PredictLM fixes are allowed as direct training material.
