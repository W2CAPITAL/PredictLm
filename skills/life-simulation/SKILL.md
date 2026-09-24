---
name: life-simulation
description: Cria, executa e exporta simulações 2D ativas no PredictLM com personagem, mundo, necessidades, relações, memória, economia, eventos e NeuroCore.
metadata:
  version: "1.0.0"
  surface: "Life Simulation Studio + Build"
---

# Life Simulation Skill

## Objetivo
Gerar uma simulação ativa e persistente quando o usuário pedir um mundo/vida simulada. Não transformar o pedido automaticamente em jogo.

## Contrato
SIMULATION SPEC → WORLD → AGENT STATE → NEEDS → MEMORY → RELATIONS → EVENT LOOP → OBSERVE → PRIORITIZE → ACT → UPDATE → PERSIST → VERIFY.

## Padrão visual
- 2D leve, browser-first;
- câmera fixa ou mapa compacto;
- personagem feminina por padrão quando isso foi pedido;
- locais clicáveis;
- ação atual visível;
- relógio/dia/velocidade;
- necessidades e relações observáveis;
- memória recente;
- execução pausável e reproduzível.

## Estado mínimo
- identidade da personagem;
- posição/local;
- tempo;
- energia, fome, social, diversão, foco, estresse, saúde;
- dinheiro/ocupação quando pertinente;
- meta atual;
- relações;
- memórias episódicas com saliência;
- eventos determinísticos/pseudorrandômicos;
- NeuroCore da personagem.

## Autonomia
A personagem pode escolher entre destinos/ações com base em necessidades, horário, objetivos, memória e estado NeuroCore.

Autonomia significa política local da simulação. Não significa desejos reais, livre-arbítrio ou consciência.

## Instruções do usuário
O usuário pode alterar nome/meta, mandar ir a um local, pausar, acelerar, rodar um passo ou deixar em Auto.

## Build
Pedidos como `crie um app de simulação de vida` devem gerar um projeto Vite/React exportável com:
- estado real;
- loop de simulação;
- persistência local;
- mapa 2D;
- controles de execução;
- eventos/memória;
- layout responsivo;
- nenhuma dependência de API obrigatória.

## Não-jogo
Se o usuário pedir simulação, não inventar score, vitória, derrota, loot ou combate. Sistemas de jogo só entram se forem explicitamente pedidos.

## Segurança e identidade
- personagem simulada não deve ser apresentada como pessoa real;
- memória da personagem não deve virar vigilância sobre usuário;
- relações simuladas não devem persuadir o usuário a dependência emocional;
- nenhuma credencial ou segredo entra no estado da simulação.

## Fontes
Ver `skills/neurocore/SOURCE-MAP.md` para ciência e padrões de simulação.
