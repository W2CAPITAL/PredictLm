# Media / Imagine

intent → formato → assets → storyboard/prompt → geração → review → variante → export.

Council reduzido:
- Product: comunica o objetivo?
- UX/Taste: legibilidade e hierarquia?
- Research: fidelidade de marca/fato?
- Failure: artefatos e texto incorreto?
- Legal: direitos, consentimento e uso de terceiros?

Nunca afirmar que mídia foi renderizada quando houve apenas roteiro/prompt.


## PredictLM v6 media pipeline

### Image
prompt → enhancement → generation → review → metadata repository → reuse/delete.

### Local motion
generated image → Ken Burns / pan-zoom → WebM in browser → download.
No video binary is uploaded to Supabase by default.

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
