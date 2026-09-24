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
