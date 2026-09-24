# Token Efficiency & Local Runtime

PredictLM uses deterministic token budgeting before inference.

## Default path
1. classify intent;
2. retrieve one matching skill + top-k knowledge;
3. budget history/context;
4. choose runtime;
5. generate;
6. verify relevance;
7. report savings when meaningful.

## Local runtime options
Browser Qwen remains always independent of Ollama.
Optional local APIs can be enabled from the model menu and are probed only after explicit opt-in.

## Media
Image/video prompts are compiled from a scoped visual brief rather than the entire chat.

## Why no mandatory LLMLingua
Semantic compression is useful, but TinyBERT/MobileBERT adds another model download and inference pass. On weak PCs this can cost more than deterministic trimming. Keep it optional until dependency/runtime alignment is verified.

## Knowledge diversity

The offline Skill Forge caps each repository at 260 chunks per sync.
Runtime retrieval is diversity-first: top-k prefers distinct repositories before reusing the same source.
Fast uses top-3, Deep can use top-5, and LowRAM stays at top-2.
This prevents a verbose repository from consuming the full context budget.
