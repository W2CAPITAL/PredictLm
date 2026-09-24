# LOCAL RUNTIME ROUTER

## Objetivo
Dar ao PredictLM um caminho local mais forte quando o usuário já possui um runtime, sem tornar Ollama ou outro servidor obrigatório.

## Auto-probe loopback
- Ollama: 11434;
- OpenAI local: 4891;
- OpenAI local: 8080 (llamafile/NanoMind e similares);
- GenieX: 18181;
- LowRAM: 8766.

## Fluxo
TOKEN SAVER → PROBE → CONTEXT TOP-K → GENERATE → TOPIC GATE → FALLBACK.

## Fallback
Local API → Cloud Cascade opcional → Browser Neural Qwen → Knowledge.

## Segurança
- apenas loopback no auto-probe;
- não enviar secrets do servidor ao browser;
- erro/CORS vira fallback, não trava o chat;
- um runtime `uncensored` não desativa os gates do PredictLM;
- não assumir que localhost da Vercel é o PC do usuário.

## Fontes de arquitetura
- NanoMind: OpenAI-compatible + RAM-aware model selection (MIT);
- llamafile: GGUF local portátil (Apache-2.0);
- GenieX: runtime Snapdragon/OpenAI-compatible (BSD-3-Clause);
- llamdrop: hardware probing/context trimming/Ollama (GPL reference-only);
- LowRAM AI Compiler: memory/context budgeting (license file not verified; reference-only);
- Uncensored Local AI: local API/model lifecycle (license file not verified; quarantine/reference-only).
