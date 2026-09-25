---
name: life-simulation
description: Cria, executa e exporta simulações 2.5D isométricas ativas no PredictLM com personagem, mundo, necessidades, relações, memória, economia, eventos e Digital Brain persistente.
metadata:
  version: "3.2.0"
  surface: "Life Simulation Studio + Build"
---

# Life Simulation Skill

## Objetivo
Gerar uma simulação ativa e persistente **somente quando o usuário mandar abrir/rodar** um mundo/vida simulada. Não transformar conversa comum em simulação e não transformar a simulação automaticamente em jogo.

## Contrato
SIMULATION SPEC → WORLD → AGENT STATE → NEEDS → MEMORY → RELATIONS → EVENT LOOP → OBSERVE → PRIORITIZE → ACT → UPDATE → PERSIST → VERIFY.

## Padrão visual
- 2.5D isométrico leve em Canvas, browser-first e mobile-first;
- câmera com zoom e foco Mundo/Humano/Mosca/Macaque;
- POV voxel/perspectiva separado para Humano, Macaque e Mosca;
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


## Embodied Voxel World / Free Agents v3.0

A Life Simulation deve ser um mundo físico inspecionável, não uma fila de strings de NPC.

- movimento humano até locais e objetos é **progressivo**; `move`/`approach_object` não podem teletransportar o agente;
- trabalho usa affordances concretas: PC, quadro de planejamento, impressora e mesa de reunião;
- parque usa trilha, banco, árvores, flores, área de exercícios, água e estruturas escaláveis;
- `use_object` deixa `objectInteraction` observável para o renderer destacar o objeto realmente usado;
- Humano, Macaque e Mosca possuem POV próprios em perspectiva/voxel no navegador; a mosca mantém campo periférico amplo mesmo quando o viewport visual usa FOV projetável menor;
- Macaque é agente separado, com Macaque Core, visão direcional, forrageio, escalada, inspeção, descanso e interação social;
- Fly agent deve mudar waypoint, aproximar/evitar/alvo e manter velocidade compatível com a escala do mapa; órbita circular permanente é bug;
- autonomia pode escolher ações e abandonar/replanejar objetivos conforme necessidades/percepção; ela não autoriza ações externas ao mundo simulado.

### Pensamento público e memória

Cada agente pode expor um **pensamento público resumido** produzido pelo controlador do simulador. Isso serve para depuração/observabilidade e não é chain-of-thought privado nem leitura de mente.

Humano, macaque e mosca podem possuir biografias sintéticas longas para continuidade. Essas memórias devem carregar `source: synthetic-biography` e ser mostradas como **ficção do simulador**. Memória sintética nunca deve ser descrita como memória biológica recuperada de H01, FlyWire ou datasets macaque.

### Referências browser voxel

- `zardoy/minecraft-web-client` — MIT: referência arquitetural para mundo browser em primeira pessoa, render/câmera/input separados; não copiar assets do Minecraft.
- `zardoy/mcraft-arwes` — package metadata MIT: referência para render loop, câmera e lifecycle de chunks/scene.
- `JEFFY1234599/block-craft-browser-edition` — no estado inspecionado havia README, sem implementação/licença verificável no repositório; usar somente ideias gerais, sem copiar código/assets.


## Voxel POV + Free Agency v3.1

A simulação não pode declarar uma ação física sem tornar seu efeito observável.

- cada agente possui câmera própria com posição, heading, altura, range e FOV;
- Humano usa POV frontal direcional;
- Macaque usa POV direcional próprio e ações de inspeção/forrageio/escalada;
- Mosca usa POV frontal amplo + percepção periférica panorâmica de ~330°, com mudanças reais de altitude e waypoint;
- uso de objetos deve permanecer visível por alguns segundos e produzir animação coerente: tela em uso, impressão, escrita no quadro, porta/luz de geladeira, vapor, água, manipulação de plantas etc.;
- mãos/membros/proximidade devem indicar fisicamente qual objeto está sendo usado;
- texto de log nunca substitui uma interação visual quando o objeto está no campo de visão.

### Deliberação pública simulada

Cada agente mantém, no runtime local:
- `publicThought` curto;
- alternativas/candidate intentions;
- decisão selecionada;
- histórico público de decisões;
- lembranças biográficas sintéticas;
- experiências reais apenas do próprio runtime.

Isso é estado de software deliberadamente inspecionável, não chain-of-thought de provider nem leitura de mente.

### Memórias de vida inteira

Biografias podem cobrir infância/desenvolvimento, aprendizagem, falhas, trabalho, relações, exploração e hábitos. Todas continuam marcadas `source: synthetic-biography`.

A biografia serve para variar decisões e permitir recall contextual. Nunca converter ficção biográfica em alegação de experiência biológica real.

### Referências voxel/browser

- `zardoy/minecraft-web-client` — MIT: referência de arquitetura browser-first, câmera/renderer/input/scene; não copiar assets, texturas, nomes ou conteúdo proprietário de Minecraft.
- `zardoy/mcraft-arwes` — package metadata MIT: referência de Three.js/render loop/câmera.
- `JEFFY1234599/block-craft-browser-edition` — o README inspecionado declara MIT e descreve um sandbox voxel browser; usar somente padrões gerais confirmáveis, sem assumir como implementadas todas as alegações promocionais do README.

PredictLM deve manter identidade visual própria e assets originais; “tipo Minecraft web” significa navegação/voxel/POV/interação, não redistribuir arte do Minecraft.


## Runtime invariants v3.2 — movement and physical truth

The visible world and the action world must be the same world.

1. **Single object source of truth**
   - render `WORLD_OBJECTS` as the physical furniture/props;
   - do not draw decorative fake furniture that agents cannot perceive or use;
   - object id, position, label, affordances and renderer must describe the same object.

2. **Macaque liveness**
   - the Macaque interval must not depend on fast-changing fly coordinates/state values that can cancel the timer before its first tick;
   - runtime reads current world/fly state through stable refs;
   - Macaque target selection has dwell, completion, cooldown and anti-stall;
   - after inspecting/foraging/climbing, the target enters cooldown and Auri must choose another route;
   - climb changes real z/height.

3. **Fly anti-trap**
   - no light/object may act as a permanent magnet;
   - target reached → short sample/dwell → target cooldown → new waypoint;
   - low-motion for several ticks triggers anti-stall recovery;
   - bounds reflect velocity instead of teleporting to the opposite side;
   - lamp attraction is a cue, not a dominant goal.

4. **Physical actions take time**
   - `approach_object` visibly moves toward the real object;
   - `use_object` spans multiple executor ticks and exposes progress;
   - rewards/state changes accumulate across the interaction rather than pretending a long task completed in one frame;
   - the interaction remains visible long enough for map and POV renderers to show it.

5. **POV object recognizability**
   - tree/fruit tree: trunk + canopy/fruit;
   - bench: seat/back/legs;
   - bed: mattress/pillow;
   - computer: desk/screen/stand/keyboard;
   - bookshelf: shelves/books;
   - whiteboard: board/frame;
   - fridge: doors/handles;
   - stove: burners;
   - climbing/playground: bars/supports;
   - trail: flat path;
   - water/fountain: water/ripples;
   - lamp: pole/light;
   - flower: stem/bloom.

A text log saying an action happened does not satisfy the simulation contract when the action should be physically observable.
