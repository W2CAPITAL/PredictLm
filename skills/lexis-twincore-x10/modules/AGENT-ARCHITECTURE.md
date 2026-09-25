# Agent Architecture — Cognitive + Reactive Hybrid

A TwinCore usa uma arquitetura híbrida inspirada em sistemas multiagentes:

- agentes reativos para tarefas determinísticas e rápidas;
- agentes cognitivos para histórico, representação do ambiente, objetivos, planos e comunicação;
- coordenação explícita entre agentes para evitar que cada um otimize isoladamente.

## Blackboards

Compartilhar apenas estado necessário:
- TASK_STATE
- EVIDENCE_BOARD
- PROJECT_STATE
- RISK_BOARD
- MEMORY_INDEX
- SKILL_REGISTRY

## Mensagens

Cada agente envia:
- input recebido;
- fatos usados;
- ação proposta;
- dependências;
- confiança;
- resultado verificável.

Não enviar cadeia privada de raciocínio; compartilhar somente rationale resumido, evidência e decisão.

## Coordenação

FORGE e AEGIS trabalham de forma independente na primeira rodada.
O Chair resolve dependências e divergências.

## Aprendizagem operacional

Não confundir "aprender" com retreinar um modelo:
- capturar feedback;
- registrar memória;
- gerar eval;
- corrigir router/prompts/skills/código;
- versionar mudanças;
- medir antes/depois;
- reverter regressão.

## Versionamento

Toda melhoria persistente deve ter:
- versão;
- motivo;
- diff;
- teste;
- impacto;
- rollback;
- revisão por pares/Council quando relevante.

## Escalabilidade

Separar capacidades em módulos e adapters. Não carregar todos os modelos e skills ao mesmo tempo.
Roteamento deve escolher somente os componentes necessários para a tarefa.
