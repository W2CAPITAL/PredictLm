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


## Optional local runtime adapters

The browser Qwen path remains independent and mandatory as the local-first baseline.

Optional adapters, activated only by the user:

| Adapter | Endpoint | Role |
|---|---|---|
| Ollama | 127.0.0.1:11434 | local model manager/runtime |
| OpenAI local 4891 | 127.0.0.1:4891/v1 | mobile/desktop local API compatibility |
| llamafile / NanoMind | 127.0.0.1:8080/v1 | CPU/GGUF local server |
| Qualcomm GenieX | 127.0.0.1:18181/v1 | supported Snapdragon on-device inference |
| LowRAM | 127.0.0.1:8766 | constrained custom generation API |

The Local Runtime Router runs on the client because a hosted Vercel process cannot reach the user's localhost. The runtime must expose browser-accessible CORS/local-network access.

Every local runtime receives Token-Budgeted context before generation. Model selection/quantization remains the responsibility of the chosen runtime; PredictLM does not silently download a large GGUF through the web app.

### Low-RAM policy

- shorten context before forcing a smaller quantization;
- cap generation length;
- prefer an already-running local runtime over loading a second browser model;
- if no runtime is available, fall back to Browser Qwen Lite;
- do not claim a repository's published RAM number is guaranteed on the user's hardware.
