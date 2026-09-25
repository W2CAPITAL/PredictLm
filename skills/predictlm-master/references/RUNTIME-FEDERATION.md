<!-- Portable PredictLM Master reference. Canonical source: skills/predictlm/RUNTIME-FEDERATION.md. Runtime/current canonical source wins on divergence. -->

# Runtime Federation

## Objective

Keep PredictLM local-first while using the strongest runtime that is actually available on the current device. A runtime failure may change the execution path, but never the user's requested deliverable.

## Browser paths

1. **ONNX / Transformers.js**
   - Lite Qwen2.5 0.5B is CPU/WASM-first.
   - Smart Qwen2.5 1.5B prefers WebGPU and may use WASM only on stronger machines.
   - This remains the compatibility path.

2. **WebLLM / MLC**
   - Opt-in only.
   - Requires a real WebGPU adapter.
   - Lite: Qwen2.5 0.5B q4f16 MLC.
   - Smart: Qwen2.5 1.5B q4f16 MLC.
   - Uses the same Prompt OS, memory, knowledge retrieval, Token Budget and final relevance gate as ONNX.
   - Preference is persisted; model artifacts rely on browser caching and are not bundled in Vercel.

Never keep ONNX and WebLLM large models active simultaneously when the user switches engines.

## Local API federation

Order is capability-driven, not brand-driven:

- FreeLLMAPI on `127.0.0.1:3001/v1`;
- Ollama;
- generic OpenAI-compatible local runtimes;
- llamafile / NanoMind;
- GenieX when hardware-compatible;
- LowRAM adapter.

FreeLLMAPI:
- unified key stays in browser localStorage;
- key is sent only to the loopback endpoint;
- Fast uses `auto:fast`, Deep uses `auto:smart`;
- never expose the key through NEXT_PUBLIC variables, logs, GitHub or Supabase.

Hosted Vercel cannot reach a user's localhost. A server-side FreeLLMAPI endpoint is optional only when the operator explicitly hosts one that Vercel can reach.

## AirLLM boundary

AirLLM is a desktop/Python low-VRAM architecture reference, not a browser runtime. Use its layerwise loading/offload/prefetch ideas for a future desktop bridge; do not import Python inference into the Next/Vercel client.

## Large models

GLM/DeepSeek-class large models belong behind a compatible provider/router or a future desktop runtime with explicit hardware/license checks. Never pretend a large model is running locally when only a small browser model is active.

## Failure policy

PROBE → LOAD → SELF-TEST → ROUTE → GENERATE → RELEVANCE GATE → DELIVER.

If a runtime fails:
- preserve the task;
- try another allowed runtime;
- report a specific limitation only if no valid path remains;
- never replace the requested answer with generic RAG text.
