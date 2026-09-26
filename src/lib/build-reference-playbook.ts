export interface BuildReferencePattern{
  id:string;
  source:string;
  when:string[];
  guidance:string[];
  licenseMode:'adapt'|'reference';
}

const PATTERNS:BuildReferencePattern[]=[
  {
    id:'engineering-skills',
    source:'mattpocock/skills',
    when:['bug','erro','refator','arquitet','feature','implementar','build','teste','tdd','spec'],
    guidance:[
      'define the change boundary and shared vocabulary before broad edits',
      'prefer small composable changes with fast feedback',
      'for regressions, reproduce first and gate diagnosis phase by phase',
      'for behavior changes, add or update a test before claiming completion'
    ],
    licenseMode:'adapt'
  },
  {
    id:'build-your-own',
    source:'codecrafters-io/build-your-own-x',
    when:['engine','motor','runtime','banco','database','cache','http','git','shell','compiler','render','search','crawler','framework'],
    guidance:[
      'decompose the system into observable layers instead of hiding everything behind one dependency',
      'implement the smallest functioning core first, then add protocol/features incrementally',
      'keep boundaries explicit so components can be swapped or inspected'
    ],
    licenseMode:'reference'
  },
  {
    id:'public-api-discovery',
    source:'public-apis/public-apis',
    when:['api','integra','dados','data','servico','serviço','consulta','search','weather','map','finance','legal'],
    guidance:[
      'check whether a free/public API can satisfy the requirement before adding a paid mandatory dependency',
      'record auth type, HTTPS support, rate limits and server-side secret requirements',
      'wrap third-party APIs behind a typed adapter and a failure state'
    ],
    licenseMode:'adapt'
  },
  {
    id:'curated-discovery',
    source:'sindresorhus/awesome',
    when:['biblioteca','library','framework','stack','tool','ferramenta','plugin','sdk','package'],
    guidance:[
      'use curated category lists for discovery, but verify the chosen project against its primary docs and license',
      'avoid adding a dependency only because it appears in a list; require a concrete capability gap'
    ],
    licenseMode:'adapt'
  },
  {
    id:'project-learning',
    source:'freeCodeCamp/freeCodeCamp',
    when:['aprender','ensinar','tutorial','curso','exercicio','exercício','iniciante','fundamentos'],
    guidance:[
      'prefer project-based practice with immediate feedback over passive explanation',
      'sequence prerequisites before larger projects and make success criteria observable',
      'reuse the same concept in progressively harder exercises'
    ],
    licenseMode:'adapt'
  },
  {
    id:'web-data',
    source:'firecrawl/firecrawl',
    when:['crawl','scrape','raspar','site','web','pesquisa','research','extrair','monitorar'],
    guidance:[
      'separate discovery/search from page extraction and structured normalization',
      'keep browser actions bounded and explicit',
      'when Firecrawl is not configured, retain the free research path rather than blocking the feature'
    ],
    licenseMode:'reference'
  },
  {
    id:'media-graph',
    source:'Comfy-Org/ComfyUI',
    when:['imagem','image','video','vídeo','upscale','inpaint','outpaint','diffusion','flux','wan','ltx'],
    guidance:[
      'model media generation as reusable workflow stages rather than a single opaque call',
      'preserve prompt, seed, references and workflow version for reproducibility',
      'treat local/self-hosted ComfyUI as an optional adapter so Vercel remains functional without GPU infrastructure'
    ],
    licenseMode:'reference'
  },
  {
    id:'unity-engine',
    source:'jbruening/UnEngine',
    when:['unity','unity3d','c#','csharp','gameobject','monobehaviour','rigidbody','collider','unity webgl'],
    guidance:[
      'structure Unity-targeted code around explicit GameObject/Component/Transform boundaries and keep pure logic testable outside scene objects',
      'treat Vector/Quaternion, Physics, Input, Time and PlayerPrefs as replaceable runtime contracts instead of scattering engine globals everywhere',
      'for browser delivery, keep the Next.js shell independent and connect a real Unity WebGL build through the PredictLM scene/command bridge'
    ],
    licenseMode:'adapt'
  }
];

function normalize(value:string){
  return String(value||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
}

export function buildReferencePlaybook(prompt:string,limit=5){
  const q=normalize(prompt);
  return PATTERNS
    .map(pattern=>({
      pattern,
      score:pattern.when.reduce((score,term)=>score+(q.includes(normalize(term))?2:0),0)
    }))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit)
    .map(x=>x.pattern);
}

export function buildReferenceContext(prompt:string){
  const selected=buildReferencePlaybook(prompt);
  if(!selected.length)return '';
  return [
    'BUILD REFERENCE PLAYBOOK:',
    ...selected.flatMap(pattern=>[
      pattern.source+' ('+pattern.licenseMode+')',
      ...pattern.guidance.map(g=>' - '+g)
    ]),
    'Do not copy reference-only repository code into the generated project; use the architecture pattern and primary documentation.'
  ].join('\n');
}
