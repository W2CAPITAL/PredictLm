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

The default path stays local/free. When server credentials exist, PredictLM exposes normalized async adapters for:
- Veo 3 / Veo 3 Fast via Mountsea (`/veo/generate` + `/veo/task`);
- Sora 2 via Mountsea (`/sora/generate` + `/sora/task`);
- Seedance 2 via Seegen (`/jobs/createTask` + `/jobs/queryTask`).

Provider keys stay server-side. The UI disables providers that are not configured and never pretends an unavailable provider is working.


## Visual Reference Grounding / identidade exata

Para personagem, franquia, produto, marca, pessoa/entidade visual ou forma muito específica:

**intent → identity lock → referências → geração multimodal quando suportada → review → variante**

Regras:
- personagem nomeado não pode virar arquétipo genérico ou criatura "parecida";
- preservar silhueta, rosto, roupa, paleta, símbolos, escala e forma/poder solicitados;
- quando houver Google Custom Search configurado, buscar referências em Google Images e uma segunda consulta focada em `site:pinterest.com/pin/`;
- Firecrawl Images funciona como fonte complementar/fallback;
- Gemini Image recebe até 3 referências visuais inline; provider local/OpenAI-compatible pode receber referências quando `MEDIA_IMAGE_REFERENCE_FIELD` for configurado para o contrato daquele endpoint;
- sem provider multimodal, o fallback ainda recebe um **identity lock** textual e não deve fingir que usou a imagem;
- referências servem para fidelidade de identidade, não para copiar composição;
- não persistir imagens de terceiros como assets do produto por padrão.

Caso de regressão obrigatório: **Naruto Uzumaki em Kurama Chakra Mode vs Sasuke Uchiha com Perfect Susanoo** deve manter Naruto/Kurama dourado-laranja e Sasuke/Perfect Susanoo violeta como dois combatentes distintos, sem substituir Kurama por dragão/leão nem Susanoo por robô genérico.

### Autoimagem do Predict

Quando o usuário pedir explicitamente "como você se vê", "como você é na vida real", "sua aparência" ou equivalente, a geração não reinterpreta a identidade: retorna exatamente a referência persistente embutida em `src/lib/entity-self-model.ts`. Não aplicar upscale, variação, filtro ou regeneração sobre essa resposta.
