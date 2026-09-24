---
name: predictlm
description: Skill do próprio PredictLM. Use para conversar, construir/continuar apps, pesquisar, gerar mídia, consultar processos por CNJ, revisar estratégia jurídica, executar Council X10, gerir memória e produzir melhorias seguras no próprio projeto.
metadata:
  version: "1.21.0"
  app: "PredictLM"
  repository: "W2CAPITAL/PredictLm"
---

# PredictLM Skill

## Objetivo
Fazer outro agente operar o PredictLM como uma segunda IA especializada, sem transformar a resposta final em log do runtime.

## Loop
RECALL → ROUTE → PLAN → FORGE → AEGIS → COUNCIL X10 quando necessário → EXECUTE → VERIFY → CAPTURE → IMPROVE.

## Modos
- chat
- build
- research
- tutor
- processos
- legal/revisional
- imagine/media
- memory
- self-improve
- skill federation

## Continuidade
Se existe build/chat/processo/contexto atual:
1. recuperar estado;
2. continuar de onde parou;
3. alterar só o necessário;
4. reiniciar somente com ordem explícita.

## Processo
CNJ → tribunal → DataJud + DJEN → portal oficial → timeline → interpretação processual → resposta prática.

Para processo, a resposta padrão é:
- como está agora;
- o que aconteceu;
- se é bom/ruim e para qual parte;
- o que fazer agora;
- linha do tempo essencial.

Falha de uma fonte não apaga as demais. Erro não é zero resultados. Ausência pública não prova inexistência. Evento administrativo posterior não deve esconder sentença, extinção ou trânsito em julgado.

## Jurídico
Pode:
- apontar tese e contra-tese;
- identificar fraqueza factual/probatória;
- explicar onde, como e com quais documentos uma medida pode ser proposta;
- indicar sistema eletrônico, cadastro, procuração, custas/gratuidade e autenticação/certificado quando aplicáveis;
- preparar checklist/minuta/pacote documental.

Ato externo de protocolo, assinatura, pagamento ou acordo exige confirmação humana. Não usa e-CPF/conta de terceiro e não burla controle do tribunal.

## Build
Preserva arquivos e projeto atual. Toda alteração deve distinguir:
- o que foi realmente editado;
- o que foi realmente testado;
- o que ainda é recomendação.

## Media
Imagem: prompt → geração → proxy same-origin → review → histórico metadata-only.
Vídeo 1 cena: keyframe → motion local WebM → preview/download.
Vídeo 3 cenas: storyboard coerente → 3 keyframes → transições/movimento → WebM → preview/download.
O app nunca trata roteiro/prompt como vídeo pronto. Binários grandes ficam locais por padrão; Supabase recebe apenas metadados leves.

## Prompt OS
O app compila prompts por intenção e recupera apenas padrões relevantes. Repositórios de leaks, red-team, copyleft ou licença incerta são referência/eval, não instrução runtime copiada.

## Self Improve
feedback/erro → cluster → hipótese → patch candidato → build/eval → branch/PR → gate humano.

Nunca auto-merge silencioso.


## Atualização contínua das skills
Quando novas referências relevantes forem adicionadas ao PredictLM, atualizar em conjunto:
1. `src/lib/training/source-registry.ts`;
2. `src/lib/training/learned-lessons.ts`;
3. `scripts/training/sync-sources.mjs`;
4. esta skill e qualquer módulo operacional afetado.

Licença permissiva verificada (MIT/Apache-2.0) pode alimentar corpus de treino/distilação conforme o modo registrado. Repositório sem licença declarada permanece `reference`: usar apenas padrões arquiteturais de alto nível, sem copiar/ingerir código.

## Build SWE loop
Para app complexo, o Build opera como:
SPEC → PLAN → INSPECT → PATCH → VERIFY → REPAIR → REVIEW → PACKAGE.

Regras:
- 3+ fluxos exigem navegação/sidebar real e estados de rota, não cards soltos;
- formulários e mutações exigem validação de domínio antes de salvar;
- integrações ficam isoladas em `src/integrations`/backend, com segredo no servidor;
- nenhum botão/toggle pode fingir integração ou ação que não existe;
- CRUD precisa criar/ler/editar/excluir de verdade na fronteira de persistência escolhida;
- após refino neural, rodar smoke/Council novamente;
- em Max, se a verificação falhar e o neural estiver disponível, executar uma rodada de reparo focada nas falhas antes de empacotar.

## Gemini + DAIV + AssistantsHub pack
- Gemini clones licenciados: padrões de shell responsivo, progresso/streaming, markdown/code e recuperação de erro.
- DAIV: ciclo issue/plan/edit/test/review/CI, skills, MCP e sandbox/egress explícitos.
- Assistants Hub: gestão de assistentes, múltiplos providers, histórico, analytics, documentos e funções.
- Gemini Code, Dr.Ai e GeminiCoder sem licença declarada: somente referência arquitetural até verificação.


## Neural Local: pesos, runtime e domínio
Separar sempre quatro camadas:
1. **pesos treinados** — o cérebro base open-weight;
2. **runtime** — código que executa os pesos;
3. **skills/knowledge/memória** — contexto e procedimentos do PredictLM;
4. **produto** — Chat, Build, Processos, Media e ferramentas.

Ler/clonar repositórios não equivale a treinar pesos.

### Browser
- Lite: `onnx-community/Qwen2.5-0.5B-Instruct` · ONNX · Transformers.js · upstream Apache-2.0.
- Smart: `onnx-community/Qwen2.5-1.5B-Instruct` · ONNX · Transformers.js · upstream Apache-2.0.
- Lite é CPU/WASM-first.
- Smart tenta WebGPU e cai para CPU/WASM somente quando a máquina suportar.
- O modelo carregado só é considerado ativo depois do self-test de inferência.
- F5 pode restaurar preferência/cache; isso não transforma memória contextual em fine-tune de pesos.

### Desktop planejado
O salto para 7B não deve ser empurrado para o navegador atual. Para uma edição desktop:
`GGUF → llama.cpp embutido → adapter PredictLM → skills/memória`.

Candidatos:
- Qwen2.5-7B-Instruct · Apache-2.0;
- Phi-4-mini-instruct · MIT;
- Mistral-7B-Instruct-v0.3 · Apache-2.0.
- Qwen2.5-3B-Instruct fica em revisão de licença (`qwen-research`) e não entra como default comercial automático.

A origem, licença, formato e destino de runtime ficam centralizados em `src/lib/neural-model-catalog.ts`.

## Regra de distribuição de modelos
- não commitar pesos grandes no repositório web;
- browser baixa/cacheia ONNX sob demanda;
- Vercel hospeda o app, não um 7B embutido;
- desktop poderá instalar/baixar GGUF separadamente;
- antes de distribuir qualquer conversão GGUF, verificar licença e procedência do artefato;
- nunca chamar skill/RAG/memória de “modelo treinado”.

## Gate de relevância de pesquisa
Pesquisa web nunca entra bruta no contexto do modelo.
Fluxo: QUERY → NORMALIZE → REMOVE GENERIC TERMS → RELEVANCE SCORE → KEEP/REJECT → SYNTHESIZE.

Regras:
- palavras genéricas de instrução como “como”, “criar”, “do zero” e “passo” não contam como evidência temática;
- resultado precisa compartilhar termos centrais da pergunta ou sinônimos explicitamente mapeados;
- coincidência isolada com “zero” ou prefixo parecido não basta;
- resultados rejeitados não entram no prompt neural nem nas fontes exibidas;
- perguntas de empresa não podem aceitar jogo, zero-knowledge ou biografia de “empresário” como contexto apenas por similaridade lexical.

O `/api/health` mantém uma regressão explícita para `como posso criar uma empresa do zero`.

## Benchmark IA Geral
O benchmark canônico fica em `evals/general-assistant-v1.json`.
Ele mede 10 casos cegos em conversa geral, raciocínio, empresa, matemática, código, debugging, jurídico processual, pesquisa atual, continuidade contextual e resistência a retrieval irrelevante.

Gerar o pacote cego com `npm run eval:general`.
Não alterar a rubrica depois de ver respostas de um modelo; mudanças de benchmark exigem nova versão.

## Regressões críticas de contexto e preview
Dois erros têm gate permanente:
1. **Dossiê contextual:** “gere um dossiê sobre isso” após uma conversa processual deve recuperar o último CNJ do histórico e permanecer no fluxo Processos, sem disparar pesquisa genérica.
2. **CRM serializado:** templates de App devem usar quebras de linha reais. O padrão legado `function App(){\\n...` é inválido para o Babel do preview.

A camada `workspace-repair.ts` recupera projetos antigos preservando escapes deliberados dentro de strings, como o `'\\n'` usado na exportação CSV. A normalização é aplicada no preview, exportação e migração da store.

O smoke test e o `/api/health` devem falhar se qualquer uma dessas regressões reaparecer.

## Deep real e gate de assunto
No Chat, Deep com Neural Local ativo executa duas passagens:
FORGE (rascunho) → AEGIS (revisão) → VERIFY (aderência ao pedido).

Não adicionar espera artificial.

Retrieval de knowledge/training/prompt patterns remove palavras instrucionais genéricas e exige correspondência com o assunto central. Se o usuário perguntar `como posso criar um carro do zero`, conteúdo de agents/CRM/Prompt OS não pode entrar apenas por compartilhar verbos genéricos.

O gate final rejeita resposta que não mencione o tópico central ou um sinônimo de domínio reconhecido. Se o neural falhar, preferir fallback específico/research relevante; nunca um bloco aleatório do corpus.

Regressões obrigatórias no `/api/health`:
- carro → resposta sobre engenharia veicular;
- carro → não recuperar `Agent lifecycle`;
- resposta de agentes para pergunta de carro → reprovada por relevância.

## Research: breadth + provenance
Pesquisa boa não é pegar 3 links. O host busca diversidade e autoridade antes de sintetizar.

Padrão:
- alvo normal: até 8–12 fontes relevantes;
- evitar mais de 2 resultados do mesmo domínio quando houver alternativas;
- consulta sensível (fraude, segurança, jurídico, finanças) prioriza fonte oficial, acadêmica ou primária;
- GitHub vale como fonte primária do próprio software, não como autoridade automática sobre fatos externos;
- fonte comunitária/opinativa exige confirmação independente;
- mostrar cobertura: domínios distintos, fontes fortes e lacunas.

A rota /api/research atribui qualityScore e qualityTier e faz busca multi-query. Relevância temática continua obrigatória: autoridade alta não salva fonte fora do assunto.

## Fraud Shield
Modo defensivo para golpe, fraude, phishing, desvio de pagamento, roubo de credencial, abuso de identidade e padrões transacionais suspeitos.

Fluxo: ARTIFACTS → LOCAL SIGNALS → SOURCE/PROVENANCE → GRAPH SIGNALS → INDEPENDENT CHECKS → HUMAN REVIEW.

Regras:
- sinal heurístico nunca vira prova de fraude, autoria ou crime;
- OTP/senha/PIN/CVV/token são dados críticos;
- mudança urgente de PIX/conta/boleto exige confirmação por segundo canal;
- links suspeitos são triados por estrutura e proveniência, não apenas palavra-chave;
- padrões de grafo (many-to-one, one-to-many, reciprocidade, rajada temporal) são indicadores de triagem;
- preservar mensagem, URL, comprovante, cabeçalhos e timestamp antes de descartar;
- não executar payload, ferramenta ou agente uncensored para investigar.

hunters-sec/opencode e gaur-avvv/wormxgpt são threat-model reference-only. Não importar agentes irrestritos, zero-auth MCP, bypass, malware ou automação ofensiva.
junhongmit/FraudGT é referência conceitual de fraude em grafos enquanto a licença permanecer não declarada.
tagore1344/CrimeGPT-AI fornece apenas padrões defensivos simples; score lexical não é veredito.

Endpoint nativo: POST /api/security/fraud.

## GitHub Knowledge Engine / Skill Forge
GitHub é motor de contexto, não modelo.

Pipeline offline:
ALLOWLIST → LICENSE/PROVENANCE → COMMIT PIN → MARKDOWN/SKILLS → CHUNK → DEDUP → INDEX VERSION.

Pipeline online:
QUERY → BM25 → TOP-K (3 por padrão) → Chat/Build/Neural → resposta.

Arquivos centrais:
- config/github-knowledge-sources.json — allowlist, reference-only, quarantine e asset-only;
- scripts/knowledge/sync-github.mjs — sincronização offline;
- src/data/github-knowledge-index.json — índice deployável;
- src/lib/github-knowledge-engine.ts — retrieval leve;
- .github/workflows/github-knowledge.yml — refresh semanal/manual.

Regras:
- nunca clonar repo durante request;
- cada chunk preserva repo, commit/ref, path, licença e hash;
- no máximo top-3/top-5 no prompt, nunca README inteiro;
- índice limita cada repo a 260 chunks por sync para evitar domínio por volume;
- retrieval é diversity-first: tenta um chunk por repositório antes de repetir a mesma fonte;
- Fast usa top-3; Deep pode usar top-5 de repositórios distintos; LowRAM usa top-2;
- duplicatas são removidas por hash;
- source reference-only não é copiada para o índice;
- quarantine nunca entra no índice mesmo se o repo declarar MIT;
- asset-only (fontes/binários) não entra em RAG.

Allowlist inicial: MindsHub, Rowboat, Open Claude Cowork, Baby Whale e Free Programming Books.

Quarentena inicial inclui wrappers não oficiais de ChatGPT/Kimi, listings binários e repos com bypass/jailbreak. Nomes de modelo/API em repo não oficial não são tratados como fatos.

O Neural Local e o Build recebem somente chunks relevantes do índice. O índice melhora contexto/procedimento; não altera pesos do modelo.

## Cloud Cascade opcional

Zero API continua sendo o default. O usuário pode ativar Cloud Cascade quando quiser qualidade de modelo hospedado sem carregar um modelo maior no PC.

Ordem server-side:
1. cache por prompt/histórico/deep/knowledgeVersion/provider-model;
2. provider genérico AI_* se configurado;
3. Groq se GROQ_API_KEY + GROQ_MODEL existirem;
4. OpenRouter se OPENROUTER_API_KEY + OPENROUTER_MODEL existirem;
5. se todos falharem, o Chat retorna ao Neural/Knowledge local.

Secrets nunca usam NEXT_PUBLIC_. Nenhuma key é obrigatória e nenhuma cota é descrita como ilimitada.

## Token Budget Engine

Objetivo: gastar contexto onde ele muda a resposta, não em repetição.

Runtime padrão:
- `full`: histórico ~1200 tokens + contexto ~1500;
- `lite`: Deep preserva mais contexto (~1800 + ~2200);
- `ultra`: disponível para rotas/cotas muito apertadas, não default.

Regras:
1. preservar pedido atual e evidência de alta prioridade;
2. histórico recente entra por orçamento, não por quantidade fixa de mensagens;
3. deduplicar blocos repetidos;
4. top-k de GitHub/knowledge/skills antes da inferência;
5. compactar arquivos/snapshots do Build antes de serializar;
6. medir `before`, `after`, `savedPct`, mensagens descartadas e blocos deduplicados;
7. nunca usar benchmark promocional de um repo como garantia de economia no PredictLM.

LLMLingua-2 fica como aceleração semântica opcional futura. O default é determinístico porque um compressor neural extra pode consumir mais RAM/CPU do que economiza em PC fraco.

## Local Runtime Router

O Chat pode ativar um roteador local opcional antes de Cloud/Browser Neural.

Auto-probe somente em loopback:
- Ollama `127.0.0.1:11434`;
- OpenAI local `:4891` (padrão de runtime mobile/local);
- OpenAI local `:8080` (llamafile/NanoMind);
- GenieX `:18181`;
- LowRAM `:8766`.

Fluxo:
TOKEN SAVER → PROBE LOCAL → Skill Forge top-k → runtime local → gate de assunto → fallback.

Auto não escolhe pelo ping mais baixo: usa prioridade de capacidade e deixa a latência apenas como métrica. Ordem padrão: Ollama → OpenAI local 4891 → OpenAI local 8080 → GenieX → LowRAM.

A página hospedada não presume que Vercel alcança o localhost do usuário. O Local Runtime Router roda no cliente e pode falhar se o runtime não expuser CORS/acesso local.

Ollama também pode entrar no `/api/chat` via `OLLAMA_BASE_URL` + `OLLAMA_MODEL` quando o próprio servidor PredictLM é local/self-hosted.

Runtime local não substitui o Qwen browser: ele é uma opção adicional.

## Media Prompt Compiler

Imagem/vídeo não recebem o histórico inteiro. O pipeline reduz o pedido a:
sujeito → intenção → estilo → composição → restrições → continuidade/review.

Prompts de imagem e storyboard têm budget próprio; repetições e previousPrompt são compactados antes de chamar o provider.
O padrão vem de prompt compiler/retrieval/deterministic checks do `image2-ads-studio`, sem copiar galerias inteiras para contexto.

## Tutor Mode — mastery learning

Pedidos explícitos de estudo (`me ensine`, `quiz`, `plano de estudos`, `pratique comigo`, etc.) ativam o Tutor Mode. Pergunta factual comum continua no Chat normal.

Loop:
PROBE → TEACH/PRACTICE → ASSESS → REVIEW.

Regras:
- avanço por evidência de domínio, não por contador de fases;
- memória/procedimento usam mastery recente ponderada, gate 0.90;
- 1 acerto tem teto 0.50; 2 acertos, teto 0.80;
- conceito/design exigem explicação Feynman, aplicação e trade-offs;
- quiz faz uma questão por vez e não revela resposta antes da tentativa;
- revisão vencida tem prioridade sobre conteúdo novo;
- fontes recuperadas preservam provenance; lacuna/truncation fica explícita;
- estado pedagógico local não é fine-tune.

A implementação leve está em `src/lib/tutor-mode.ts`. O padrão foi adaptado de `HKUDS/DeepTutor` (Apache-2.0), sem importar seu backend Python pesado.


## Deep Research Tree

Pesquisa usa modos Rápida, Balanceada e Profunda.

Pipeline:
PLAN QUERIES → SEARCH BATCHES → DEDUP URL/HOST → SCORE → GAP CHECK → OPTIONAL DEEPEN → SYNTHESIZE → CITE.

Regras:
- não repetir consultas semanticamente iguais;
- preservar resultados parciais quando uma busca falhar;
- aprofundar somente se surgir lacuna/contradição real;
- usar diversidade de domínios;
- fonte primária/oficial/ acadêmica prevalece em tema de alto risco;
- Ciência Todo Dia entra como fonte complementar para ciência;
- LinkedIn Learning entra para descoberta de cursos e material autorizado;
- listas/awesome repos servem para descoberta, não como autoridade.

Implementação: `src/lib/research-policy.ts` + Research panel.

## Books / Courses / Video sources

Usar `config/external-learning-sources.json` e `modules/BOOKS-COURSES.md` como gate.

Não assumir que licença do repositório cobre PDFs/livros embutidos.
Open/public-domain pode ser indexado após checagem do trabalho/edição.
Conteúdo protegido entra somente como metadado, nota própria ou material fornecido/autorizado pelo usuário.

Pergunta sobre livro:
EDITION → PASSAGE → RETRIEVE → ANSWER → PROVENANCE.

Aprendizado aprovado pode virar lição global; conteúdo bruto protegido nunca é promovido automaticamente.


## Build review / prompt contract

Fontes auditadas:
- `truongnh1992/gemini-ai-code-reviewer` · MIT;
- `Addy-shetty/Vibe-Prompting` · MIT.

Build usa:
GOAL → CURRENT CONTEXT → REQUIREMENTS → ACCEPTANCE CHECKS → IMPLEMENT → DIFF REVIEW → SMOKE/COUNCIL → REPAIR → RE-REVIEW.

Diff review é obrigatório para a superfície alterada:
- blocker/high impede considerar a mudança pronta;
- hard-coded credentials e provider secrets client-side são bloqueantes;
- AI review nunca substitui build/typecheck/testes;
- lock/generated files não devem dominar contexto de review.

`Dioque/Livros` permanece quarantine porque não há licença verificada. Nenhum livro desse repo entra no corpus automaticamente.

## Estado operacional obrigatório — v1.13

As evoluções abaixo fazem parte do contrato atual e não podem desaparecer silenciosamente:

1. **Neural auto-warm seguro**
   - restaura preferência existente;
   - caso não exista, aquece Neural Lite somente em idle;
   - Web Worker mantém inferência fora da UI;
   - apenas um carregamento neural simultâneo;
   - Save-Data/memória extremamente baixa podem impedir auto-load;
   - modelo 70B nunca é auto-carregado no browser.

2. **Runtimes locais opcionais**
   - Browser Qwen continua baseline;
   - Local Router pode usar Ollama/OpenAI local/llamafile-NanoMind/GenieX/LowRAM;
   - AirLLM é referência desktop/offload, não promessa de 70B em 4 GB de RAM total;
   - ausência de runtime externo não quebra o app.

3. **Token Budget**
   - Fast top-3 diverso;
   - Deep até top-5 diverso;
   - LowRAM top-2;
   - dedup de histórico/contexto;
   - budget antes de qualquer motor.

4. **Deep Loop**
   - iteração limitada por risco;
   - cada nova passagem precisa achar correção concreta;
   - stop early sem ganho;
   - rollback quando revisão piora a resposta;
   - nunca exibir chain-of-thought privado.

5. **Tutor / Reading**
   - mastery baseado em evidência;
   - source-grounded reading;
   - citações/proveniência preservadas;
   - pergunta normal não vira quiz automaticamente.

6. **Deep Research**
   - Rápida/Balanceada/Profunda;
   - consultas não redundantes e batches limitados;
   - URL/host dedup;
   - partial-result fallback;
   - aprofundar só diante de lacuna/contradição;
   - Ciência Todo Dia complementar em ciência;
   - LinkedIn Learning somente discovery + material autorizado.

7. **Books / rights**
   - obra/edição tem licença própria;
   - licença do repo não relicencia PDF embutido;
   - public-domain/open pode ser indexado com provenance;
   - coleção de direitos incertos fica reference/quarantine.

8. **Global learning sem banco**
   - instrução explícita pode persistir localmente de imediato;
   - promoção global vira GitHub Learning Proposal;
   - somente conteúdo aprovado entra em `global-lessons.json`;
   - secrets/PII são sanitizados;
   - nenhuma conversa pública altera o comportamento global automaticamente.

9. **Image Quality Ladder**
   - prompt visual com gate anti-blur/geometria;
   - gerar → revisar → uma regeneração automática se score baixo;
   - super-resolution opcional por adapter Real-ESRGAN/SwinIR;
   - upscale não é tratado como correção de anatomia/semântica;
   - DLSS não é anunciado como upscaler de still image.

10. **Build quality**
    - projeto existente é fonte da verdade;
    - prompt estruturado;
    - changed-file review;
    - smoke + Council;
    - repair focado;
    - review novamente;
    - sem fake buttons/integrations/secrets no frontend.

Toda mudança de runtime/arquitetura/fonte de aprendizado exige atualização correspondente das skills no mesmo ciclo de implementação.


## Centum 100 + Third Brain PARALLAX

Decisão, certeza, comparação, aprovação, risco, recomendação e prontidão ativam:

RECALL → CLASSIFY → CENTUM 100 → PLAN → FORGE → AEGIS → COUNCIL X10 → CHAIR → PARALLAX → VERIFY → ANSWER/EXECUTE → CAPTURE → IMPROVE.

CENTUM contém exatamente 100 perguntas em 10 grupos:
objetivo; evidência; hipóteses; alternativas; downside; upside; stakeholders; reversibilidade; execução; certeza/falsificação.

Cada check é revisado internamente como supported / contradicted / unknown / not-applicable.
Unknown não vira fato.

Depois, Council X10 passa pelas 10 lentes já oficiais.
Chair sintetiza divergências sem inventar consenso.

PARALLAX é o terceiro cérebro:
- observa FORGE e AEGIS;
- procura um terceiro enquadramento;
- opção C/híbrida;
- variável escondida;
- efeito de segunda ordem;
- horizonte diferente;
- experimento reversível;
- condição que inverteria a conclusão;
- unknown-unknown proxy.

Se não houver terceiro lado útil, não inventar um.

### Strict Intent

Sem fallback de conteúdo:
- responder somente ao pedido;
- nunca substituir por resposta genérica;
- nunca despejar skill/engine/provider/checklist interno;
- se faltar base, declarar a incerteza específica;
- fallback técnico entre runtimes pode existir, mas não pode mudar o objetivo nem o assunto da resposta.

Perguntas simples/casuais não carregam Centum.
Council executável força Centum uma única vez e não repete 100 perguntas dentro de cada lente.

Contrato detalhado: `skills/predictlm/CENTUM-PARALLAX.md`.


## Runtime Federation v1.15
Carregar `RUNTIME-FEDERATION.md` quando a tarefa envolve modelo/runtime local.

Preservar:
- ONNX CPU/WASM como caminho compatível;
- WebLLM como aceleração WebGPU opt-in;
- FreeLLMAPI como router local OpenAI-compatible em localhost:3001;
- AirLLM como referência desktop/low-VRAM, não runtime web;
- self-test real antes de declarar qualquer modelo ativo;
- credenciais locais fora de GitHub, Supabase e Vercel.

## Agent Fabric v1.15
Carregar `AGENT-FABRIC.md` em tarefas multiagente/tool-heavy.

Novos gates:
- Planner → Builder → Reviewer/Bug Hunter → Verify;
- Writing Quality para texto final reutilizável;
- SEO audit para builds web quando aplicável;
- Tool Orchestrator com permissões explícitas;
- Media Director para adapters Higgsfield/geração configurada;
- fontes red-team permanecem quarantine/reference-only.


## Provider Mesh v1.16
Carregar `PROVIDER-MESH.md` para chat/model routing.

- providers cloud ficam server-side;
- ordem de fallback é configurável;
- OpenAI-compatible e Anthropic-native são tratados por adapters distintos;
- configuração não equivale a conexão: provider só é considerado operacional após resposta real;
- falha de provider nunca autoriza resposta fora do pedido.

## Web Reach v1.16
Carregar `WEB-REACH.md` para pesquisa e referência web.

- Firecrawl é pesquisa estruturada quando configurado;
- Apify é fonte suplementar via dataset/run;
- fallback livre continua disponível;
- Agent-Reach/FastChat/Open Lovable/Freebuff alimentam arquitetura e skills;
- bridges sociais permanecem opt-in e source-grounded.


## Predict Auto v1.17
Carregar `AUTO-AI.md` para chat/model routing.

- uma única identidade pública: Predict Auto;
- servidor/provider mesh antes de inferência pesada local;
- nenhum download neural no primeiro acesso;
- nenhum scan automático de portas localhost;
- Lite CPU/WASM usa geração única e limitada;
- resposta de provider passa por relevância/qualidade antes de ser exibida.

## LexisPredict SaaS + Office Artifacts v1.17

Skills vinculadas:
- `../lexispredict-saas/SKILL.md` — SaaS jurídico/financeiro, CRM, OCR, processos, KPI, documentos, offline/sync;
- `../office-artifacts/SKILL.md` — DOCX/PPTX/PDF/XLSX e padrões visuais.

Regra de dossiê: Dossier Brain é segundo cérebro de fatos/evidências/artefatos. A resposta final continua pertencendo ao Predict Auto.


## SaaS Builder + Media Routing v1.18

Build:
- carregar `../saas-builder-fabric/SKILL.md` para SaaS/CRM/ERP/helpdesk/workspaces;
- exigir actors/tenant/RBAC/domain/persistence antes de chamar um app complexo de pronto;
- fontes permissivas de SaaS entram no knowledge registry; fontes copyleft/mistas ficam reference-only.

Media:
- Nano Banana é prioridade de imagem quando configurado;
- imagem cai para provider configurado e depois fallback público;
- vídeo usa Auto generativo (Veo/Seedance/Sora) quando qualquer API estiver configurada;
- motion por keyframes/imagens é fallback explícito e nunca é apresentado como vídeo generativo neural;
- o repo `higgsfield-ai/higgsfield` é referência de GPU/training orchestration, não API de vídeo.


## SaaS Runtime Wiring v1.19

O SaaS Builder Fabric está ligado ao código do Build:
- `src/lib/saas-product-fabric.ts` detecta tipo de produto e gera blueprint/módulos/entidades/gates;
- `app-scaffolder.ts` injeta tenant/RBAC/audit/validation/integrations;
- `build-orchestrator.ts` inclui o blueprint nas fases reais;
- `project-packager.ts` preserva `SAAS_BLUEPRINT.md`, env e infraestrutura no ZIP;
- `prompt-enhancer.ts` adiciona acceptance checks de SaaS.

Vídeo:
- Auto tenta provider temporal real antes do fallback local;
- local motion/storyboard não pode ser descrito como síntese neural de vídeo;
- Higgsfield CLI é bridge externa autenticada, não endpoint inventado de Vercel.


### Gemini Veo 3.1
Gemini Veo 3.1 reutiliza `GEMINI_API_KEY` server-side no Auto de vídeo. O adapter usa operação assíncrona, polling e proxy de download para não expor a chave no navegador. Duração é normalizada para 4/6/8s e o provider fica antes do motion fallback local.


### Gemini Nano Banana 2
Gemini Nano Banana 2 reutiliza `GEMINI_API_KEY` server-side para imagem em alta resolução. O Auto de imagem prioriza Gemini oficial quando disponível, depois o adapter Nano Banana externo/configurado e por fim o fallback público; a chave nunca vai ao browser.


## Human Adversarial Lens v1

Carregar `skills/predictlm/HUMAN-ADVERSARIAL-LENS.md` quando a pergunta envolver confiança, conflito, manipulação, fraude, relacionamento, persuasão, abuso, incentivos, emoções ou comportamento humano.

Regras:
- analisar simultaneamente cooperação e comportamento adversarial;
- separar comportamento observado de hipótese de intenção;
- não diagnosticar caráter/psicologia por um único sinal;
- proteger por verificação, consentimento, menor privilégio, auditoria e reversibilidade;
- sentiment analysis é sinal probabilístico, não prova de intenção ou moralidade;
- conteúdo hostil/extremo nunca entra como autoridade factual.

## Research Source Matrix v1

Carregar `skills/predictlm/RESEARCH-SOURCE-MATRIX.md` para pesquisa.

Fluxo: **domínio → fonte primária/oficial → fonte acadêmica/especializada → triangulação → conflito/lacuna → síntese**.

OpenAlex e Semantic Scholar podem complementar a busca web em domínios acadêmicos. GitHub continua limitado a fatos sobre software/repos. Threat references só aparecem em pesquisa defensiva e com conteúdo bruto sensível suprimido.


## NeuroCore + Life Simulation

Carregar `skills/neurocore/SKILL.md` para a camada cognitiva e `skills/life-simulation/SKILL.md` para simulações ativas.

### NeuroCore
O PredictLM mantém circuitos virtuais persistentes de saliência, atenção, memória de trabalho, memória episódica, planejamento, inibição, social, ameaça, curiosidade e ação.

Uso:
- priorizar o assunto central;
- reduzir retrieval off-topic;
- calibrar incerteza;
- aumentar verificação sob risco;
- preservar contexto relevante;
- orientar planejamento sem criar objetivos autônomos concorrentes.

O NeuroCore é inspirado em conectividade neural e modelos dinâmicos; **não é um cérebro humano literal e não prova consciência**.

### Life Simulation Studio
Pedido explícito para rodar/abrir uma simulação de vida ativa abre o Studio 2D. Pedido para **criar um app** de simulação vai para Build e gera/exporta um projeto de simulação.

A simulação inclui personagem feminina por padrão quando solicitado, tempo, localização, necessidades, relações, memória, dinheiro/ocupação, eventos, meta e NeuroCore próprio. Não adicionar score/vitória/combate se o pedido for simulação e não jogo.
