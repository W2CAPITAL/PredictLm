# NeuroCore Source Map

## Científico / estrutural
- Google Research / FlyWire male fruit-fly connectome — referência para circuitos sensório-motores e conectividade em larga escala.
- VirtualFlyBrain — referência para anatomia/identificadores e exploração neuroanatômica.
- `neurolib-dev/neurolib` — MIT; whole-brain neural mass modeling, structural connectivity, delays, excitatory/inhibitory populations.
- `openMetadataInitiative/openMINDS` — MIT; metadata schemas, controlled terminology and provenance for neuroscience.
- `HumanBrainProject/openMINDS` — deprecated; conservar apenas como ponte histórica para a organização atual.
- `TheDragonChild/FlyPuter` — MIT; sensorimotor bridge between FlyWire-inspired data and physics simulation.

- Brain Science Data Center / Cell 2023 — macaque cortex single-cell spatial transcriptome atlas; 143 cortical regions, 264 transcriptome-defined cell types, 42,076,954 spatially annotated cortical cells and 1,493,240 snRNA-seq cells. Use only as non-human-primate cortical proxy; it is not a synapse-resolution connectome.
  - BSDC CSTR: `33145.11.BSDC.1685409749.1663093488869060610`
  - Paper: `10.1016/j.cell.2023.06.009`
  - Explorer: `https://macaque.digital-brain.cn/spatial-omics`
- User-supplied BSDC id `1888063966518173697` resolves to a mouse-brain spatial-transcriptome dataset and must not be labeled macaque.

- Digital Brain Macaque PFC Projectome / Cell 2025 — 2.231 projectomes de neurônios individuais do córtex pré-frontal, 32 subtipos de projeção, 19 sítios de injeção em 7 macaques. Usar como prior de projeção de longo alcance de primata, não como sinapses humanas.
  - Explorer: `https://macaque.digital-brain.cn/projectome/pfc`
- Digital Brain Monkey Claustrum Connectivity — tracer atlas com 148 sítios corticais, 15 subcorticais e 5 no claustro. Usar como prior de conectividade do claustro em primata, não como conectoma humano completo.
  - Explorer: `https://macaque.digital-brain.cn/connectivity-atlas/claustrum`

## Agentes / decisão
- `FoundationAgents/MetaGPT` — MIT; roles + SOP orchestration.
- `Sairamg18814/shvayambhu` — Apache-2.0, reference-only: ideias de introspecção/loops podem ser estudadas, mas alegações de consciência não são adotadas como fato.

## Simulação / mundo
- `ludenio/SuperWEIRDGameKit` — CC0; world loading, production/world simulation patterns.
- `PavelDoGreat/WebGL-Fluid-Simulation` — MIT; lightweight browser visual dynamics.
- `bulletphysics/bullet3` — zlib; physics/collision reference, não dependência obrigatória do browser.
- `fullya99/worldbox-mcp` — MIT; observe → act → observe, world lifecycle, multi-agent permissions.
- `dhorions/Capital-and-Cargo` — Unlicense; economy, transport, reputation and automation patterns.
- `A2Faisal/SESAME` — MIT; spatial grids and human-Earth data interoperability.

## Browser / 2D runtime additions
- `HelloFangaming/HelloMarioEngine` — New BSD/BSD-3-Clause stated in README; object/event/room architecture only, no franchise assets/IP.
- `EasyRPG/Player` — GPL-3.0; portable interpreter/runtime architecture reference only.
- `niksudan/prettylight` — MIT; lightweight 2D surfaces/shaders/lighting lifecycle.
- `YoYoGames/GameMaker-HTML5` — Apache-2.0; browser canvas/input/audio/render/runtime patterns.
- `YoYoGames/GameMaker-Manual` — copyrighted documentation; reference only for constraints/compatibility, not corpus copying.

## Reference-only / quarantine
- `OpenRCT2/OpenRCT2` — GPL-3.0+; architecture reference only.
- `robert1811/life-simulator` — license unverified; concepts only.
- `bitlifefreeonline/bitlife` — license/IP unverified; concepts only.
- `Krobix/life.html` — negative reference; README itself says it is nonfunctional/bad inspiration.
- `Qwizer/realmap-10x` — quarantine: unrelated legacy game server and README contains exposed credentials; never ingest secrets.
- `developerrahulofficial/AI-Girlfriend` — MIT, reference-only for avatar/voice/persona boundaries; no romantic/sexual default behavior.

## Principle
Use science to inform structure and simulation. Use repositories to learn software patterns. Neither category is evidence that the resulting system is conscious.


## Connectome memory boundary
O mapa conectômico da Drosophila é usado como referência estrutural. Ele não fornece um dataset recuperável das memórias individuais do animal. O PredictLM não deve alegar que importou lembranças da mosca.


## Cross-species BioIntelligence additions

### C. elegans
- OpenWorm Connectome Toolbox — recurso estruturado para conectividade anatômica/funcional/extrasináptica.
  - `https://openworm.org/connectome/`
- Cook et al. (Nature, 2019), *Whole-animal connectomes of both Caenorhabditis elegans sexes*.
  - `https://www.nature.com/articles/s41586-019-1352-7`
- Uso: whole-animal sensorimotor/recurrent routing e comparação de motifs.
- Limite: conectividade anatômica não contém memória autobiográfica, experiência subjetiva ou consciência recuperável.

### Mouse
- MICrONS Consortium / Nature 2025 — functional connectomics spanning multiple areas of mouse visual cortex.
  - `https://www.nature.com/articles/s41586-025-08790-w`
- Allen Mouse Brain Atlas.
  - `https://mouse.brain-map.org/`
- Uso: integração estrutura↔função, visual hierarchy, predictive response e anatomical provenance.
- Limite: MICrONS é um volume cortical denso e extraordinariamente grande, porém parcial; não rotular como conectoma inteiro de camundongo.

### Zebrafish
- Svara et al., Nature Methods 2022 — automated synapse-level reconstruction / queryable whole-brain larval zebrafish EM resource.
  - `https://www.nature.com/articles/s41592-022-01622-5`
- mapzebrain / Z-Brain resources podem complementar anatomia e registro funcional quando a proveniência for verificada.
- Uso: brain-wide sensorimotor architecture, circuit reconstruction e comparative connectomics.
- Limite: whole-brain EM volume não significa que toda célula/sinapse foi completamente proofread nem funcionalmente caracterizada.

### Product rule
Essas três novas espécies entram em `src/lib/biointelligence-fabric.ts` como controladores derivados, não como cópias digitais de indivíduos biológicos.
