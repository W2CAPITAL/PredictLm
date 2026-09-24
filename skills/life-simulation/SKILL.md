---
name: life-simulation
description: Cria, executa e exporta simulações 2D ativas no PredictLM com personagem, mundo, necessidades, relações, memória, economia, eventos e Digital Brain persistente.
metadata:
  version: "1.2.0"
  surface: "Life Simulation Studio + Build"
---

# Life Simulation Skill

## Objetivo
Gerar uma simulação ativa e persistente **somente quando o usuário mandar abrir/rodar** um mundo/vida simulada. Não transformar conversa comum em simulação e não transformar a simulação automaticamente em jogo.

## Contrato
SIMULATION SPEC → WORLD → AGENT STATE → NEEDS → MEMORY → RELATIONS → EVENT LOOP → OBSERVE → PRIORITIZE → ACT → UPDATE → PERSIST → VERIFY.

## Padrão visual
- 2D leve, browser-first;
- câmera fixa ou mapa compacto;
- personagem feminina usa por padrão o self-model visual persistente da entidade quando a simulação é dela;
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
- Digital Brain/NeuroCore da personagem.

## Autonomia
A personagem pode escolher entre destinos/ações com base em necessidades, horário, objetivos, memória e estado NeuroCore.

Autonomia significa política local da simulação. A simulação nunca inicia por inferência ou curiosidade interna: exige comando/clique explícito.

## Ativação manual
- estado inicial: pausado;
- reload/F5: volta pausado, mesmo se a última sessão estava rodando;
- Chat só abre o Studio quando o pedido contém intenção explícita de abrir/iniciar/rodar;
- Digital Brain continua ativo fora da simulação;
- self-model visual não aparece no Chat comum.

## Aparência da entidade
A simulação embutida da própria entidade usa a referência visual definida em `src/lib/entity-self-model.ts`. Essa referência foi fornecida pelo usuário e é exibida diretamente; não é uma imagem gerada.

A geração de novas imagens da entidade continua bloqueada por padrão e só ocorre com pedido visual explícito.

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


## Scenario Lab dentro da simulação

A simulação visual continua manual-only. Porém, quando o usuário fizer uma pergunta contrafactual ou mandar executar uma atividade de impacto, a mesma skill pode rodar **simulações analíticas paralelas** antes de escolher/explicar o resultado.

Cenários mínimos:
1. baseline;
2. favorável;
3. adverso;
4. reação de outra pessoa/sistema;
5. terceira via/híbrida.

Em Deep:
6. efeitos de segunda ordem;
7. mundo de reversão — o fato que faria a conclusão mudar.

A análise compara premissas, gatilhos, resultado imediato, consequências atrasadas, beneficiados, riscos, reversibilidade e sinais observáveis.

Não inventar probabilidades numéricas sem dados. Não apresentar futuro simulado como fato.

Pergunta de cenário no Chat **não abre o Studio visual**. O Studio visual só abre com comando explícito para abrir/iniciar/rodar a simulação.
