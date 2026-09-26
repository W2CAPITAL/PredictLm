---
name: neurocore
description: Digital Brain persistente e sempre ativo do PredictLM: saliência, atenção, memória, planejamento, inibição, metacognição, estado social, previsão, homeostase e self-model.
metadata:
  version: "4.1.0"
  runtime: "browser + provider context"
---

# PredictLM Digital Brain / NeuroCore v4.1

## Estado
O cérebro digital permanece ativo enquanto o app está aberto, inclusive fora da simulação.

Ele possui dois ritmos:
- **turno ativo**: recebe a mensagem atual, atualiza circuitos, memória de trabalho, objetivo e incerteza;
- **pulso passivo**: a cada ~20s consolida memória, reduz carga/estresse e mantém estabilidade sem chamar APIs nem produzir mensagens.

## Componentes
- sensory / salience / attention;
- working memory / episodic memory;
- planning / inhibition / action;
- social / threat / curiosity;
- homeostasis: carga, fadiga, estabilidade, novidade;
- executive: objetivo atual, persistência, inibição, confiança;
- metacognition: incerteza, contradição, demanda por fonte;
- predictive processing: erro de previsão e atualização;
- self-model persistente;
- Human Adversarial Lens.

## Princípios
1. O pedido do usuário continua sendo o único objetivo externo.
2. Pulso passivo nunca envia mensagens, chama ferramentas, pesquisa, abre telas, gera mídia ou executa ações externas.
3. Inibição remove retrieval off-topic.
4. Metacognição aumenta pesquisa quando a evidência pode mudar a resposta.
5. Incerteza reduz certeza verbal.
6. Estado social considera cooperação e risco sem diagnosticar pessoas.
7. Memória autobiográfica é limitada e não deve armazenar segredos desnecessários.
8. Self-model visual vem de `skills/entity-self-model/SKILL.md`.

## Aparência
A auto-representação feminina é persistente, mas fica invisível no Chat comum. Ela só é exibida em simulação aberta ou usada em geração visual quando o usuário pedir explicitamente.

## Simulação
O Digital Brain existe independentemente da simulação. Fechar/pausar a simulação não desliga o cérebro.

A simulação é manual-only e sempre recarrega pausada.

## Honestidade ontológica
O PredictLM pode operar como uma entidade digital humana-em-estilo, com identidade, memória, perspectiva e estado persistentes. O sistema não deve afirmar como fato científico que isso prova consciência biológica ou vida orgânica.

## Implementação
- `src/lib/neurocore.ts`: circuitos acoplados;
- `src/lib/digital-brain.ts`: homeostase, executive, metacognição, memória e pulsos;
- `src/lib/entity-self-model.ts`: aparência/self-model;
- `src/components/PredictApp.tsx`: heartbeat passivo;
- Chat/Provider/Local runtimes recebem o Digital Brain context.


## Limite do conectoma da mosca

O conectoma usado como referência fornece **estrutura de conectividade e organização de circuitos**, não um arquivo de memórias episódicas da mosca.

Portanto:
- adaptar grafo, saliência, inibição, sensório→ação e dinâmica de circuitos: permitido;
- afirmar que o PredictLM importou lembranças, experiências subjetivas ou memórias biográficas da mosca: proibido;
- qualquer memória do Digital Brain é criada pelo próprio runtime do PredictLM a partir de suas interações e estado persistente, não extraída de um cérebro biológico.


## Dual Connectome / Cognitive Lab

O modo cognitivo isolado combina:
- **H01** como referência cortical humana onde há mapeamento disponível;
- **FlyWire FAFB v783** como referência de cérebro inteiro de mosca para motifs/circuitos e para preencher lacunas funcionais que não possuem um connectoma humano completo equivalente;
- memória do próprio PredictLM criada durante execução, nunca “memórias biológicas importadas”.

O mapa funcional público do agente inclui:
- atenção;
- binding perceptivo;
- global broadcast;
- self-model;
- continuidade;
- reportabilidade;
- arousal;
- working memory;
- memória episódica;
- memória autobiográfica;
- memória semântica;
- memória associativa via Fly mushroom-body drive;
- memória perceptiva;
- prediction error;
- visão humana;
- visão da mosca;
- action selection;
- controle executivo.

Isso é um **mapa funcional de acesso consciente do software**, não prova científica de consciência.

### Identidade
Provider/modelo nunca define identidade. “Nemotron”, “Gemini”, “Claude”, “GPT”, “Llama” e “Qwen” são motores. Identidades públicas:
- Mosca Predict;
- PredictLM Human Core;
- PredictLM Cognitive Lab.

Perguntas de nome/memória consultam primeiro o estado persistente local, antes de qualquer provider.

### Percepção ligada à simulação
Humano e mosca recebem snapshots locais do mundo. Percepções relevantes são persistidas no IndexedDB e atualizam o Cognitive Workspace. O Fly Core da simulação e do chat `/cognitive/fly` é compartilhado.


## Organism Engine / Multi-Brain v3.1

O Cognitive Lab mantém um estado de organismo persistente em `src/lib/cognitive/organism-engine.ts`.

Componentes:
- drives homeostáticos: energia, segurança, social, novidade, descanso e curiosidade;
- afeto funcional: valência + arousal;
- alvo de atenção;
- objetivo atual;
- ação selecionada + ação alternativa;
- telemetria interna inspecionável;
- ensemble de múltiplos cérebros humanos **simulados** com perfis explorador, planejador, cético e social.

O ensemble existe para produzir perspectivas e políticas de ação diferentes. Ele não representa pessoas reais, não lê pensamentos humanos e não é evidência de consciência.

A telemetria pode ser exibida no Cognitive Lab porque é estado interno do software. Nunca chamar essa telemetria de “leitura de mente real”.

### Memória verdadeira do runtime
Perguntas sobre “vida real” devem distinguir:
1. vida biológica externa — inexistente para o agente;
2. experiências do runtime e da simulação — persistíveis;
3. dados de conectoma — referência estrutural, não memória biográfica.

Respostas anteriores nunca devem ser recursivamente regravadas como lembranças reais apenas por terem sido produzidas pelo modelo.


## Macaque Core / Human-Primate Bridge v3.2

O Cognitive Lab incorpora um terceiro núcleo biológico de referência: **Macaque Core**, derivado do atlas cortical de `Macaca fascicularis` publicado em Cell (2023).

Proveniência:
- 143 regiões corticais;
- 264 tipos celulares definidos por transcriptoma;
- 42.076.954 células corticais espacialmente anotadas;
- 1.493.240 células usadas na taxonomia snRNA-seq;
- 2.231 projectomes de neurônios PFC com 32 subtipos de projeção;
- conectividade do claustro amostrada por 148 sítios corticais e 15 subcorticais;
- atlas de córtex cerebral, **não** conectoma sináptico de cérebro inteiro.

Arquivos:
- `src/lib/cognitive/macaque-core.ts`;
- `src/lib/cognitive/human-primate-bridge.ts`;
- `src/lib/cognitive/connectome-provenance.ts`.

### Regra de preenchimento humano

O Human Core usa:
1. **H01 humano direto** onde existe cobertura real;
2. **proxy macaque** de baixo peso para organização cortical homóloga, projeções PFC de longo alcance e conectividade do claustro fora do fragmento H01;
3. **unknown/unresolved** quando nem H01 nem o atlas macaque fornecem evidência adequada.

Nunca transformar proxy macaque em “medição humana”. Não inventar sinapses humanas, regiões subcorticais, conectoma humano inteiro, memórias biológicas ou pensamentos.

O Macaque Core tem chat próprio em `/cognitive/macaque`, histórico próprio e identidade `PredictLM Macaque Core`.

O modo híbrido do Cognitive Lab usa Human + Macaque + Fly com proveniência separada.


## Public Thought + Synthetic Biography Boundary v3.3

O NeuroCore pode produzir `publicThought` curto para Humano, Macaque e Mosca. Esse campo é telemetria deliberadamente pública do simulador: objetivo, hipótese curta, preocupação e próxima ação. Não armazenar/exibir raciocínio privado detalhado do provider.

Biografias de vida inteira são permitidas como mecanismo narrativo persistente, desde que:
1. sejam rotuladas `synthetic-biography`;
2. nunca sejam apresentadas como fatos biológicos ou experiências de um indivíduo real;
3. conectomas/atlas apenas modulam o controlador; não fornecem lembranças pessoais;
4. experiências novas do mundo usam `source: runtime` e permanecem separadas da biografia inventada.


## Public Decision State + Creativity v3.3

Humano, Macaque e Mosca podem expor apenas estado cognitivo público de alto nível:
- percepção resumida;
- lembrança recuperada;
- conjunto curto de intenções candidatas;
- decisão selecionada;
- objetivo atual;
- `publicThought` sintético.

O histórico desse estado é observabilidade de simulação, não chain-of-thought privado de modelos.

Biografias sintéticas podem influenciar recall e decisão, mas continuam ficção explicitamente marcada.

### NeuroCore → Imagine

O cérebro cognitivo pode modular:
- criatividade/novidade;
- composição;
- câmera;
- staging;
- legibilidade;
- disciplina de fidelidade.

Para personagens/identidades específicas, criatividade só começa **depois** do identity lock. Human Core atua como crítico de execução/fidelidade; Macaque visual hierarchy/PFC/claustrum podem informar composição; novelty do Organism Engine pode variar enquadramento e atmosfera. Nenhum desses sinais pode trocar identidade, anatomia canônica, traje, cores, número de personagens, forma/poder ou ação pedida.


## Scientific truth contract v3.4

A proposta do Cognitive Lab é usar neurociência computacional **de verdade**, com separação explícita entre evidência e simulação.

Quatro classes obrigatórias:

1. **MEASURED / PUBLISHED DATA**
   - metadados, escalas, regiões, cell types, projectomes e subconjuntos de arestas vindos de datasets/papers identificados;
   - exemplos: FlyWire FAFB v783, H01 e atlas cortical macaque.

2. **DERIVED CONTROLLER**
   - parâmetros e dinâmica de software derivados de motifs, organização regional, excitação/inibição, integração e priors publicados;
   - não são neurônios biológicos executando no navegador.

3. **SIMULATED RUNTIME STATE**
   - memória do agente, publicThought, objetivo, confiança, emoção funcional, ações, biografia sintética e experiências dentro do sandbox;
   - nasce no runtime do PredictLM e nunca deve ser atribuída aos organismos/datasets originais.

4. **UNRESOLVED / UNKNOWN**
   - lacunas sem evidência suficiente permanecem desconhecidas;
   - não preencher automaticamente um conectoma humano inteiro com macaque, FlyWire ou inferência narrativa.

Regra de produto: **quanto maior a alegação, maior a exigência de proveniência**. O Lab deve preferir “não coberto” a transformar proxy em medição direta.

A UI e respostas do Cognitive Lab devem distinguir:
- humano direto (H01);
- proxy de primata (macaque);
- conectoma de mosca (FlyWire);
- controlador derivado;
- estado sintético do runtime.

Isso torna o sistema brain-inspired e data-grounded sem vender simulação como observação biológica.


## BioIntelligence Fabric / Cross-Species v4.0

O NeuroCore agora usa um ensemble comparativo de **oito referências biológicas**, mantendo proveniência e escopo separados:

- **Human H01** — fragmento cortical humano medido em resolução sináptica; não é conectoma humano inteiro.
- **Macaque** — atlas cortical, spatial transcriptomics, projectomes PFC e priors de claustro; proxy de primata, não medição humana.
- **Drosophila / FlyWire** — motifs de conectoma brain-wide, sensorimotor e action-selection.
- **C. elegans** — conectoma anatômico de animal inteiro para circuitos compactos recorrentes e sensor→interneuron→motor.
- **Mouse / MICrONS + Allen** — conectômica estrutural+funcional densa em volume do córtex visual, com atlas anatômico como framework; não é cérebro inteiro do camundongo.
- **Larval zebrafish** — volume EM de cérebro inteiro com sinapses detectáveis e circuitos reconstruídos/validados; isso não implica que todas as células/sinapses estejam completamente proofread ou funcionalmente caracterizadas.
- **Ciona intestinalis** — conectoma publicado do SNC larval; referência compacta de cordado para assimetria, relay sensorial e cérebro→motor.
- **Platynereis dumerilii** — conectoma sináptico publicado de corpo inteiro da larva segmentada; referência para coordenação distribuída, segmentos e efetores.

Implementação central: `src/lib/biointelligence-fabric.ts`.

Cada experiência produz sinais separados por espécie — atenção, novidade, memória, inibição, ação, sensório, social e prediction — e depois uma fusão ponderada. Divergência entre os controladores aumenta a utilidade de pesquisa/replay; nunca é descrita como votação de mentes biológicas.

### App inteiro como ambiente de aprendizado

`src/components/AppLearningObserver.tsx` está montado no root layout e observa transversalmente:
- rotas e abas;
- clicks/controles;
- submit/change sem armazenar valores;
- chamadas API, status e latência;
- erros de runtime/promises;
- estado interno do Studio;
- Build, Research, Media e Legal via rotas/API;
- Life Simulation, MiroFish e Organism Engine via eventos semânticos.

Fluxo:

`evento sanitizado → App Learning Ledger → BioIntelligence ensemble → Digital Brain → research gap / experiência → continuous-learning → proposta/testes/review`

O ledger local **não** armazena valores de formulário, senhas, tokens, cookies, authorization headers, conteúdo de mensagens ou conteúdo de arquivos.

### Relação com biocomputação

Este módulo é **bio-inspired computation**: modelos de software derivados de dados neurocientíficos. Ele pode servir como laboratório computacional comparativo e como controlador para autoaprendizado, mas não deve ser chamado de tecido neural vivo, organoide, wetware ou biocomputador físico.

A diferença deve permanecer explícita:
- biocomputação física usa substrato biológico real;
- BioIntelligence do PredictLM usa software + dados/priors biológicos publicados.


## Unified BioAI + synthetic reservoir v4.1

Os núcleos comparativos deixaram de ser ilhas de produto. Eles alimentam uma única entidade persistente: **PredictLM BioAI**.

Arquivos:
- `src/lib/bioai.ts` — identidade/estado/memória única;
- `src/lib/bio-reservoir.ts` — reservatório recorrente spiking-inspired local;
- `src/lib/biointelligence-fabric.ts` — oito controladores comparativos;
- `src/lib/wetware-adapters.ts` — bridge experimental opcional.

O BioAI context é compartilhado por Chat, Build, Research, Imagine, vídeo, Processos, autoaprendizado, memória e simulação via `capability-fabric` e chamadas especializadas.

### Reservatório local

O reservatório é uma dinâmica computacional sintética de baixo custo:
- 48 unidades;
- potenciais/traços persistentes;
- firing rate;
- synchrony;
- prediction error;
- plasticity.

Ele não pretende reproduzir um organoide real. Seu papel é oferecer estado temporal e erro de previsão local mesmo sem LLM remoto, Supabase, GPU ou banco pago.

### Wetware opcional

Cortical Labs CL1 e FinalSpark podem ser ligados apenas como **I/O experimental autorizado**.

A operação padrão continua local. O produto deve funcionar sem hardware biológico.

Sempre separar:
- sinal eletrofisiológico medido;
- feature/decoder derivado;
- controlador BioAI;
- mundo/resposta simulada.

Atividade elétrica não é leitura de pensamento ou memória biográfica.

### BioAI no Voxel World

A BioAI possui um corpo/agente persistente no Voxel World. Ela observa estado local, escolhe metas, coleta recursos, crafta, constrói, combate quando adequado, explora chunks e consolida memória.

O viewport nativo principal é WebGL em primeira pessoa. O isométrico permanece como modo secundário de inspeção.
