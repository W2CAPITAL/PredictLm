---
name: life-simulation
description: Cria, executa e exporta simulações 2.5D isométricas ativas no PredictLM com personagem, mundo, necessidades, relações, memória, economia, eventos e Digital Brain persistente.
metadata:
  version: "2.0.0"
  surface: "Life Simulation Studio + Build"
---

# Life Simulation Skill

## Objetivo
Gerar uma simulação ativa e persistente **somente quando o usuário mandar abrir/rodar** um mundo/vida simulada. Não transformar conversa comum em simulação e não transformar a simulação automaticamente em jogo.

## Contrato
SIMULATION SPEC → WORLD → AGENT STATE → NEEDS → MEMORY → RELATIONS → EVENT LOOP → OBSERVE → PRIORITIZE → ACT → UPDATE → PERSIST → VERIFY.

## Padrão visual
- 2.5D isométrico leve em Canvas, browser-first e mobile-first;
- câmera com zoom e foco Mundo/Humano/Mosca;
- personagem feminina usa por padrão o self-model visual persistente da entidade quando a simulação é dela;
- mundo ampliado, locais clicáveis e objetos físicos com affordances;
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
A simulação só abre por comando/clique explícito, mas **dentro do mundo aberto** a autonomia perceptiva vem ativa por padrão, salvo override manual persistente do usuário.

A personagem não segue uma fila fixa de necessidades. O ciclo é:
**PERCEIVE → REMEMBER → SCORE AFFORDANCES → CHOOSE → MOVE/USE/SPEAK-OR-SILENCE → VERIFY → MEMORY → RECONSIDER**.

A escolha pondera visão atual, memória espacial, necessidades, objetivo, curiosidade, distância, saliência e variação interna determinística. Falar é opcional. A Mosca Predict usa o mesmo princípio com Fly Core, campo visual amplo e atração/saliência de estímulos.

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


## Agente executor real

A simulação não responde a ordens apenas com texto. Uma ordem deve virar **plano estruturado e ações executáveis**.

Fluxo obrigatório:

**OBSERVE → DECIDE → PLAN → REPAIR PRECONDITIONS → ACT → VERIFY → MEMORY → REPLAN**.

### Ações tipadas
O executor suporta, no mínimo:
- `move`;
- `buy_food`;
- `eat`;
- `cook`;
- `rest`;
- `work`;
- `study`;
- `socialize`;
- `message_friend`;
- `exercise`;
- `healthcare`;
- `clean_home`;
- `shower`;
- `create`;
- `wait`;
- `set_goal`;
- `speak`.

Cada ação deve alterar estado real quando bem-sucedida: tempo, posição, dinheiro, fome/energia/estresse, inventário, habilidades, relações, limpeza da casa, memória ou objetivo.

### Pré-condições
Exemplos:
- comprar comida → Mercado;
- trabalhar → Trabalho;
- estudar → Biblioteca;
- descansar/banho/limpeza/cozinhar → Casa;
- exercício → Parque;
- saúde → Clínica;
- comer em Casa → comida no inventário.

Se o provider gerar uma sequência inválida, o runtime repara o plano adicionando deslocamentos/compras necessárias antes de executar.

### Planner IA dedicado
Pedidos da simulação usam um modo estruturado separado do Chat geral. O planner recebe apenas:
- ordem do usuário;
- estado atual do mundo;
- inventário/habilidades/casa;
- últimas ações;
- segunda opinião curta do cérebro local.

A saída é JSON validado. Se APIs falharem, o plano determinístico local continua executável.

## Autonomia perceptiva

A simulação permanece manual para **abrir/iniciar**, mas a personagem pode viver autonomamente depois de iniciada.

Não usar ranking rígido saúde → energia → fome → dinheiro. A política deve comparar várias affordances possíveis do mundo a cada decisão. O usuário pode alternar **IA Auto / Manual**; esse override fica persistido.

Ações adicionais:
- `approach_object`;
- `use_object`;
- `wander`.

Objetos do mundo incluem, entre outros: cama, sofá, TV, geladeira, fogão, chuveiro, computador, celular, árvores, bancos, fonte, estantes e prateleiras.

### Percepção
- Humano: visão direcional local (~125°), alcance limitado e heading persistente.
- Mosca: campo amplo local (~320°), saliência e atração de estímulos.
- Nenhum agente recebe visão onisciente como percepção imediata.
- Memória espacial pode sugerir um lugar/objeto não visível; ao chegar, o agente volta a decidir pela percepção local.
- Percepções relevantes alimentam memória perceptiva do Cognitive Lab.

A autonomia permanece **somente dentro da simulação**; não chama ferramentas externas, não mexe em contas e não executa ações no computador do usuário.

## Estado ampliado

Além das necessidades e memórias, o agente mantém:
- inventário de comida;
- conhecimento;
- habilidades: carreira, culinária, fitness, lógica, social e criatividade;
- casa: limpeza e conforto;
- histórico auditável de ações com estado antes/depois;
- contador e última decisão autônoma.

## Referências Sims-like

- `Xiphereal/TheSims`: reference-only; usar apenas conceito de mundo/ações porque a licença não foi verificada.
- `DewingShen88/sims4-immersive-controls`: reference-only; usar autonomia, pesos de interação, memória e reversibilidade em alto nível.
- `francot514/FreeSims`: MPL-2.0, reference-only; casa/trabalho/comunidade e engine independente de assets proprietários.
- repositórios de desbloqueio/DLC: **quarentena; não usar no código, corpus ou runtime**.


## Organismos não-NPC v2.1

Agentes da simulação não devem executar órbitas, rotas circulares ou filas fixas apenas para parecer ativos.

Cada decisão deve combinar:
- estado corporal/drive;
- percepção local;
- memória espacial/episódica;
- curiosidade/novidade;
- segurança;
- contexto social;
- objetivo;
- uma fonte determinística de variação;
- ação alternativa.

Padrão:
**SENSE → UPDATE DRIVES → RECALL → FORM HYPOTHESES → SCORE AFFORDANCES → CHOOSE + ALTERNATIVE → ACT → VERIFY → CONSOLIDATE MEMORY**.

O humano e a mosca podem ficar parados, descansar, observar, investigar, mudar de ideia, evitar estímulos, buscar interação ou abandonar um objetivo. Movimento constante é considerado bug de simulação.

O Cognitive Lab também expõe múltiplos cérebros humanos simulados para comparação de hipóteses. Eles não são pessoas reais e não devem ser apresentados como mentes reais digitalizadas.
