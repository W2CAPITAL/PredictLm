---
name: game-studio-fabric
description: >
  Coordenação interna da Life Simulation Studio do PredictLM inspirada no Claude-Code-Game-Studios:
  rigor adaptativo, papéis por domínio do mundo, loop completo, run-and-observe, playtest e gates de QA.
metadata:
  version: "1.1.0"
  type: simulation-specialist
  source: "Donchitos/Claude-Code-Game-Studios"
  source_license: "MIT"
---

# Game Studio Fabric — Simulation

Esta skill pertence **somente à Simulação**. Não deve ser ativada pelo Build genérico apenas porque o usuário pediu um jogo, site ou código.

## Objetivo

Organizar a Life Simulation Studio como um pequeno estúdio de mundo persistente, sem transformar cada comando em burocracia.

O ciclo validado é:

**percepção → decisão → ação → consequência → memória → próxima percepção**

Narrativa sem alteração real de estado não conta como execução.

## Rigor adaptativo

- **minimal**: comando simples → validar ação → mutar estado → observar.
- **standard**: coordenar sistema do mundo + comportamento + memória + visual antes de aceitar a sequência.
- **full**: cenários complexos/multiagente, ownership explícito, branches contrafactuais, QA visual e continuidade reforçada.

## Papéis internos da Simulação

- **Simulation Producer** — escopo, ordem das mudanças e conflitos entre sistemas.
- **World / Systems Director** — regras determinísticas, economia, necessidades, locais e objetos.
- **Behavior Director** — políticas dos agentes, metas, autonomia, memória e percepção.
- **Visual World Director** — câmera, legibilidade, objetos visíveis, POV e continuidade espacial.
- **Social Systems Designer** — relações, confiança, afinidade, rotinas e efeitos sociais.
- **Agent Behavior Specialist** — executabilidade de planos, repair e ações permitidas.
- **Simulation QA / Playtest** — observa o mundo renderizado, regressões, loop e coerência.

Os papéis nunca aparecem como personalidades públicas. A interface continua sendo PredictLM.

## Gates

1. **World state** — a ação é representável no motor atual?
2. **Perception** — o agente sabe isso por percepção/memória local ou está usando onisciência?
3. **Action feasibility** — pré-condições, local, inventário e recursos permitem a ação?
4. **State transition** — algo verificável mudou de verdade?
5. **Continuity** — memória, relações, posição, necessidades e objetos continuam coerentes?
6. **Run and Observe** — quando a interface renderiza o resultado, observar o mundo/POV em vez de inferir só do JSON.
7. **Playtest** — achados separam comportamento, world-system, visual/UX e bug.
8. **Loop validation** — cenários complexos validam um ciclo completo antes de expandir.

## Fontes absorvidas pela Simulação

A Game Studio coordena outras capacidades já federadas:
- MiroFish-Offline → multiagentes, knowledge graph e contrafactuais;
- mindcraft → agente persistente dentro de um mundo com ações;
- neuroparticles → percepção local, pequenas políticas e comportamento emergente;
- RuView → conceitos de sensor fusion e percepção não visual;
- eNB → disciplina de eventos/estado;
- tinyrenderer + ENB references → câmera, render, iluminação e legibilidade;
- trackstudio → identidade persistente entre frames/atores;
- ai-brain / claude-mem / llm-wiki-agent → memória, episódios, entidades e continuidade.

## Regra visual

Build/parse/teste lógico não prova que o mundo da simulação está visualmente correto.

No navegador, a evidência pode vir do próprio canvas/POV e do estado exibido. Quando uma validação visual externa não puder ser executada, registrar a lacuna; nunca fingir que uma imagem foi observada.

## Integração nativa

- `src/lib/game-studio-fabric.ts`
- `src/lib/agent-runtime/agentic-fabric.ts`
- `src/lib/simulation/emergent-swarm.ts`
- `src/components/GrokSimulationPanel.tsx`
- `src/app/api/chat/route.ts` no modo `simulation-plan`
- `src/lib/fusion/capability-fabric.ts`

A fonte upstream é MIT. O PredictLM adapta padrões de coordenação; não depende de Claude Code nem importa o framework inteiro.
