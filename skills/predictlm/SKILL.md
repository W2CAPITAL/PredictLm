---
name: predictlm
description: Skill do próprio PredictLM. Use para conversar, construir/continuar apps, pesquisar, gerar mídia, consultar processos por CNJ, revisar estratégia jurídica, executar Council X10, gerir memória e produzir melhorias seguras no próprio projeto.
metadata:
  version: "1.9.0"
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
