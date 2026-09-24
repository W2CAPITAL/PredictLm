# Predict Auto

## Public contract

The user sees one model identity: **Predict Auto**.

The app may use several runtimes internally, but model/provider selection is an implementation detail.

## Route

For substantive prompts:

1. CLASSIFY.
2. Retrieve current web evidence when needed.
3. Try server Provider Mesh when configured.
4. If no server provider answers, try only a local runtime already configured by the user.
5. If a browser-local model is already loaded, use it within the device budget.
6. Otherwise synthesize from verified research/knowledge and state any specific limitation.

## Weak-device policy

Never:
- download a browser LLM on first visit;
- probe a list of localhost ports automatically;
- perform multi-pass FORGE/AEGIS/PARALLAX on Lite CPU/WASM;
- require WebGPU just because navigator.gpu exists.

On-demand local mode:
- WebGPU runtime only after a real adapter test;
- CPU/WASM uses one thread unless crossOriginIsolated;
- Lite CPU uses one bounded generation even when Deep is enabled;
- local model can be unloaded without disabling Predict Auto.

## Provider policy

No provider button in the normal composer.

Provider Mesh is server-side and automatic. A provider must pass:
- real HTTP response;
- non-empty content;
- topic relevance;
- minimum answer quality for instructional prompts.

A 401/402/429/5xx from one provider means try the next one. No provider configured is a normal fallback state, not a client-visible 503.

## Research policy

Instructional questions should search automatically.

Domain-specific retrieval must:
- expand domain concepts;
- prefer official/academic/primary sources;
- avoid GitHub for non-software questions;
- reject a result that only repeats one broad keyword.

Example: "como criar um carro" requires engineering concepts (vehicle design, chassis, suspension, braking, powertrain, safety, homologation/prototype), not random pages containing the word "carro".

## UI

The model popover should be:
- compact;
- dark/theme-consistent;
- one auto identity;
- technical diagnostics secondary;
- one optional "Ativar modo offline" action;
- one "Liberar memória local" action when loaded.
