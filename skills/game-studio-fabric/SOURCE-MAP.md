# Source Map

## Primary
- Donchitos/Claude-Code-Game-Studios — MIT
  - studio hierarchy / domain ownership
  - rigor modes
  - vertical-slice / end-to-end loop validation
  - run-and-observe visual QA
  - playtest evidence
  - path/domain scoped responsibility
  - coordination and escalation patterns

## PredictLM implementation — Simulation only
- src/lib/game-studio-fabric.ts
- src/lib/agent-runtime/agentic-fabric.ts (simulation surface)
- src/lib/simulation/emergent-swarm.ts
- src/components/GrokSimulationPanel.tsx
- src/app/api/chat/route.ts (simulation-plan)
- src/lib/fusion/capability-fabric.ts

## Boundary
Game Studio is scoped to the Life Simulation Studio. It is not injected into generic Build.
The upstream repository is a Claude Code workflow/template. PredictLM adapts coordination and QA
patterns; it does not require Claude Code, does not claim upstream hooks ran, and does not clone
the entire framework.
