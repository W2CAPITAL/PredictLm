export type FusionSurface=
  |'chat'|'build'|'research'|'memory'|'documents'
  |'media'|'video'|'simulation'|'voice'|'browser';

export type IntegrationMode='adapt'|'reference'|'optional-adapter';

export interface FusionSource{
  repo:string;
  license:string;
  mode:IntegrationMode;
  areas:FusionSurface[];
  ideas:string[];
}

export const REQUESTED_FUSION_REPOS=[
  'ItsWambarYT/ai-brain',
  'tinyhumansai/openhuman',
  'SamurAIGPT/llm-wiki-agent',
  'mycelium-hq/ai-brain-starter',
  'vastsa/PI-Desktop',
  'zernio-dev/zernio-claude-plugin',
  'playbox-dev/trackstudio',
  'nocobase/nocobase',
  'every-app/open-seo',
  'dgtlmoon/changedetection.io',
  'JCodesMore/ai-website-cloner-template',
  'msamsami/clonellm',
  'muhammad-fiaz/Charisma',
  'hugohe3/ppt-master',
  'D4Vinci/Scrapling',
  'PaddlePaddle/PaddleOCR',
  'thedotmack/claude-mem',
  'tj/watch',
  'obra/superpowers',
  'affaan-m/ECC',
  'ChromeDevTools/chrome-devtools-mcp',
  'pacifio/atlas',
  'earendil-works/pi',
  'alphaXiv/OpenResearch',
  '666ghj/MiroFish',
  'nikmcfly/MiroFish-Offline',
  'debpalash/VoiceStudio',
  'MG1937/ASC',
  'ruvnet/RuView',
  'darkzOGx/youtube-automation-agent',
  'mindcraft-bots/mindcraft',
  'xcontcom/neuroparticles',
  'fasferraz/eNB',
  'Chaosamongclippers/ENB-for-NVE',
  'soserrieye0/ENBSeries-GTA5-FiveM',
  'upscayl/upscayl',
  'ssloy/tinyrenderer',
  'TachibanaYoshino/AnimeGANv3',
  'dtoyoda10/anime-gen',
  'firecrawl/firecrawl',
  'Comfy-Org/ComfyUI',
  'codecrafters-io/build-your-own-x',
  'sindresorhus/awesome',
  'public-apis/public-apis',
  'freeCodeCamp/freeCodeCamp',
  'mattpocock/skills',
  'Donchitos/Claude-Code-Game-Studios',
  'fogleman/Craft',
  'dgreenheck/minecraft-threejs-clone',
  '0xfabian/mc',
  'pquiring/jfcraft',
  'obiwac/python-minecraft-clone',
  'Aidanhouk/Minecraft-Clone',
  'zardoy/minecraft-web-client',
  'zardoy/mcraft-arwes',
  'JEFFY1234599/block-craft-browser-edition',
  'TheDoctor200/MinecraftDungeonsLauncher',
  'GuyRoosevelt/Minecraft-Dungeons-The-Awakening',
  'jbruening/UnEngine'
] as const;

export const FUSION_SOURCES:FusionSource[]=[
  {repo:'ItsWambarYT/ai-brain',license:'MIT',mode:'adapt',areas:['memory','build'],ideas:['project-aware persistent memory','agent context files','doctor/health checks']},
  {repo:'tinyhumansai/openhuman',license:'GPL-3.0',mode:'reference',areas:['memory','chat','research'],ideas:['memory tree','durable orchestration','token compression','goals and todos']},
  {repo:'SamurAIGPT/llm-wiki-agent',license:'MIT',mode:'adapt',areas:['memory','research','documents'],ideas:['interlinked wiki','entity/concept graph','contradiction lint','living synthesis']},
  {repo:'mycelium-hq/ai-brain-starter',license:'MIT',mode:'adapt',areas:['memory','build'],ideas:['verification harness','rule lineage','drift detection','session lifecycle']},
  {repo:'vastsa/PI-Desktop',license:'LGPL-3.0',mode:'reference',areas:['build','browser'],ideas:['local-first agent desktop','plugin isolation','host/runtime separation']},
  {repo:'zernio-dev/zernio-claude-plugin',license:'MIT',mode:'adapt',areas:['build'],ideas:['tool/plugin contract','hosted MCP boundary']},
  {repo:'playbox-dev/trackstudio',license:'Apache-2.0',mode:'adapt',areas:['media'],ideas:['multi-stream tracking','stable object identity across frames']},
  {repo:'nocobase/nocobase',license:'custom/unknown',mode:'reference',areas:['build'],ideas:['data-model-first builder','WYSIWYG refinement','plugin microkernel','permission-aware AI']},
  {repo:'every-app/open-seo',license:'MIT',mode:'adapt',areas:['research'],ideas:['site analysis pipelines','structured audit outputs']},
  {repo:'dgtlmoon/changedetection.io',license:'Apache-2.0',mode:'adapt',areas:['research','browser'],ideas:['change watching','intent-filtered alerts','diff summaries','browser steps']},
  {repo:'JCodesMore/ai-website-cloner-template',license:'MIT',mode:'adapt',areas:['build','browser'],ideas:['visual reconstruction workflow','inspect-before-clone']},
  {repo:'msamsami/clonellm',license:'MIT',mode:'adapt',areas:['memory','chat'],ideas:['persona corpus separation','identity context as explicit data']},
  {repo:'muhammad-fiaz/Charisma',license:'AGPL-3.0',mode:'reference',areas:['memory','chat'],ideas:['local memory/personality training boundary']},
  {repo:'hugohe3/ppt-master',license:'MIT',mode:'adapt',areas:['documents'],ideas:['native editable artifact generation','document-to-storyboard','charts/tables from evidence']},
  {repo:'D4Vinci/Scrapling',license:'BSD-3-Clause',mode:'adapt',areas:['research','browser'],ideas:['adaptive extraction','selector resilience','crawl/session discipline']},
  {repo:'PaddlePaddle/PaddleOCR',license:'Apache-2.0',mode:'optional-adapter',areas:['documents'],ideas:['layout-aware OCR','structured Markdown/JSON','multilingual document parsing']},
  {repo:'thedotmack/claude-mem',license:'Apache-2.0',mode:'adapt',areas:['memory'],ideas:['session observations','semantic compression','relevant context replay']},
  {repo:'tj/watch',license:'unverified',mode:'reference',areas:['build','research'],ideas:['bounded periodic checks','rerun-on-change']},
  {repo:'obra/superpowers',license:'MIT',mode:'adapt',areas:['build','chat'],ideas:['skills methodology','plan-execute-review discipline']},
  {repo:'affaan-m/ECC',license:'MIT',mode:'adapt',areas:['build','memory','research'],ideas:['agent performance harness','security gates','research-first execution']},
  {repo:'ChromeDevTools/chrome-devtools-mcp',license:'Apache-2.0',mode:'optional-adapter',areas:['browser','build'],ideas:['network/console inspection','performance traces','reliable browser automation']},
  {repo:'pacifio/atlas',license:'Apache-2.0',mode:'adapt',areas:['build','memory'],ideas:['agent checkpoints','session-to-commit lineage','shared cross-agent memory']},
  {repo:'earendil-works/pi',license:'MIT',mode:'adapt',areas:['build','chat'],ideas:['unified provider API','durable agent loop','typed telemetry','sandbox recommendation']},
  {repo:'alphaXiv/OpenResearch',license:'MIT',mode:'adapt',areas:['research','build'],ideas:['parallel hypotheses','reproducible experiment lineage','evidence tied to runs']},
  {repo:'666ghj/MiroFish',license:'AGPL-3.0',mode:'reference',areas:['simulation','research','memory'],ideas:['seed-to-graph simulation pipeline','individual and collective memory injection','persona/cohort setup','parallel social-agent rounds','temporal memory updates','ReportAgent-style post-simulation inspection','deep interaction with simulated agents']},
  {repo:'nikmcfly/MiroFish-Offline',license:'AGPL-3.0',mode:'reference',areas:['simulation','research','memory'],ideas:['local graph-storage abstraction','multi-agent social simulation','knowledge graph memory','counterfactual report agent','offline architecture reference']},
  {repo:'debpalash/VoiceStudio',license:'AGPL-3.0',mode:'reference',areas:['voice','media'],ideas:['local voice pipeline','dubbing/transcription stages','language-aware audio']},
  {repo:'MG1937/ASC',license:'Apache-2.0',mode:'adapt',areas:['build'],ideas:['fast artifact inspection','agent-facing decompile/report boundary']},
  {repo:'ruvnet/RuView',license:'MIT',mode:'reference',areas:['simulation'],ideas:['sensor fusion concepts','privacy-preserving non-camera signals']},
  {repo:'darkzOGx/youtube-automation-agent',license:'MIT',mode:'adapt',areas:['video'],ideas:['script-assets-render-publish pipeline','recoverable job stages']},
  {repo:'mindcraft-bots/mindcraft',license:'MIT',mode:'adapt',areas:['simulation'],ideas:['LLM agent in persistent world','tool/action grounding']},
  {repo:'xcontcom/neuroparticles',license:'MIT',mode:'adapt',areas:['simulation'],ideas:['local perception','small neural policies','mutation/crossover','emergent behavior']},
  {repo:'fasferraz/eNB',license:'GPL-3.0',mode:'reference',areas:['simulation'],ideas:['protocol/state-machine discipline','event-driven emulation']},
  {repo:'Chaosamongclippers/ENB-for-NVE',license:'MIT',mode:'reference',areas:['media'],ideas:['lighting/post-processing presets','quality tiers']},
  {repo:'soserrieye0/ENBSeries-GTA5-FiveM',license:'unverified',mode:'reference',areas:['media'],ideas:['post-processing stack concepts']},
  {repo:'upscayl/upscayl',license:'AGPL-3.0',mode:'optional-adapter',areas:['media'],ideas:['AI upscaling stage','quality-model selection']},
  {repo:'ssloy/tinyrenderer',license:'unverified',mode:'reference',areas:['media','simulation'],ideas:['rasterization','z-buffer','camera','lighting','toon shading']},
  {repo:'TachibanaYoshino/AnimeGANv3',license:'custom/unknown',mode:'optional-adapter',areas:['media','video'],ideas:['anime stylization stage','fast ONNX inference concept','frame-consistent style pass']},
  {repo:'dtoyoda10/anime-gen',license:'MIT',mode:'adapt',areas:['media'],ideas:['anime generation UX','text/image input routing']},
  {repo:'firecrawl/firecrawl',license:'AGPL-3.0',mode:'optional-adapter',areas:['research','browser','documents'],ideas:['search + scrape + interact pipeline','LLM-ready markdown/JSON','crawl/map for agent research','bounded web actions behind explicit adapter']},
  {repo:'Comfy-Org/ComfyUI',license:'GPL-3.0',mode:'optional-adapter',areas:['media','video','voice'],ideas:['node-graph media workflows','local/offline image and video generation','inpaint/outpaint/upscale pipeline','workflow JSON as reusable production contract']},
  {repo:'codecrafters-io/build-your-own-x',license:'unverified',mode:'reference',areas:['build','chat'],ideas:['learn architecture by recreating core systems','decompose black boxes into small testable layers','implementation-first systems understanding']},
  {repo:'sindresorhus/awesome',license:'CC0-1.0',mode:'adapt',areas:['research','build'],ideas:['curated discovery index','category-first resource discovery','prefer maintained canonical lists over random search']},
  {repo:'public-apis/public-apis',license:'MIT',mode:'adapt',areas:['research','build'],ideas:['free API discovery catalog','auth/HTTPS/category-aware integration selection','prototype with public APIs before paid dependencies']},
  {repo:'freeCodeCamp/freeCodeCamp',license:'BSD-3-Clause',mode:'adapt',areas:['chat','build','research'],ideas:['project-based curriculum','small exercises with immediate feedback','progressive practice from fundamentals to real projects']},
  {repo:'mattpocock/skills',license:'MIT',mode:'adapt',areas:['build','chat'],ideas:['small composable engineering skills','shared project vocabulary and ADRs','TDD red-green-refactor','diagnose bugs in gated phases','spec before broad edits']},
  {repo:'Donchitos/Claude-Code-Game-Studios',license:'MIT',mode:'adapt',areas:['simulation'],ideas:['studio-style simulation hierarchy with scoped ownership','adaptive rigor for world changes','end-to-end perception-decision-action-consequence-memory validation','run-and-observe visual QA','playtest-driven simulator iteration','world-system specialists','cross-domain coordination inside the simulation']},
  {repo:'fogleman/Craft',license:'MIT',mode:'adapt',areas:['simulation'],ideas:['deterministic effectively-infinite chunks','delta persistence','block break/place','day-night','plants/transparency','visible-face/chunk culling','multiplayer state sync patterns']},
  {repo:'dgreenheck/minecraft-threejs-clone',license:'unverified',mode:'reference',areas:['simulation'],ideas:['browser voxel terrain','biomes','resources','chunking','terraforming','save/load']},
  {repo:'0xfabian/mc',license:'unverified',mode:'reference',areas:['simulation'],ideas:['low-level C++ OpenGL voxel architecture','camera/input','chunk rendering']},
  {repo:'pquiring/jfcraft',license:'LGPL-2.1',mode:'reference',areas:['simulation'],ideas:['broad Minecraft-like block/item/content systems','crafting breadth','world architecture']},
  {repo:'obiwac/python-minecraft-clone',license:'MIT',mode:'adapt',areas:['simulation'],ideas:['chunk mesh generation','break/place','save/load','collision','gravity/jumping','hotbar','mob/pathfinding architecture']},
  {repo:'Aidanhouk/Minecraft-Clone',license:'unverified',mode:'reference',areas:['simulation'],ideas:['survival sandbox feature breadth','interaction coverage','content architecture']},
  {repo:'zardoy/minecraft-web-client',license:'MIT',mode:'adapt',areas:['simulation','browser'],ideas:['browser-first voxel client','mobile controls','offline/online boundary','network world state','inventory UI patterns']},
  {repo:'zardoy/mcraft-arwes',license:'unverified',mode:'reference',areas:['simulation'],ideas:['Minecraft-style HUD hierarchy','inventory/menu presentation','browser game shell']},
  {repo:'JEFFY1234599/block-craft-browser-edition',license:'unverified',mode:'reference',areas:['simulation','browser'],ideas:['browser/mobile voxel interaction','customization UX']},
  {repo:'TheDoctor200/MinecraftDungeonsLauncher',license:'MIT',mode:'reference',areas:['simulation'],ideas:['secondary offline profile/save selection concepts','mod/profile boundary','launcher UX only']},
  {repo:'GuyRoosevelt/Minecraft-Dungeons-The-Awakening',license:'Apache-2.0',mode:'reference',areas:['simulation'],ideas:['secondary dungeon loop','chests','economy','bosses','weapons','abilities','save/load','infinite adventure loop']},
  {repo:'jbruening/UnEngine',license:'MIT',mode:'adapt',areas:['simulation','build','media','video'],ideas:['Unity GameObject/Component/MonoBehaviour semantics','Transform/Vector/Quaternion','Camera/Collider/Rigidbody/Physics','Input/Time/PlayerPrefs','testable Unity-compatible script architecture']}
];

const SURFACE_RULES:Record<FusionSurface,string[]>={
  chat:[
    'retrieve only relevant memory; never dump internal state',
    'compress repeated context and preserve decisions, constraints and unresolved loops',
    'route complex work through staged agents; simple conversation stays direct'
  ],
  memory:[
    'store source, time, confidence and relation for durable facts',
    'build entity/concept links and flag contradictions instead of silently overwriting',
    'prefer compact summaries plus retrievable raw episodes'
  ],
  build:[
    'inspect current code before editing and preserve existing architecture',
    'checkpoint plan, changed files, review findings and verification result',
    'treat browser console/network/performance evidence as first-class debugging input',
    'prefer small composable changes with fast feedback; use spec → test/failure → implementation → verification for non-trivial edits',
    'use curated catalogs only to discover options; verify the selected library/API against its primary documentation before integration',
    'when the requested target is Unity, prefer the Unity Fabric GameObject/Component/Transform contract and keep Unity-specific code isolated from the generic web runtime',
    'keep plugins/adapters permission-scoped and secrets server-side'
  ],
  research:[
    'plan parallel queries/hypotheses for complex research',
    'tie every conclusion to source evidence and record contradictions/gaps',
    'make runs reproducible with query plan, source set and timestamp',
    'use Firecrawl only when configured; otherwise preserve the free-search path and never pretend scraping occurred',
    'use curated indexes such as Awesome/Public APIs as discovery leads, then verify against primary sources',
    'support bounded change monitoring instead of repeated full re-research'
  ],
  documents:[
    'parse layout, tables, formulas and text into structured blocks before summarizing',
    'preserve provenance from page/region to generated artifact',
    'prefer native editable office output when generating documents/slides'
  ],
  media:[
    'separate semantic identity fidelity from technical image quality',
    'use staged generation → review → repair → upscale/postprocess',
    'treat ComfyUI workflow JSON as an optional local/remote production graph for image/edit/upscale when configured',
    'keep optional external stylizers/upscalers behind adapters; never pretend they ran',
    'use Unity-style camera/transform scene contracts when a media preview or simulation surface benefits from a shared 3D coordinate model'
  ],
  video:[
    'plan script/shots/assets/continuity before render',
    'for interactive/game media, keep an art-direction brief and validate visible output instead of treating a successful render call as proof of quality',
    'track identity and scene state across frames',
    'use Unity-style Transform/Camera scene snapshots when useful for deterministic shot blocking or simulation-to-video continuity',
    'distinguish true generative video from local keyframe motion fallback',
    'use recoverable job stages and quality gates'
  ],
  simulation:[
    'agents act from local perception plus persistent memory, not omniscient state',
    'MiroFish Fabric uses seed/context → graph → persona/cohort → interaction rounds → temporal memory → report/deep inspection; weighted representatives are used on weak devices instead of pretending thousands of LLM agents ran',
    'Game Studio belongs to this surface: coordinate world direction, systems, agent behavior, visual world and playtest/QA inside the simulation rather than in generic Build',
    'Minecraft-class mode uses deterministic effectively-infinite chunks, delta persistence, mining/placing, inventory/crafting, survival/creative loops, mobs, structures and secondary dungeon progression',
    'Unity Fabric supplies GameObject/Component/Transform semantics everywhere the simulation needs a shared 3D scene contract and can hand snapshots to a real Unity WebGL host when configured',
    'use adaptive minimal/standard/full rigor for simulation changes and validate a complete perception → decision → action → consequence → memory loop before expanding complex scenarios',
    'use deterministic state transitions for core world rules',
    'allow emergent policies/evolution only as a simulation layer, never as factual prediction',
    'run baseline, adverse, third-path and second-order counterfactuals'
  ],
  voice:[
    'prefer local/browser audio where practical',
    'separate transcription, voice design, synthesis and dubbing stages',
    'require explicit user intent before voice cloning or identity-sensitive audio'
  ],
  browser:[
    'inspect console, network and rendered DOM before guessing at UI failures',
    'use bounded reliable automation with waits and screenshots',
    'do not expose unrelated browser data to agents'
  ]
};

function tokens(v:string){
  return String(v||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'')
    .split(/[^a-z0-9]+/).filter(x=>x.length>3);
}

export function fusionSourcesFor(surface:FusionSurface,prompt='',limit=8){
  const q=new Set(tokens(prompt));
  return FUSION_SOURCES
    .filter(x=>x.areas.includes(surface))
    .map(source=>{
      let score=source.areas[0]===surface?3:1;
      for(const token of tokens(source.ideas.join(' ')))if(q.has(token))score+=2;
      return {source,score};
    })
    .sort((a,b)=>b.score-a.score||a.source.repo.localeCompare(b.source.repo))
    .slice(0,Math.max(1,limit))
    .map(x=>x.source);
}

export function capabilityFusionContext(prompt:string,surface:FusionSurface){
  const sources=fusionSourcesFor(surface,prompt,7);
  return [
    'CAPABILITY FUSION — use these patterns as architecture guidance, not as claims that external software executed.',
    ...SURFACE_RULES[surface].map(x=>'RULE · '+x),
    ...sources.map(x=>'PATTERN · '+x.repo+' · '+x.mode+' · '+x.ideas.join('; ')),
    'LICENSE GATE · reference-only sources must not have code copied into PredictLM; optional adapters run only when explicitly configured.'
  ].join('\n');
}

export function fusionHealth(){
  const byMode=FUSION_SOURCES.reduce((acc,source)=>{
    acc[source.mode]=(acc[source.mode]||0)+1;
    return acc;
  },{} as Record<string,number>);
  const registered=new Set(FUSION_SOURCES.map(x=>x.repo));
  const missing=REQUESTED_FUSION_REPOS.filter(repo=>!registered.has(repo));
  return {
    sources:FUSION_SOURCES.length,
    byMode,
    surfaces:Object.keys(SURFACE_RULES).length,
    requestedCoverage:{
      expected:REQUESTED_FUSION_REPOS.length,
      covered:REQUESTED_FUSION_REPOS.length-missing.length,
      missing,
      complete:missing.length===0
    }
  };
}
