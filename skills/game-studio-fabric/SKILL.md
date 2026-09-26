---
name: game-studio-fabric
description: >
  Coordenação interna da Life Simulation Studio do PredictLM inspirada no Claude-Code-Game-Studios:
  rigor adaptativo, papéis por domínio do mundo, loop completo, run-and-observe, playtest e gates de QA.
metadata:
  version: "1.3.0"
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
- 666ghj/MiroFish → pipeline seed → knowledge graph → memória individual/coletiva → personas/coortes → rodadas paralelas → memória temporal → ReportAgent/inspeção (AGPL, reference-only);
- MiroFish-Offline → abstração local de graph storage e execução offline como segunda referência AGPL;
- mindcraft → agente persistente dentro de um mundo com ações;
- neuroparticles → percepção local, pequenas políticas e comportamento emergente;
- RuView → conceitos de sensor fusion e percepção não visual;
- eNB → disciplina de eventos/estado;
- tinyrenderer + ENB references → câmera, render, iluminação e legibilidade;
- trackstudio → identidade persistente entre frames/atores;
- ai-brain / claude-mem / llm-wiki-agent → memória, episódios, entidades e continuidade.

## Voxel World / Minecraft-class

A Simulação possui um segundo mundo nativo: **Voxel World**, com arquitetura Minecraft-class.

Contrato:
- chunks determinísticos e efetivamente sem limite de gameplay em X/Z;
- seed + geração procedural + biomas + recursos;
- mineração e colocação de blocos;
- persistência por deltas, sem salvar o mundo inteiro;
- sobrevivência e criativo;
- vida, fome, experiência, inventário, hotbar/bloco selecionado;
- crafting, fundição, comida e farming;
- mobs passivos/hostis, combate e progressão;
- estruturas procedurais, cavernas, vilas, minas e masmorras;
- ciclo dia/noite, clima e dimensões;
- Dungeons é camada secundária de masmorras/loot, nunca o modelo principal.

Referências primárias registradas:
`fogleman/Craft`, `dgreenheck/minecraft-threejs-clone`, `0xfabian/mc`,
`pquiring/jfcraft`, `obiwac/python-minecraft-clone`, `Aidanhouk/Minecraft-Clone`,
`zardoy/minecraft-web-client`, `zardoy/mcraft-arwes` e
`JEFFY1234599/block-craft-browser-edition`.

Referências secundárias:
`TheDoctor200/MinecraftDungeonsLauncher` e
`GuyRoosevelt/Minecraft-Dungeons-The-Awakening`.

Arquivos canônicos:
- `src/lib/simulation/minecraft-sandbox.ts`
- `src/lib/simulation/minecraft-reference-fabric.ts`
- `src/components/MinecraftSimulationPanel.tsx`

Referências sem licença verificada permanecem **reference-only**. Não copiar assets, sons ou código proprietário do Minecraft.

## Unity Fabric

A simulação usa `jbruening/UnEngine` (MIT) como referência para o contrato
GameObject / Component / Transform / Vector / Camera / Collider / Rigidbody / Physics / Input / Time.

- o runtime web continua leve e nativo;
- `src/lib/unity-fabric.ts` produz scene snapshots;
- o Voxel World exporta o estado para esse contrato;
- um build Unity WebGL real pode ser ligado por `NEXT_PUBLIC_UNITY_SIMULATION_URL`;
- o projeto-companheiro fica em `unity/PredictLMSimulation`;
- ausência de build Unity não é mascarada como Unity executando.

## Regra visual

Build/parse/teste lógico não prova que o mundo da simulação está visualmente correto.

No navegador, a evidência pode vir do próprio canvas/POV e do estado exibido. Quando uma validação visual externa não puder ser executada, registrar a lacuna; nunca fingir que uma imagem foi observada.

## Integração nativa

- `src/lib/game-studio-fabric.ts`
- `src/lib/agent-runtime/agentic-fabric.ts`
- `src/lib/simulation/emergent-swarm.ts`
- `src/lib/simulation/mirofish-fabric.ts`
- `skills/mirofish-simulation/SKILL.md`
- `src/components/GrokSimulationPanel.tsx`
- `src/app/api/chat/route.ts` no modo `simulation-plan`
- `src/lib/fusion/capability-fabric.ts`
- `src/lib/simulation/minecraft-sandbox.ts`
- `src/components/MinecraftSimulationPanel.tsx`
- `src/lib/unity-fabric.ts`

A fonte upstream é MIT. O PredictLM adapta padrões de coordenação; não depende de Claude Code nem importa o framework inteiro.


## MiroFish Fabric v1.3

O Game Studio trata o MiroFish Fabric como motor de simulação coletiva, não como decoração de prompt.

Pipeline obrigatório:
**seed/contexto → grafo de entidades/relações → memória → personas/coortes → rodadas → atualização temporal → relatório → inspeção**.

- o MiroFish oficial é a referência arquitetural primária;
- o fork Offline é referência secundária para storage/local-first;
- ambos são AGPL-3.0, portanto o core atual usa implementação clean-room própria;
- hardware fraco usa agentes representativos ponderados em vez de alegar milhares de agentes LLM reais;
- o relatório deve mostrar dissenso, incerteza, sinais e contrafactuais;
- resultados são cenários sintéticos do sandbox, nunca previsão factual de pessoas reais.
