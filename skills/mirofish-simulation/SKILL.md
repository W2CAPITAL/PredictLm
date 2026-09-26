---
name: mirofish-simulation
description: >
  Camada nativa de swarm/knowledge-graph da Life Simulation Studio do PredictLM,
  inspirada no MiroFish oficial e no fork Offline sem copiar código AGPL.
metadata:
  version: "1.0.0"
  type: simulation-specialist
  surface: "Simulation"
  sources:
    - "666ghj/MiroFish"
    - "nikmcfly/MiroFish-Offline"
  source_license: "AGPL-3.0 reference-only"
---

# MiroFish Simulation Fabric

Esta skill pertence **somente à Simulação**. Ela não transforma conversa comum, Research ou Build em previsão social.

## Objetivo

Dar ao PredictLM um ciclo de simulação coletiva inspecionável, leve e local-first:

**SEED/CONTEXT → GRAPH → MEMORY → PERSONAS/COHORTS → ROUNDS → TEMPORAL MEMORY → REPORT → DEEP INSPECTION**

O PredictLM implementa esse contrato de forma própria. O código AGPL upstream é tratado como referência arquitetural e não é copiado para o core.

## Pipeline obrigatório

1. **Seed / contexto**
   - partir do estado real do mundo simulado, objetivo atual e eventos;
   - não inventar uma base externa como se tivesse sido carregada.

2. **Grafo**
   - criar entidades, lugares, necessidades, metas, eventos e relações;
   - manter saliência/peso;
   - preservar a proveniência da informação usada pela simulação.

3. **Memória individual e coletiva**
   - cada agente mantém memória local curta;
   - eventos por rodada entram no ledger temporal;
   - conflito de memória deve ser observável, não silenciosamente apagado.

4. **Personas / cohorts**
   - variar arquétipo, influência, velocidade de reação e confiança;
   - usar agentes ponderados em hardware fraco;
   - nunca alegar “milhares de agentes LLM executados” quando o runtime usou representantes determinísticos.

5. **Rodadas paralelas**
   - cada agente observa apenas vizinhos/contexto permitido;
   - influência social altera estado de forma reproduzível;
   - registrar distribuição e eventos de cada rodada.

6. **Report Agent**
   - resumir sinal dominante, dissenso, incerteza, grafo e limites;
   - oferecer contrafactuais úteis;
   - separar resultado do simulador de fatos do mundo real.

7. **Deep interaction**
   - a UI pode inspecionar agentes, memórias, relações, rodadas e relatório;
   - a interação nunca é apresentada como leitura de mente de pessoas reais.

## Integração com Game Studio

Game Studio é o coordenador visual/sistêmico da Simulação. MiroFish Fabric é um dos motores internos.

O ciclo conjunto é:

**percepção → decisão → ação → consequência → memória → swarm/graph update → report → próxima percepção**

Regras:
- estado do mundo vence narrativa;
- local perception vence onisciência;
- mudanças visíveis pedem run-and-observe quando possível;
- o Report Agent não pode “corrigir” o mundo apenas escrevendo texto;
- a simulação pode ser contrafactual, mas não deve ser descrita como certeza futura.

## Runtime nativo

Arquivos:
- `src/lib/simulation/mirofish-fabric.ts`
- `src/lib/game-studio-fabric.ts`
- `src/components/GrokSimulationPanel.tsx`
- `src/lib/fusion/capability-fabric.ts`
- `src/lib/fusion/implementation-audit.ts`

O runtime browser usa:
- grafo compacto;
- 8–96 agentes ativos;
- população ponderada;
- 2–24 rodadas;
- atualização determinística e auditável;
- zero dependência obrigatória de Ollama/Neo4j/Zep.

Providers externos podem enriquecer planejamento e relatórios quando configurados, mas o simulador continua funcional sem eles.

## Minecraft / Voxel World

No modo Minecraft-class, MiroFish deve melhorar a camada de agentes e sociedade sem substituir o motor voxel:
- agentes podem formar grupos, trocar informação, explorar, reagir a recursos/eventos e registrar memória;
- chunks, mineração, construção, inventário, crafting, mobs e física continuam sendo verdade do `minecraft-sandbox.ts`;
- `mindcraft-bots/mindcraft` é referência para agente aterrizado em mundo persistente;
- Minecraft Dungeons continua **segunda referência** para progressão/loot/dungeons, nunca o modelo principal.

## Unity

Quando houver Unity WebGL configurado, o estado da simulação pode ser projetado em GameObject/Component/Transform via Unity Fabric. Sem build Unity configurado, o renderer nativo continua ativo e o app não finge execução Unity.

## Limites de licença e produto

- MiroFish e MiroFish-Offline: AGPL-3.0, **reference-only** no core atual;
- nenhuma dependência pesada é obrigatória;
- nenhum asset/código proprietário de Minecraft entra no repositório;
- saídas de swarm são cenários sintéticos, não fatos nem previsões garantidas sobre pessoas reais.
