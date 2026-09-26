---
name: grok-imagine-parity
description: >
  Contrato para qualquer IA gerar imagem no padrao Grok Imagine: executar geracao
  de verdade (nao so descrever), expandir pedido curto em prompt cinematografico
  em ingles, entregar imagem + legenda curta em pt-BR, variacoes e regenerar.
  Use when the user pede imagem, desenho, arte, gerar imagem, Grok Imagine,
  ilustracao, capa, cena anime/realista, ou quando PredictLM/outro host so descreve
  em vez de gerar. Integra com predictlm-master na rota midia.
metadata:
  version: "2.3.0"
  pairs_with: "predictlm-master"
  does_not_replace: "actual image model weights or API keys"
---

# Grok Imagine Parity

## Verdade dura (nao delirar)

Uma **skill nao e o modelo de imagem**.

| Onde | O que a skill faz | O que a skill NAO faz |
|------|-------------------|------------------------|
| Grok | Padroniza prompt + o host **chama** Grok Imagine | — |
| PredictLM / outro app | Padroniza prompt + obriga o host a chamar **API real** (Flux, SD, Ideogram, etc.) | Nao cria pixels sozinha |
| Chat sem ferramenta de imagem | Expandir prompt + dizer a limitacao | Nao fingir que gerou arquivo |

Se o host **nao tem** gerador ligado, a resposta correta e: entregar o **prompt pronto** + dizer qual provider configurar — **nunca** inventar URL de imagem falsa.

## Quando o usuario pede imagem

1. **CLASSIFY** rota `media/image`.
2. **CALIBRATE** prompt mode: `auto | literal | imagine`.
3. **EXPAND** apenas quando o modo efetivo for Imagine.
4. **GROUND** identidade/referencias visualmente quando houver personagem/entidade especifica.
5. **GENERATE** com a ferramenta real do host (obrigatorio se existir).
6. **CAPTION** em pt-BR: 1–2 frases do que a cena representa (nao repetir o prompt inteiro).
7. Se pedir varias: 2–4 variacoes (seed/angulo/estilo), nao 12 cards lixo.
8. Se a geracao falhar: erro objetivo + prompt reutilizavel.

## Prompt modes

### Auto
- personagem/franquia/entidade especifica → **Literal**;
- pedido generico/conceitual → **Imagine**.

### Literal
Usar quando o expander esta mudando o sujeito, adicionando binario/circuitos/realismo indevido ou inventando detalhes.

Contrato:
- preservar o texto do usuario como nucleo;
- zero reescrita criativa;
- estilo so altera renderizacao, nunca identidade/conteudo;
- Firecrawl/reference images + identity lock continuam ativos;
- negative prompt continua ativo;
- Deep Think/Research nao injetam texto no prompt da imagem;
- regenerar = novo seed com o mesmo pedido literal, sem adicionar lore/props.

### Imagine
Usar o template cinematografico abaixo. O pedido original continua soberano.

## Diferenca observada (PredictLM vs Grok)

Sintomas tipicos no PredictLM:
- muitas miniaturas parecidas, prompt quase igual ao texto do usuario;
- modo "Cinematic/Photoreal/Anime" como botao, mas composicao fraca;
- Susanoo/Kurama trocados, anatomia ou confronto sem impacto;
- regenerar = quase o mesmo frame.

Padrao Grok Imagine bem usado:
- **um** frame forte (ou poucas variacoes boas);
- prompt expandido quando ele ajuda;
- assunto central nitido;
- imagem + legenda curta;
- modo literal quando expansao piora fidelidade.

## Template de expansao de prompt (Imagine)

Estrutura:

```
[subject A action] versus [subject B action],
[signature powers / forms],
[camera: angle, distance, lens feel],
[environment + debris + atmosphere],
[lighting: rim, volumetric, color contrast],
[art style: e.g. anime shonen key visual / cinematic illustration],
[quality: highly detailed, sharp focus, masterpiece],
[negatives if supported: blurry, extra limbs, watermark, text]
```

### Exemplo — pedido curto
Usuario: `naruto kurama lutando contra sasuke susanoo perfeito`

Prompt expandido (modelo):
```
Epic anime battle key visual, Naruto in Nine-Tails Chakra Mode with Kurama
nine-tailed fox manifestation behind him, orange-red chakra cloak, charging
Tailed Beast Rasengan, versus Sasuke Uchiha with complete Susanoo armor
ethereal purple warrior and blade, clash center frame, shockwave and debris,
dramatic low angle, volumetric light, orange vs violet contrast, premium
anime key visual, highly detailed, sharp focus, no watermark no text
```

Legenda:
`Naruto em modo Kurama no embate direto com o Susanoo completo do Sasuke.`

## Referencias: Firecrawl-first

Nao exigir Google Cloud Console.

Ordem:
`Firecrawl Images → Firecrawl site:pinterest.com/pin/ → Google opcional → identity lock textual`.

A ausencia de Google CSE nao deve virar erro/warning para quem ja tem `FIRECRAWL_API_KEY`.

## Regras de fidelidade (anime / personagens)

- Respeitar **formas pedidas**.
- Cores assinatura e silhueta corretas.
- Conflito legivel.
- Nao transformar personagem nomeado em arquétipo generico.
- Se o modelo trocar personagens: regenerar com seed novo e constraints melhores; no Literal, manter o pedido sem expansao inventiva.

## Imagem + texto (Grok-like)

Depois que a imagem real existir:
- exibir a imagem;
- gerar uma legenda/descricao curta em pt-BR;
- nao colar o prompt tecnico como resposta principal;
- a legenda nao deve inventar elementos fora do pedido/brief se nao houver visao multimodal do arquivo final.

## Integracao PredictLM

1. Provider real em `media/generate`.
2. `prompt_original` + `prompt_expanded` preservados.
3. `style` entra no prompt.
4. `promptMode` e `negativePrompt` ficam auditaveis.
5. `Regenerar melhor` usa novo seed; no Imagine pode refinar prompt, no Literal nao reescreve.
6. Score tecnico nunca significa fidelidade semantica perfeita.
7. Firecrawl e referencias visuais entram antes do provider quando a identidade for especifica.
8. A resposta da superficie Imagine mostra imagem + texto curto.

## Quando NAO ha gerador no host

1. Entregar prompt pronto.
2. Dizer que nao houve arquivo.
3. Nunca inventar URL/imagem.

## Checklist rapido

- [ ] Pedido entendido
- [ ] Prompt mode calibrado
- [ ] Identity/reference grounding aplicado
- [ ] Prompt expandido somente quando apropriado
- [ ] Ferramenta de imagem chamada OU limitacao declarada
- [ ] Legenda curta pt-BR
- [ ] Prompt original/expandido/seed/provider/model persistidos
- [ ] Sem fake URL / sem log de runtime


## Media Library limpa

A biblioteca não exibe prompt técnico como legenda.

Cada item deve separar:
- `promptOriginal`;
- `promptExpanded`;
- `displayTitle`;
- `caption`;
- `seed`, provider e model apenas como metadados.

Card:
- título amigável curto;
- legenda pt-BR limpa;
- estilo/aspecto discretos;
- nunca mostrar `[ESTILO]`, `Epic anime battle key visual`, `masterpiece`, `4k`, seed ou prompt interno como título.

Itens antigos são normalizados ao carregar para corrigir a UI sem depender de migração manual.

## Desambiguação de franquias

Casos que forçam Literal + referência Firecrawl:
- Freeza/Frieza → identidade canônica branca/roxa de Dragon Ball;
- Oozaru/“macaco de Dragon Ball” → Great Ape Saiyajin, não macaco comum ou demônio blindado;
- “Bijuu de quatro caudas do Naruto” → Son Goku Four-Tails de Naruto, nunca Goku humano de Dragon Ball;
- Naruto/Kurama vs Sasuke/Perfect Susanoo → dois combatentes distintos, laranja/dourado vs violeta.


## Defaults seguros do Imagine

Para imagem:
- Deep Think e Deep Research ficam **desligados por padrão**; continuam disponíveis como opt-in para pedidos conceituais;
- Auto força **Literal** para personagem/franquia específica;
- prompts de anime/shonen detectados com estilo ainda em Cinematic usam **Anime** automaticamente;
- o Media Director é proibido de inventar binário, redes neurais, circuitos, drones, hologramas, cyberpunk, robôs ou fendas dimensionais sem pedido explícito;
- regeneração em Literal preserva o mesmo pedido/identity lock e troca seed, sem review hints criativos;
- quando o provider final é `pollinations-proxy`, a UI mostra aviso explícito de fidelidade limitada;
- provider/upscaler são registrados separadamente para não mascarar que a imagem veio do fallback.

## Persistência de mídia sem Supabase

A Media Library do Imagine é **browser-local**:
- LocalStorage, até 60 itens;
- retenção leve de metadados/URLs, sem upload de binários;
- nenhum `PREDICT_SUPABASE_*` é necessário para mídia;
- URLs `data:`/blob não são persistidas para evitar encher o navegador;
- o endpoint server-side antigo de library fica apenas como compatibilidade e não lê/escreve Supabase.

## Grounding de pessoa real e anatomia de criatura

Auto/Literal também protege pedidos fora de franquias:

- pedidos curtos de uma **pessoa nomeada** são tratados como identidade específica, usam Firecrawl para referência visual quando disponível e recebem negative constraints contra robô, cyborg, alien, máscara/armadura e troca de rosto;
- se o estilo ainda estiver no default Cinematic, pessoa nomeada usa **Photoreal** automaticamente; escolha manual do usuário continua soberana;
- criaturas concretas como **dragão** também entram em Literal para impedir que o provider transforme a categoria pedida em outro animal;
- `dragão branco de olhos azuis` exige anatomia inequivocamente dracônica, escala fantástica, corpo/cabeça de dragão, branco predominante e olhos azuis; lagarto, gecko, iguana, cobra, dinossauro ou réptil comum entram no negative;
- no fallback Pollinations, Literal envia `enhance=false` para impedir uma segunda reescrita invisível do prompt pelo provider.

## Vídeo Gemini/Veo robusto

Veo usa geração assíncrona real. Quando imagens inline/reference são rejeitadas pelo modelo/configuração efetivamente ativa:

1. registrar o downgrade;
2. repetir **uma única vez** como texto→vídeo;
3. continuar sem 502 se o retry for aceito;
4. mostrar aviso de compatibilidade na UI;
5. nunca entrar em loop de retry.

Deep Think de mídia usa o modo interno `media-director`; falha dos providers de chat é uma melhoria opcional indisponível e retorna resposta vazia/200, não uma cascata de 502 que bloqueia vídeo.


## Chat, canonical media and animal vision (2026-09-24)

- Apply the shared public-answer gate to every runtime, recalled memory and cached answer. Reject weak local messages and non-procedural how-to responses. Never memorize rejected answers.
- Treat Web as permission. Search for explicit research, volatile facts and sensitive procedures; ordinary planting/cooking questions do not require retrieval. Reject anecdotes sharing a keyword with a procedure; maintain bounded per-prompt rejected-source memory.
- Naruto/Kurama vs Sasuke/Perfect Susanoo: preserve full avatars, distinct sides, nine tails, purple armor and wings. Include Valley of the End statues only when requested. Keep mandatory identity instructions through prompt compilation. Use separate subject/setting reference queries.
- Distinguish technical pixel review from semantic model review. Semantic review may fail or be unavailable; neither implies verified identity. Permit one automatic repair, preserve literal subject and record the outcome.
- Visão analyzes uploaded animal photos using a pinned quantized MobileNet in a dedicated one-thread CPU worker. Download only on request; support cancellation and model cache. Preserve top-five scores, non-animal classes and inconclusive results. This is whole-image classification, not detection, diagnosis, proof of safety or franchise identity recognition.
- Three optional inference adapters are in `services/animal-vision/`: HOG/SVM, PyTorch ResNet, Keras ResNet. Show unavailable until real trusted weights load. Do not claim the source README accuracy as app accuracy. Never deserialize HTTP model uploads or infer 150 supported classes from the rt75272 README (its checked-in current mapping has 15).
- Browser analysis keeps the photo on the device. Server analysis is an explicit user choice. No automatic photo persistence or Supabase upload. See `services/animal-vision/README.md` for model provenance, compatibility and deployment setup.


## Clean Chat / Strict Intent

Para mensagens simples, o PredictLM deve responder ao turno atual antes de usar a infraestrutura acumulada.

- Hipóteses do tipo `e se...`, `imagine se...` e `suponha que...` entram em rota **clean-chat**: provider + prompt atual + guard mínimo, sem GitHub RAG, Centum, PARALLAX, Digital Brain, livros ou contexto jurídico lateral.
- How-tos seguros conhecidos podem terminar em resposta prática interna sem pesquisa/provider.
- Factual estático conhecido pode terminar em resposta estável interna.
- Toda candidata clean-chat passa por public gate + aderência temática; resposta fora do assunto é descartada antes da UI.
- Web, tools, skills, bases e memória são recursos sob demanda; quantidade de contexto nunca é objetivo.
- Nunca preencher uma lacuna com conteúdo aleatório de outra base. Falhar limpo é preferível a responder outro assunto.

## Canonical battle composition

Para `Naruto + Kurama vs Sasuke + Perfect Susanoo`:
- Auto → Literal + Anime;
- se a proporção ainda estiver no default 1:1, usar 16:9 automaticamente; escolha manual continua soberana;
- Kurama deve ser avatar completo de raposa/chakra dourado com nove caudas distintas, não Naruto humanoide duplicado;
- Perfect Susanoo deve ser avatar humanoide blindado violeta completo, com asas e espada;
- explosão central não pode esconder os combatentes;
- manter divisão visual laranja/dourado versus violeta/roxo e silhuetas legíveis;
- Vale do Fim/estátuas entram somente quando pedidos.


## Reference-first continuity from Arcads

Patterns incorporated from the MIT-licensed `krusemediallc/arcads-claude-code` skill pack:

- For a named/specific subject, **identity is established before style expansion**. Generate or retrieve one strong hero/reference first, then propagate that reference through later angles or video start frames.
- Character consistency is stronger when the workflow separates **hero approval → additional angles → visual QA** instead of asking one prompt to invent every view independently.
- Image-to-video should prefer an **approved still/start frame** when identity matters. Do not let the video model re-invent the character from text if a trusted still already exists.
- Model routing is capability-based: use the image/video backend whose reference count, aspect ratio, typography/photoreal strengths and temporal behavior match the request instead of forcing every task through one provider.
- Prompt composition should stay coherent: subject → action → camera → style/lighting → constraints. Avoid keyword soup.
- Semantic QA checks concrete visible requirements: correct subject/category, count, defining attributes, reference adherence, text/limbs when relevant, and requested composition.
- Repair is bounded. Regenerate only from concrete visible defects and preserve the accepted identity/reference; do not restart creatively from scratch.
- External API pricing, model names, limits and availability from the Arcads repository are **volatile examples**, not permanent PredictLM facts. Verify before execution.
- Bundled influencer/product photos are assets, not training material; PredictLM does not ingest them into its knowledge index.


## Referências adicionadas em 2026-09-25

Padrões aprovados para adaptação, sem transformar serviços de terceiros em dependência obrigatória:

- `flaqai/awesome-grok-imagine` (MIT): separar frame inicial, ação/física, câmera, áudio, continuity lock e lista curta de falhas a evitar; útil principalmente para vídeo e reference-to-video.
- `starrlord/grokive` (MIT): manter prompt original, prompt normalizado, origem/parent, workspace e histórico de gerações separados; biblioteca local/recarregável e exportação sem mascarar provenance.
- `Anil-matcha/Grok-Imagine-Image-2-API` (MIT): adapter assíncrono submit → request id → poll → resultado e edição encadeada por id; qualquer chave fica server-side e o adapter é opcional.
- `apimart-API-Gateway/grok-image-api`: referência documental para adapter e contratos de imagem; licença do repositório não autoriza copiar implementação. Usar somente padrões de interface/documentação ou endpoint autorizado configurado pelo usuário.

Para visualizações do Cognitive Lab, o Imagine pode receber um prefill conceitual via `sessionStorage`; isso não transforma telemetria simulada em “imagem do pensamento real”.


## Character Fidelity Gate vNext

Pedidos de personagem/franquia específica são identity-sensitive e usam Literal por padrão.

- personagem único deve receber **subject-count lock**; se o usuário pediu apenas Freeza/Frieza, não adicionar Goku, Vegeta, outro adversário ou um segundo Freeza;
- referências visuais servem para identidade, anatomia, traje, cores, símbolos e forma canônica; composição pode variar;
- o Cognitive Creative Brain pode alterar câmera, staging, iluminação, profundidade e hierarquia, mas nunca identidade, número de personagens, forma/poder/traje ou ação obrigatória;
- revisão semântica pode acionar tentativas extras **limitadas** de recuperação de identidade; nunca loop infinito;
- uma imagem de personagem específico que continua `semanticReview.status=failed` pode ser mostrada com aviso, mas não deve entrar em `Gerações recentes` como se estivesse aprovada;
- fallback textual/público continua explicitamente `fidelityLimited`; não mascarar baixa fidelidade como sucesso verificado.


## Verified Character Library v1.7

Para pedido identity-sensitive, `Gerações recentes` é uma galeria de resultados aprovados, não um log bruto de tentativas.

- `semanticReview.status=failed` → nunca persistir/exibir em Recent;
- personagem específico sem `semanticReview.status=passed` → manter apenas na sessão atual com aviso, não adicionar em Recent;
- `fidelityLimited=true` + identidade específica → não adicionar em Recent;
- exceção: referência persistente exata (`identityExact=true`) já aprovada como asset;
- ao carregar biblioteca antiga, esconder itens identity-sensitive sem verificação aprovada, evitando cards “Freeza” com Goku/clone/personagem errado;
- reparos de identidade continuam limitados; não gerar infinitamente.

O Cognitive Creative Brain pode melhorar composição e criatividade, mas nunca substituir o semantic fidelity gate.


## Character Fidelity Gate v1.8

For a named/specific character, "similar anime character" is a failed result.

### User references

Imagine must expose an upload control for up to 3 PNG/JPEG/WebP reference images.

- resize/compress in the browser before upload;
- never persist the base64 reference blobs in Media Library metadata;
- user-supplied references have higher identity priority than searched references;
- a multimodal provider receives uploaded references as real image inputs when its API supports them;
- searched Firecrawl/Google/Pinterest references are secondary evidence.

Generation hierarchy:

**USER REFERENCE → CANONICAL IDENTITY LOCK → SEARCHED REFERENCE → COMPOSITION/STYLE**

Style and creativity never override the first three layers.

### Rejection instead of pretending success

For identity-sensitive prompts:
- semantic review `failed` → reject candidate from the primary result;
- fidelity-limited fallback without `semanticReview=passed` → reject candidate from the primary result;
- semantic review unavailable on a stronger/reference-capable provider → candidate may be inspected with an explicit unverified warning, but it does not enter Recent;
- rejected candidate never receives a misleading title such as "Freeza" while visibly depicting Goku or another character;
- do not upscale/persist a rejected candidate.

### Explicit visual checklists

Semantic review should use concrete franchise cues when known. Examples:
- Frieza/Freeza: mostly white smooth alien/bio-armor body, purple dome/plates, Frieza face/silhouette; reject orange-gi Saiyan, black-haired fighter or generic demon;
- Naruto: Naruto-defining hair/face/costume/form cues, not generic blond shonen;
- Kurama: fox/Nine-Tails identity, not generic spirit/dragon/wolf;
- Sasuke: Sasuke/Uchiha identity, not generic black-haired ninja;
- Perfect Susanoo: complete large violet/purple armored humanoid chakra avatar;
- Oozaru: gigantic brown tailed Saiyan ape;
- Naruto Four-Tails: correct tailed-beast identity and four tails when requested.

Review pixels, not prompt text. Prompt similarity is not visual fidelity.


## Automatic visual search v1.9

Manual reference upload is an override, never a prerequisite for ordinary named-character generation.

Default character flow:

**IDENTIFY SUBJECT → BUILD CANONICAL QUERY → AUTO IMAGE SEARCH → RANK REFERENCES → DOWNLOAD PUBLIC IMAGES → PASS REFERENCES TO IMAGE MODEL → GENERATE → SEMANTIC REVIEW**

Search order:
1. Google Images API when configured;
2. Firecrawl Images;
3. Pinterest via Firecrawl/Google when available;
4. DuckDuckGo Images no-key fallback.

Rules:
- lack of Google credentials must not degrade immediately to text-only identity lock;
- automatic search must still run through the free fallback;
- retrieved image URLs are forwarded to reference-capable image providers;
- user-uploaded references still outrank searched references when the user chooses to provide them;
- the UI must say upload is optional;
- the identity rejection message must never instruct the user to upload references when automatic references were already found and forwarded;
- an automatically grounded but semantically unverified candidate may be inspected in-session with a warning, but stays out of Recent until approved;
- a visibly wrong character still fails the semantic gate.

The public fallback renderer forwards up to three searched reference URLs through the image-reference field supported by compatible image endpoints. Provider support remains model-dependent and must be reported truthfully.


## Runtime fidelity fix v2.0 — reference-capable generation

Automatic visual search only improves fidelity when the generation model actually consumes images.

Required runtime:
- text-only image models such as `flux` must not be counted as reference-grounded merely because an `image` URL was attached;
- named/specific characters with automatic references should prefer an image-input model such as `kontext` (or another model whose input modalities explicitly include image);
- the public renderer may try a bounded reference-capable sequence (`kontext` → `nanobanana-2-lite` → `p-image-edit`) but must not silently degrade a reference-sensitive request to a text-only model and claim fidelity;
- semantic verification is provider-mesh based: Gemini is no longer the only possible visual reviewer;
- Vercel Gateway/OpenAI-compatible vision, Anthropic vision, Gemini and other configured multimodal providers may review pixels;
- a named character that visibly fails identity remains rejected, regardless of prompt similarity.

Search reference → image-input model → generated pixels → independent multimodal semantic review.


## Multi-query grounding + diagnostics v2.1

Named-character grounding now works as a bounded search/review pipeline rather than one generic query.

For identity-sensitive requests:
1. split the scene into canonical identity/form queries;
2. search primary queries first;
3. if the primary round does not yield enough unique candidates, execute one recovery round with broader identity/scene queries;
4. download up to eight candidates and keep only public image payloads that can actually be fetched;
5. when a multimodal VLM is configured, inspect candidate pixels for usefulness before generation;
6. keep separate references for different named subjects/forms when possible;
7. send only approved/downloaded references to the generation provider;
8. run an independent semantic review on the generated pixels.

Example Naruto/Kurama vs Sasuke/Susanoo searches:
- Naruto Uzumaki Kurama chakra mode;
- Kurama/Nine-Tails canonical body;
- Sasuke Uchiha Perfect Susanoo;
- Perfect Susanoo full-body purple avatar;
- Naruto vs Sasuke final-battle scene.

The Imagine UI must expose:
- candidates found;
- URLs successfully downloaded;
- references visually reviewed/approved;
- references actually passed to the generator;
- generation provider/model;
- semantic reviewer provider/model;
- automatic search queries;
- semantic review issues.

A rejected candidate is not silently discarded. It is shown in a separate **candidate rejected / not saved** panel with concrete visible reasons and a retry button. It never enters Recent until it passes the identity gate.

Manual upload remains optional and outranks automatic references only when the user deliberately supplies it.


## Anime character catalog grounding v2.2

Useful patterns audited from public anime apps:
- Dovakiin0/Kitsune uses AniList-backed anime metadata and character objects with name/poster data;
- Mangayomi supports AniList/MAL/Kitsu trackers;
- Zenshin and Unyo integrate AniList for anime identity/catalog flows;
- awesome-anime-sources and fontes-de-anime-e-mangas are source directories, not runtime character APIs;
- MyAnimeProfile links to MyAnimeList character pages but is a static profile, not a robust runtime API.

PredictLM adopts the safe/catalog portion only. It does **not** import torrent, episode-streaming, mirror, proxy or scraping flows from these projects.

Character grounding order for anime:
1. parse named identities/forms from the prompt;
2. resolve canonical character names/aliases/franchise through AniList GraphQL;
3. prioritize AniList character images as identity references;
4. add form/scene references from Google/Firecrawl/DuckDuckGo;
5. download and optionally VLM-screen candidates;
6. pass approved references to an image-input generator;
7. independently review generated pixels.

For ambiguous names, franchise context must affect ranking. Example: "Kurama" inside a Naruto request must prefer the Naruto/Nine-Tails character over another anime character with the same name.

UI should expose resolved catalog identities (e.g. Naruto Uzumaki · Sasuke Uchiha · Kurama).


## PredictLM pixel runtime v2.3

No PredictLM atual, a skill não termina no prompt: a rota `/api/media/generate` possui cascade real de pixels.

Ordem/capacidades:
- **ComfyUI** quando workflow + endpoint estão configurados;
- **Gemini image multimodal** quando a chave está configurada, incluindo referências inline;
- **Nano/compatible image provider** quando configurado;
- **provider HTTP configurado** por `MEDIA_IMAGE_BASE_URL`;
- **fallback público/proxy** quando disponível, sempre marcado `fidelityLimited` quando não há garantia forte de identidade.

Para personagem/entidade específica:
1. decompor identidade/formas;
2. buscar referências automaticamente;
3. baixar e, quando possível, revisar referências;
4. passar imagens reais ao provider multimodal/reference-capable;
5. gerar;
6. fazer revisão semântica independente;
7. reparar no máximo de forma bounded;
8. rejeitar/preservar como session-only se a identidade não estiver verificada.

A ausência de um provider forte não autoriza fingir sucesso. O runtime deve distinguir:
- **pixel gerado**;
- **pixel gerado com fidelidade limitada**;
- **candidato rejeitado**;
- **nenhum backend de pixel alcançável**.

O Cognitive Lab pode fornecer direção de composição/novidade ao Imagine, mas sinais neurais simulados não são evidência visual e nunca substituem o semantic fidelity gate.
