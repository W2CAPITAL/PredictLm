---
name: life-simulation
description: >
  Contrato da única Simulação pública do PredictLM: Minecraft Cognitive World,
  com quatro cérebros mapeados jogando no mesmo mundo voxel persistente.
metadata:
  version: "4.0.0"
  type: simulation-specialist
  surface: "Simulation"
---

# Minecraft Cognitive World

A Simulação pública possui **um único modo**: Minecraft.

Não criar, restaurar ou expor:
- modo Vida;
- cidade/Sims como modo paralelo;
- alternância Vida ↔ Voxel;
- outro sandbox visual concorrente.

Código legado pode permanecer temporariamente como referência interna durante migração, mas não é superfície de produto.

## Quatro cérebros no mesmo mundo

Agentes obrigatórios:
- **Humano** — H01-derived functional controller;
- **Macaco** — Macaque Core;
- **Camundongo** — Mouse Core;
- **Mosca** — FlyWire/Fly Core.

Eles compartilham o mesmo save e o mesmo estado físico do mundo. Cada um mantém posição/dimensão, saúde/fome, inventário, objetivo, última ação, pensamento público resumido e contador de decisões.

Pensamento público é observabilidade do simulador, não chain-of-thought privado e não leitura de mente.

## Regra física

**PERCEBER → DECIDIR → AGIR → ALTERAR O MUNDO → VERIFICAR → MEMORIZAR**

Texto não conta como ação. Se o cérebro diz que minerou, construiu, lutou, comeu ou viajou, o estado correspondente precisa realmente mudar.

## Mundo obrigatório

O runtime deve suportar progressivamente:
- chunks procedurais e exploração ampla;
- árvores e madeira;
- vilas e villagers;
- cavernas, minas abandonadas, dungeons e estruturas;
- carvão, ferro, ouro, diamante e recursos dimensionais;
- crafting, fornalha/smelting e inventário;
- ferramentas, armas, armaduras e escudo;
- móveis colocáveis: cama, mesa, cadeira, estante, porta, escada, baú e iluminação;
- comidas, agricultura e sobrevivência;
- animais e monstros hostis;
- ciclo dia/noite e clima;
- Overworld;
- Nether com fortaleza e mobs próprios;
- End com stronghold/End City e mobs próprios;
- construção e destruição persistentes;
- save/import/export;
- modo survival e creative;
- Unity WebGL opcional sem tornar o renderer nativo dependente de Unity.

## Autonomia dos cérebros

Ao rodar o mundo, os quatro cérebros devem agir autonomamente.

Perfis:
- Humano: planejamento, progressão, mineração, crafting, construção, equipamento e dimensões.
- Macaco: exploração, recursos, forrageio, combate e estruturas.
- Camundongo: exploração local, túneis, mineração, abrigo e segurança.
- Mosca: reconhecimento rápido, exploração e descoberta espacial.

Esses perfis são tendências, não scripts rígidos. As decisões recebem sinais do Cognitive Workspace e do estado atual do mundo.

## Minecraft-class e propriedade intelectual

PredictLM implementa um sandbox voxel próprio inspirado em mecânicas gerais e em referências open-source permitidas. Não incorporar assets proprietários do Minecraft nem afirmar que o app redistribui o jogo original.

As referências registradas em minecraft-reference-fabric.ts são usadas conforme licença/proveniência. Minecraft Dungeons permanece referência secundária de progressão/loot/dungeons; o mundo voxel estilo Minecraft é o núcleo.

## Arquivos principais

- src/components/GrokSimulationPanel.tsx — wrapper da única Simulação.
- src/components/MinecraftSimulationPanel.tsx — UI e renderer.
- src/lib/simulation/minecraft-sandbox.ts — mundo físico.
- src/lib/simulation/minecraft-brain-agents.ts — quatro cérebros jogando.
- src/lib/simulation/minecraft-reference-fabric.ts — referências/proveniência.
- src/lib/cognitive/* — núcleos cognitivos.
