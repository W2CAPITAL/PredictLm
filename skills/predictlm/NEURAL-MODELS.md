# PredictLM Neural Models

## Principle

PredictLM uses a real pretrained open-weight model as its neural base. Runtime, skills, retrieval and memory are separate layers.

```text
pretrained weights
  -> inference runtime
  -> PredictLM prompt/skills/knowledge/memory
  -> Chat / Build / Processos
```

Cloning a GitHub repository or indexing documents does not alter foundation-model weights.

## Current browser path

| Tier | Weight source | Format | Runtime | Plug point |
| --- | --- | --- | --- | --- |
| Lite | onnx-community/Qwen2.5-0.5B-Instruct | ONNX q4/q8 | @huggingface/transformers | src/lib/neural-model-catalog.ts -> browser-brain.ts -> neural.worker.ts |
| Smart | onnx-community/Qwen2.5-1.5B-Instruct | ONNX q4/q8 | @huggingface/transformers | src/lib/neural-model-catalog.ts -> browser-brain.ts -> neural.worker.ts |

`browser-brain.ts` owns selection, persistence and capability checks.
`neural.worker.ts` owns model loading, backend fallback, self-test and inference.
The browser cache stores downloaded artifacts when the browser permits it.

## Custom browser model

Set:

```env
NEXT_PUBLIC_PREDICT_NEURAL_LITE_MODEL=
NEXT_PUBLIC_PREDICT_NEURAL_SMART_MODEL=
```

The target must be compatible with Transformers.js text-generation. A raw GGUF path is not valid for this worker.

## Desktop quality path

A future desktop edition should use:

```text
verified model source
  -> licensed GGUF artifact (or controlled conversion)
  -> embedded llama.cpp
  -> PredictLM desktop adapter
  -> existing skills / memory / Build runtime
```

Recommended candidates:
- Qwen2.5-7B-Instruct — Apache-2.0.
- Phi-4-mini-instruct — MIT.
- Mistral-7B-Instruct-v0.3 — Apache-2.0.

Qwen2.5-3B-Instruct is not a default candidate because its current model card uses the Qwen Research license. Review the intended distribution before using it.

## Non-goals

- Do not bundle multi-GB 7B weights in the Vercel web deployment.
- Do not require Ollama.
- Do not call RAG, repository ingestion or adaptive memory a weight fine-tune.
- Do not silently substitute an unverified model/license.
- Do not report a model as active until inference self-test succeeds.
