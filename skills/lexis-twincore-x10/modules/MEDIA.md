# Media / Imagine

intent → formato → assets → storyboard/prompt → geração → review → variante → export.

Council reduzido:
- Product: comunica o objetivo?
- UX/Taste: legibilidade e hierarquia?
- Research: fidelidade de marca/fato?
- Failure: artefatos e texto incorreto?
- Legal: direitos, consentimento e uso de terceiros?

Nunca afirmar que mídia foi renderizada quando houve apenas roteiro/prompt.


## PredictLM v8 media pipeline

### Image
prompt → enhancement → generation → review → metadata repository → reuse/delete.

### Local video
PredictLM now has two working paths:
- **1 scene + motion:** generated image → pan/zoom/drift → WebM in browser → download.
- **3-scene storyboard:** prompt → three coherent AI keyframes → crossfade + cinematic motion → WebM in browser → download.

The image path is served through a same-origin render proxy, so browser canvas/video export does not fail because of CORS/tainted-canvas errors.
No video binary is uploaded to Supabase by default; only lightweight metadata/history is persisted.

### Advanced video references/adapters
- latent-spaces/brag — MIT; direção de launch/commercial: inspect → hook → real user flow → storyboard → composition brief → render/verify → poster/share copy
- lcy362/agnes-video-generator
- calesthio/OpenMontage
- HBAI-Ltd/Toonflow-app
- ATH-MaaS/Pixelle-Video
- mutonby/openshorts
- Anil-matcha/AI-Youtube-Shorts-Generator
- xixihhhh/hotclip
- mountsea-ai/veo-api
- seedance2-api/seedance2-api
- mountsea-ai/sora-api
- HiAPIAI/awesome-seedance-2-0-prompts
- SurgeBowRetreat/invideo-ai-nexus
- F-R-L/forge-film
- PKU-YuanGroup/Helios
- gyoridavid/short-video-maker
- PKU-YuanGroup/ConsisID

Padrões incorporados: cena/storyboard, continuidade, provider adapters, keyframes, montagem, caption/TTS e identidade consistente. Modelos pesados como Helios/ConsisID são referência/adapter remoto, não runtime do Vercel.


### Optional generative video providers

Auto now prefers a configured **real temporal generator**. Motion/storyboard stays an explicit fallback, never a fake substitute. PredictLM exposes normalized async adapters for:
- Veo 3 / Veo 3 Fast via Mountsea (`/veo/generate` + `/veo/task`);
- Sora 2 via Mountsea (`/sora/generate` + `/sora/task`);
- Seedance 2 via Seegen (`/jobs/createTask` + `/jobs/queryTask`);
- Gemini Veo 3.1 official long-running generation with text-to-video, image-to-video and reference-image grounding;
- user-configured ComfyUI workflows for LTX/compatible neural video engines (`/prompt` → `/history` → `/view`).

Provider keys stay server-side. The UI disables providers that are not configured and never pretends an unavailable provider is working.


## Visual Reference Grounding / identidade exata

Para personagem, franquia, produto, marca, pessoa/entidade visual ou forma muito específica:

**intent → Grok Imagine Parity → identity lock → Firecrawl references → geração multimodal quando suportada → review → variante**

Regras:
- personagem nomeado não pode virar arquétipo genérico ou criatura "parecida";
- preservar silhueta, rosto, roupa, paleta, símbolos, escala e forma/poder solicitados;
- Firecrawl Images é a fonte padrão de referência e faz uma segunda busca focada em `site:pinterest.com/pin/`;
- Google Images/Pinterest via Google permanecem opcionais e nunca são requisito de funcionamento;
- Gemini Image recebe até 3 referências visuais inline; provider local/OpenAI-compatible pode receber referências quando `MEDIA_IMAGE_REFERENCE_FIELD` for configurado para o contrato daquele endpoint;
- sem provider multimodal, o fallback ainda recebe um **identity lock** textual e não deve fingir que usou a imagem;
- referências servem para fidelidade de identidade, não para copiar composição;
- não persistir imagens de terceiros como assets do produto por padrão.

Caso de regressão obrigatório: **Naruto Uzumaki em Kurama Chakra Mode vs Sasuke Uchiha com Perfect Susanoo** deve manter Naruto/Kurama dourado-laranja e Sasuke/Perfect Susanoo violeta como dois combatentes distintos, sem substituir Kurama por dragão/leão nem Susanoo por robô genérico.

### Autoimagem do Predict

Quando o usuário pedir explicitamente "como você se vê", "como você é na vida real", "sua aparência" ou equivalente, a geração não reinterpreta a identidade: retorna exatamente a referência persistente embutida em `src/lib/entity-self-model.ts`. Não aplicar upscale, variação, filtro ou regeneração sobre essa resposta.

## Deep Think + Deep Research for Media

Quando ativados no Imagine:

**pedido → Deep Research → Media Director / Deep Think → identity/reference lock → provider → temporal/image review → resultado**

- **Deep Research** usa pesquisa abrangente e limitada para encontrar contexto visual relevante, fontes e referências; resultados irrelevantes são descartados.
- **Deep Think** gera apenas um brief operacional de direção (sujeito, composição, câmera, ação, continuidade, materiais, áudio), sem expor raciocínio privado.
- Para vídeo, o prompt final exige movimento temporal novo e coerente; slideshow, Ken Burns, pan/zoom de still ou crossfade não contam como vídeo neural.
- Para Gemini Veo 3.1, first-frame e até três referências podem ser enviados como imagem real quando o modo/provider aceitar.
- `Auto` escolhe o primeiro provider temporal real configurado. `local` só entra explicitamente ou quando nenhum provider real existe.
- Erros de provider devem ser normalizados para texto legível; nunca mostrar `[object Object]`.

### ComfyUI neural adapter

`COMFYUI_VIDEO_BASE_URL` + `COMFYUI_VIDEO_WORKFLOW_JSON` habilitam um bridge genérico para workflows API-format de LTX/outros modelos temporais.

Placeholders suportados:
`{{PROMPT}}`, `{{NEGATIVE_PROMPT}}`, `{{WIDTH}}`, `{{HEIGHT}}`, `{{DURATION}}`, `{{FPS}}`, `{{SEED}}`, `{{IMAGE_URL}}`, `{{IMAGE_BASE64}}`, `{{IMAGE_FILENAME}}`.

No Vercel, `localhost` do usuário não é alcançável. ComfyUI local requer desktop/self-hosted PredictLM ou um endpoint de rede acessível. Nunca marcar o provider como disponível sem endpoint + workflow configurados.


## Chat, canonical media and animal vision (2026-09-24)

- Apply the shared public-answer gate to every runtime, recalled memory and cached answer. Reject weak local messages and non-procedural how-to responses. Never memorize rejected answers.
- Treat Web as permission. Search for explicit research, volatile facts and sensitive procedures; ordinary planting/cooking questions do not require retrieval. Reject anecdotes sharing a keyword with a procedure; maintain bounded per-prompt rejected-source memory.
- Naruto/Kurama vs Sasuke/Perfect Susanoo: preserve full avatars, distinct sides, nine tails, purple armor and wings. Include Valley of the End statues only when requested. Keep mandatory identity instructions through prompt compilation. Use separate subject/setting reference queries.
- Distinguish technical pixel review from semantic model review. Semantic review may fail or be unavailable; neither implies verified identity. Permit one automatic repair, preserve literal subject and record the outcome.
- Visão analyzes uploaded animal photos using a pinned quantized MobileNet in a dedicated one-thread CPU worker. Download only on request; support cancellation and model cache. Preserve top-five scores, non-animal classes and inconclusive results. This is whole-image classification, not detection, diagnosis, proof of safety or franchise identity recognition.
- Three optional inference adapters are in `services/animal-vision/`: HOG/SVM, PyTorch ResNet, Keras ResNet. Show unavailable until real trusted weights load. Do not claim the source README accuracy as app accuracy. Never deserialize HTTP model uploads or infer 150 supported classes from the rt75272 README (its checked-in current mapping has 15).
- Browser analysis keeps the photo on the device. Server analysis is an explicit user choice. No automatic photo persistence or Supabase upload. See `services/animal-vision/README.md` for model provenance, compatibility and deployment setup.


## Best-image orchestration v2.4

Para personagem/anime/franquia específica, o Imagine usa pipeline de qualidade em camadas:

```text
intent → scene/subject slots → visual references → persistent Visual ID memory
→ 2–3 candidates → technical review + semantic identity review
→ rerank → targeted edit/repair of best candidate → final semantic gate
→ optional stylize/upscale → persist only if approved
```

Regras:
- anime/franchise identity-sensitive gera até 3 candidatos; outra identidade específica, até 2; pedido genérico, 1;
- identidade correta vale mais no score que uma imagem tecnicamente bonita porém semanticamente errada;
- referência manual > Visual ID Memory aprovada > referência automática/catalogada > texto;
- Visual ID Memory reutiliza somente gerações anteriormente aprovadas pelo verificador semântico e não persiste blobs/data URLs gigantes;
- repair deve usar o melhor candidato como referência visual e corrigir somente erros visíveis, preservando regiões/pose/composição já corretas;
- character slots fixam identidade, forma, paleta, atributos obrigatórios e substituições proibidas;
- para Naruto/Kurama vs Sasuke/Perfect Susanoo: lados separados, Kurama raposa/nove caudas, Susanoo humanoide blindado completo, ownership de cor ouro/laranja vs roxo/violeta;
- geração que falha identidade não entra em Recent nem vira memória de identidade.

Esse padrão adota princípios públicos observáveis em geradores de ponta: referências de imagem, edição multi-turn/repair, identity consistency e seleção do melhor resultado. Não presume acesso a pesos ou técnicas proprietárias.


## Strict identity provider policy

Para personagem/franquia específica, um provider text-only não pode vencer o roteamento apenas por responder primeiro.

- `nano-banana` textual é bloqueado no modo de identidade rígida;
- quando referências existem, a rota escolhida deve conseguir transportar pixels de referência ou o sistema deve cair para um fallback image-to-image/reference-aware;
- em repair, o provider que acabou de falhar a identidade entra em `avoidProviders` para forçar failover;
- referências remotas válidas continuam disponíveis para o fallback mesmo quando o CDN não pôde ser convertido em inline base64;
- JPEG/PNG/WebP podem ser reconhecidos pelos bytes quando o CDN devolve MIME incorreto;
- para Naruto/Kurama vs Sasuke/Susanoo, as referências são diversificadas para cobrir os dois lados do confronto, evitando três imagens do mesmo personagem;
- candidato rejeitado fica recolhido em diagnóstico e nunca aparece como se fosse a geração aceita.


## Transformation semantics

Named-character forms must distinguish **character transformation/mode** from **separate summoned/avatar entity**.

Canonical example:
- `Naruto no modo Kurama`, `Kurama Chakra Mode`, `chakra da Kurama envolvendo o corpo` → Naruto remains the subject; require blond hair, whisker marks and golden-orange chakra cloak/aura on Naruto. Do **not** invent a separate giant Kurama fox.
- `avatar completo da Kurama`, `Kurama inteira`, `raposa gigante de nove caudas` → a separate/full Kurama fox avatar is explicitly required.
- `Sasuke com Susanoo Perfeito` → Perfect Susanoo is a separate surrounding gigantic violet/purple armored humanoid chakra avatar.

The subject graph, verifier and repair code must use the same interpretation. A verifier may not fail a Kurama-mode image merely because a separate fox avatar is absent.


## Automatic negatives and valid-image retry

The user should not need to write a negative prompt for normal generation. Character/form-specific negatives are compiled automatically from the original request and transformation semantics; manual negative input is an advanced optional override only.

Provider success means **usable image bytes**, not merely HTTP 200. The render fallback validates PNG/JPEG/WebP/AVIF bytes, retries alternate configured fallback models after an invalid 200/JSON/HTML response, and only after exhausting those attempts returns the terminal user-facing message: `O provider não entregou uma imagem válida`.

For Naruto Kurama Chakra Mode, automatic negatives protect Naruto's blond hair, whisker identity and golden chakra cloak on Naruto's body. Full-Kurama-avatar negatives are activated only by an explicit full-avatar request.


## Hosted image gateway recovery

On Vercel, Imagine may authenticate to Vercel AI Gateway with the deployment's `VERCEL_OIDC_TOKEN` before public fallbacks. Endpoint selection follows the model contract:
- Gemini/Nano Banana multimodal text-to-image → `/v1/chat/completions`, image read from `message.images`;
- image-only Grok/Flux/GPT Image → `/v1/images/generations`;
- reference-aware repair/edit for supported models → `/v1/images/edits` with JSON image URLs/data URLs.

The hosted route therefore does not depend on the obsolete unauthenticated `image.pollinations.ai` host. Pollinations fallback uses the current `gen.pollinations.ai/image/` endpoint and requires current authentication/configuration.
