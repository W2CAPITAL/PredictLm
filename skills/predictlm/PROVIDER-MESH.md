# Provider Mesh

## Goal

Provide one server-side cascade for multiple AI providers while keeping the browser free of API secrets.

## Supported provider families

OpenAI-compatible chat:
- generic AI_* provider
- FreeLLMAPI when hosted on a server-reachable endpoint
- OpenCode Zen
- NVIDIA NIM
- DeepSeek
- Kimi / Moonshot
- Z.AI / GLM
- MiniMax
- Gemini OpenAI compatibility
- Groq
- OpenRouter
- Volcengine Ark
- Ollama when the PredictLM server is self-hosted

Anthropic-native:
- Claude via /v1/messages

## Routing

Default order is configurable with `PREDICTLM_PROVIDER_ORDER`.

The cascade:
1. only registers providers whose required server variables exist;
2. tries them in configured order;
3. preserves the same user request and context across fallbacks;
4. returns the first non-empty successful response;
5. never exposes a secret or provider error body to the browser beyond a bounded diagnostic.

Provider failure is a runtime failure, not permission to change the requested content.

## Secrets

All cloud keys are server-only:
- never use NEXT_PUBLIC_;
- never place real keys in GitHub;
- never write keys to Supabase tables/logs;
- never send provider keys to the browser;
- local FreeLLMAPI credentials remain browser-local and go only to loopback.

## Model defaults

Defaults are convenience values and can be overridden by environment variables:
- OpenCode: nemotron-3.5-lightning-free
- NVIDIA: nvidia/nemotron-3.5-lightning-30b-a3b
- DeepSeek: deepseek-flash
- Kimi: kimi-k2.5
- Z.AI: glm-4.6
- MiniMax: MiniMax-M3
- Gemini: gemini-3.8-flash
- Anthropic: claude-sonnet-4-6

Ark requires an explicit endpoint/model id because it is account/deployment specific.

## Reasoning handling

- NVIDIA thinking is enabled only for Deep requests.
- MiniMax thinking is disabled in the generic cascade because PredictLM already performs its own bounded FORGE/AEGIS/PARALLAX review and the provider may otherwise mix reasoning markup into visible output.
- Anthropic uses the native Messages API and does not receive OpenAI-only parameters.

## Verify

A provider is considered operational only after a real successful request. Configuration alone is not proof of availability.
