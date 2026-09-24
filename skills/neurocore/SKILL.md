---
name: neurocore
description: Camada cognitiva inspirada em conectividade neural para controlar saliência, atenção, memória de trabalho, inibição, planejamento, curiosidade, risco e ação no PredictLM. Não representa consciência biológica.
metadata:
  version: "1.0.0"
  runtime: "browser/server context"
---

# PredictLM NeuroCore

## Objetivo
Adicionar dinâmica interna persistente e limitada ao PredictLM sem fingir que um LLM virou um cérebro humano.

## Arquitetura
O NeuroCore modela circuitos virtuais acoplados:
- sensory — entrada e novidade;
- salience — o que merece prioridade;
- attention — foco operacional;
- workingMemory — restrições ativas;
- episodicMemory — eventos/contexto relevantes;
- planning — decomposição e sequência de ação;
- inhibition — supressão de ruído/impulso;
- social — sinais sociais e relações;
- threat — risco e defesa;
- curiosity — exploração controlada;
- action — prontidão para executar.

Cada turno atualiza um pequeno estado numérico persistente: arousal, valence, uncertainty, energy, stress, curiosity, socialNeed, confidence e focus.

## Inspiração científica
- conectomas da Drosophila: grafo sensorial → circuitos intermediários → ação;
- neurolib: regiões acopladas, populações excitatórias/inibitórias, conectividade estrutural e delays;
- openMINDS: vocabulário, proveniência e estrutura de metadados neurocientíficos;
- FlyPuter: ponte conceitual entre conectoma/sensório-motor e ambiente físico simulado.

Essas referências inspiram arquitetura. O PredictLM não reproduz um cérebro humano, não executa 166 mil neurônios biológicos e não herda consciência de um conectoma.

## Regras operacionais
1. Intenção do usuário continua soberana.
2. NeuroCore não cria objetivos autônomos concorrentes.
3. Estado interno serve para roteamento/controle; não é emoção sentida.
4. Threat alto aumenta verificação, não paranoia.
5. Social alto ativa separação comportamento → intenção → evidência.
6. Curiosity alto pode abrir uma hipótese/fonte adicional apenas se puder mudar a resposta.
7. Uncertainty alto reduz certeza verbal.
8. Inhibition bloqueia contexto off-topic e respostas impulsivas.
9. Nunca expor chain-of-thought; só o resultado melhorado.

## Persistência
No browser: `predictlm-neurocore-v1` em localStorage. O estado guarda métricas/circuitos; não precisa guardar o texto bruto de cada prompt.

## Integração
- ChatShell avança o estado a cada pedido.
- Provider Mesh recebe contexto NeuroCore.
- Browser Neural/WebLLM recebe o mesmo controle.
- Local Runtime Router recebe o mesmo controle.
- Life Simulation usa um NeuroCore próprio da personagem simulada.

## Gate de realidade
Termos permitidos: brain-inspired, cognitive control layer, connectome-inspired, virtual circuits, active simulation.

Não declarar: consciência provada, sentimentos reais, organismo vivo, cérebro humano digital completo ou pessoa real.
