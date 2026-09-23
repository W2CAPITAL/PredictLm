# PredictLM learning pipeline

PredictLM now uses three distinct layers instead of pretending that a repository list is a trained model.

1. **Curated learning pack (runtime, works now)** — distilled implementation lessons are retrieved by intent and injected into local responses.
2. **Adaptive local memory (runtime, persistent)** — useful answers confirmed by repetition/feedback survive reloads and remain available even when the neural runtime is not loaded.
3. **Optional weight tuning (offline GPU)** — approved SFT examples can be used to fine-tune a small local model and then export/quantize it for browser inference.

## Sources

All repositories supplied for the current learning pack are registered.

- MIT / Apache-2.0 sources may feed the corpus.
- unknown / NOASSERTION sources are reference-only until their license is verified.
- potentially sensitive implementation patterns are distilled narrowly instead of copied wholesale.
- user-provided PredictLM fixes are treated as user-owned training material.

## Corpus

```bash
npm run train:sync
npm run train:validate
```

This produces:
- `training/corpus.jsonl`
- `reports/training/source-index.json`

The runtime does not ship thousands of raw chunks into every prompt. It retrieves a small, relevant set.

## Optional model tuning

`training/seed-sft.jsonl` is a compact supervised seed that encodes the behaviors the local model should learn. Use `training/train_lora.py` on a machine/session with a supported GPU. This is not required by the web app and does not use Ollama.

After tuning, merge/export the model to an ONNX/WebGPU/WASM-compatible repository and point the app's neural model configuration at that artifact.

## Reload behavior

A browser refresh necessarily destroys the active JavaScript model instance. PredictLM therefore persists:
- model preference/profile;
- browser model files in Cache Storage;
- adaptive experience memory.

On reload it reconstructs the runtime automatically from cached files instead of requiring a fresh model download.
