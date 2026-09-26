# PredictLM Neural Models

## Principle

PredictLM is a system, not a single tiny local model.

```text
web/cloud model mesh
  + browser WebLLM
  + compatibility CPU/WASM model
  + PredictLM prompt/skills/knowledge/memory
  + Chat / Build / Processos / Imagine
```

Repository ingestion, RAG and memory do not alter foundation-model weights. Auto-learning is tracked separately from weight tuning.

## Current browser strategy

The 0.5B/1.5B class is no longer treated as PredictLM's primary intelligence.

### WebLLM / WebGPU — preferred local browser path

| Tier | Model | Approx WebLLM VRAM | Role |
| --- | --- | ---: | --- |
| Lite compatibility | Qwen3-1.7B-q4f16_1-MLC | ~2.0 GB | weak WebGPU / fallback |
| Smart default | Qwen3.5-4B-q4f16_1-MLC | ~3.9 GB | normal modern PC |
| Power | Qwen3.5-9B-q4f16_1-MLC | ~6.4 GB | stronger GPU |

`src/lib/webllm-runtime.ts` performs hardware-aware selection:

```text
9B -> 4B -> 1.7B
```

The loader performs the real allocation/self-test. `navigator.deviceMemory` and CPU core count are only conservative hints.

If WebGPU is unavailable, the web app does not pretend that a large model can run locally on every PC. Predict Auto keeps the product usable through the configured server/provider mesh. That is how the same web application can run on weak PCs without forcing multi-GB local weights into RAM.

## CPU/WASM compatibility path

The older Transformers.js Qwen path remains available only for offline/compatibility use:

| Tier | Weight source | Runtime |
| --- | --- | --- |
| Lite | onnx-community/Qwen2.5-0.5B-Instruct | @huggingface/transformers CPU/WASM |
| Smart | onnx-community/Qwen2.5-1.5B-Instruct | @huggingface/transformers WebGPU/CPU |

It is not the target quality ceiling and should not be described as the main PredictLM brain.

## Server/web quality path

When the local browser model is unavailable, too small, or unsuitable, Predict Auto may use configured remote/server routes such as the Vercel AI Gateway, Groq, OpenRouter, Gemini, DeepSeek, NVIDIA or other explicitly configured providers.

The user-facing identity remains PredictLM; provider outputs pass through PredictLM routing, prompt contracts, memory, knowledge and semantic/public gates.

## Auto-learning interaction

Promoted autonomous lessons are injected into both:

- server/provider chat;
- streaming chat;
- browser-local brain.

This means learned operational behavior is shared across local and remote generation paths.

## Weight tuning

Actual model-weight modification remains a distinct process.

The repository contains optional LoRA/SFT tooling, but a repository/RAG update must never be described as a weight update.

A weight candidate must pass:

```text
dataset -> training run -> frozen eval -> compare -> promote/rollback
```

## Non-goals

- Do not force a 9B model onto a weak PC.
- Do not call a 0.5B/1.5B compatibility model the full PredictLM intelligence.
- Do not require Ollama.
- Do not claim that RAG or feedback memory changes neural weights.
- Do not silently load a model that has not passed a real inference self-test.
- Do not make browser hardware claims from RAM hints alone.
