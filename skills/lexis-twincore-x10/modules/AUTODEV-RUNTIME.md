# AutoDev Runtime

Arquitetura original do PredictLM inspirada em padrões do `phodal/auto-dev`:
- agent-as-tool;
- roteamento para subagentes;
- regras do projeto em `AGENTS.md`;
- error recovery;
- codebase investigator;
- QA;
- self-improve;
- policy gate.

Implementação:
- `src/lib/agent-runtime/routing.ts`
- `src/lib/agent-runtime/error-recovery.ts`
- `src/lib/agent-runtime/policy.ts`
- `src/lib/agent-runtime/catalog.ts`
- `src/lib/agent-runtime/project-context.ts`

O padrão foi reimplementado para PredictLM; código externo não é copiado cegamente.
