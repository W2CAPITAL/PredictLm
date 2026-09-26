# Capability Fusion — 2026-09-25

Este documento registra os padrões absorvidos pela arquitetura do PredictLM. Ele não declara que cada projeto externo foi instalado ou executado. O runtime usa adaptação de padrões, referência arquitetural ou adapter opcional, conforme licença e compatibilidade.

## Gate de incorporação

1. MIT / Apache-2.0 / BSD-3-Clause: padrões e, quando necessário, pequenas implementações compatíveis podem ser adaptados com atribuição/licença preservada.
2. GPL / LGPL / AGPL: usar como referência arquitetural ou integração isolada; não copiar código para o core sem decisão explícita de licenciamento.
3. licença customizada, ausente ou não verificada: referência somente até revisão de licença.
4. nenhum adapter é apresentado como ativo sem configuração e teste real.
5. dependências pesadas ficam opcionais; browser/local leve continua prioritário.

## Brain, memória e inteligência

- ItsWambarYT/ai-brain → memória por projeto, health/doctor e contexto durável.
- tinyhumansai/openhuman → memory tree, orquestração durável e compressão de contexto (referência GPL).
- SamurAIGPT/llm-wiki-agent → wiki viva, conceitos/entidades e lint de contradição.
- mycelium-hq/ai-brain-starter → rule lineage, verificação, drift e lifecycle de sessão.
- thedotmack/claude-mem → observações persistentes + compressão semântica.
- msamsami/clonellm / muhammad-fiaz/Charisma → separar identidade/persona do conhecimento e da memória factual.
- pacifio/atlas → checkpoints, lineage e memória entre agentes.
- earendil-works/pi → provider abstraction, durable loop e telemetria tipada.

Implementação no PredictLM:
- src/lib/fusion/knowledge-fabric.ts
- src/lib/fusion/capability-fabric.ts
- src/lib/assistant-store.ts
- src/components/ChatShell.tsx

## Agentes e Build

- obra/superpowers → skills como método operacional, planejar antes de executar e verificar depois.
- affaan-m/ECC → research-first, security gates e eficiência do agente.
- ChromeDevTools/chrome-devtools-mcp → console/rede/DOM/performance como evidência de debugging.
- JCodesMore/ai-website-cloner-template → inspecionar UI/DOM antes de reconstruir.
- nocobase/nocobase → data-model-first, plugin microkernel, permissões e refinamento visual.
- PI-Desktop / zernio plugin → isolamento entre host, plugin e runtime.
- MG1937/ASC → inspeção rápida de artefatos/código.
- tj/watch → rerun limitado por mudança.

Implementação:
- src/lib/agent-runtime/run-ledger.ts
- src/lib/agent-runtime/catalog.ts
- /api/agent com explorer → architect → implementer → reviewer → repair → verify + ledger de replay.

## Research e Web

- alphaXiv/OpenResearch → hipóteses paralelas, experimentos reproduzíveis e evidência ligada ao run.
- D4Vinci/Scrapling → extração adaptativa e resiliência de seletor.
- changedetection.io → monitoramento por mudança, resumo de diff e filtro por intenção.
- every-app/open-seo → auditoria estruturada.

Implementação:
- src/lib/research/evidence-graph.ts
- /api/research retorna grafo de evidência, corroboração, possíveis conflitos, clusters e gaps.
- monitoramento deve ser bounded/condition-based; não repetir pesquisa completa sem mudança.

## Documentos e Office

- PaddlePaddle/PaddleOCR → OCR multilíngue, layout/tabelas/fórmulas e saída LLM-ready.
- hugohe3/ppt-master → narrativa → layout → artefato editável, com dados e fontes preservados.

Implementação:
- src/lib/documents/pipeline.ts
- /api/documents/parse
- PADDLEOCR_BASE_URL é adapter opcional; sem configuração, o app não finge OCR.

## Imagem, vídeo e render

- upscayl/upscayl → estágio opcional de upscale.
- TachibanaYoshino/AnimeGANv3 → estágio opcional de stylization/anime com identidade preservada.
- dtoyoda10/anime-gen → UX/roteamento de geração anime.
- playbox-dev/trackstudio → estabilidade de identidade/objeto entre frames.
- ssloy/tinyrenderer → câmera, z-buffer, shading e composição como referência conceitual.
- ENB/NVE repos → pós-processamento, contraste, iluminação e tiers de qualidade.
- darkzOGx/youtube-automation-agent → pipeline recuperável roteiro → assets → render.

Implementação:
- src/lib/media/postprocess-pipeline.ts
- /api/media/generate com semantic lock + artifact review + stylization + upscale plan.
- /api/media/video com continuity gate + motion review + postprocess plan.
- adapters externos só são marcados ativos quando realmente configurados.

## Simulação

- xcontcom/neuroparticles → percepção local, pequenas políticas neurais, fitness, diversidade e comportamento emergente.
- mindcraft-bots/mindcraft → agente LLM em mundo persistente com ação aterrada.
- nikmcfly/MiroFish-Offline → swarm, memória de grafo e comparação de cenários (referência AGPL).
- ruvnet/RuView → conceitos de sensor fusion sem tratar inferência como observação direta.
- fasferraz/eNB → disciplina de state machine e eventos (referência GPL).

Implementação:
- src/lib/simulation/emergent-swarm.ts
- GrokSimulationPanel exibe geração, diversidade, política dominante e top agentes.
- o swarm entra como contexto adicional do planner, mas não substitui o estado determinístico.
- simulação é contrafactual; nunca apresentada como previsão de pessoas reais.

## Voice

- debpalash/VoiceStudio → pipeline local: transcrição → design de voz → síntese → dublagem (referência AGPL).
- clonagem/identidade de voz exige consentimento explícito e adapter próprio.

## Critério final

Uma referência só é considerada incorporada quando existe pelo menos uma destas formas:
- contrato arquitetural ativo no core;
- adapter opcional explícito;
- gate/quality policy executável;
- documentação de skill que altera o comportamento do agente.

Não usar nomes de repositórios como decoração de resposta pública; eles existem para melhorar o produto.


## Game Studio / Simulação

- Donchitos/Claude-Code-Game-Studios → padrões MIT de coordenação por papéis, rigor adaptativo, run-and-observe e playtest, aplicados **somente** à Life Simulation Studio.

Implementação:
- `src/lib/game-studio-fabric.ts` produz contrato de rigor/papéis/gates da simulação.
- `src/lib/agent-runtime/agentic-fabric.ts` possui superfície `simulation` e seleciona Game Studio somente nela.
- `src/app/api/chat/route.ts` injeta Game Studio + capability fusion no modo `simulation-plan`.
- `src/components/GrokSimulationPanel.tsx` usa Game Studio também no cérebro local e mostra o estado do Studio na UI.
- `skills/game-studio-fabric/SKILL.md` mantém o contrato sincronizado.
- Build genérico não recebe Game Studio.

Regra principal: narrativa não substitui estado. O ciclo validado é percepção → decisão → ação → consequência → memória. Mudanças visíveis do mundo/POV usam run-and-observe quando possível.

