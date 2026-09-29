import {PREDICT_AGENTS} from '@/lib/agent-runtime/catalog';
import {skills} from '@/lib/skills';
import {CONTROLLER_COVERAGE,type NeuroControllerId} from '@/lib/simulation/cognitive-world-contract';

export type OmniCoreDomain=
  |'chat'|'build'|'research'|'legal'|'media'|'simulation'|'artifacts'
  |'security'|'memory'|'education'|'performance';

const normalize=(input:string)=>String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,' ').replace(/\s+/g,' ').trim();

function classify(prompt:string):OmniCoreDomain{
  const q=normalize(prompt);
  if(/\b(cnj|datajud|djen|processo|peticao|recurso|juridic|contrato|tribunal)\b/.test(q))return'legal';
  if(/\b(imagem|image|video|render|storyboard|logo|avatar|voz|audio|dublagem|media)\b/.test(q))return'media';
  if(/\b(simulacao|simulation|minecraft|voxel|unity|mundo|brain|cerebro|connectome|neuro)\b/.test(q))return'simulation';
  if(/\b(build|codigo|code|app|site|api|typescript|javascript|python|bug|deploy|database|refator)\b/.test(q))return'build';
  if(/\b(pesquis|research|fontes|sources|noticia|atual|web|evidencia)\b/.test(q))return'research';
  if(/\b(docx|pptx|pdf|xlsx|planilha|relatorio|dossie|documento|slides)\b/.test(q))return'artifacts';
  if(/\b(segur|security|fraude|phishing|secret|auth|vulner|risco)\b/.test(q))return'security';
  if(/\b(memoria|memory|lembr|recordar|contexto persistente)\b/.test(q))return'memory';
  if(/\b(ensine|tutor|quiz|estudar|aprender|exercicio)\b/.test(q))return'education';
  if(/\b(performance|desempenho|fps|latencia|cache|gpu|cuda|otimiz)\b/.test(q))return'performance';
  return'chat';
}

const AGENT_HINTS:Record<OmniCoreDomain,string[]>={
  chat:['predict-orchestrator','memory-librarian'],
  build:['predict-orchestrator','codebase-investigator','build-architect','browser-debugger','qa','error-recovery'],
  research:['predict-orchestrator','research','evidence-graph','memory-librarian'],
  legal:['predict-orchestrator','scanner-processual','legal-review','research','evidence-graph','document','qa'],
  media:['predict-orchestrator','media-director','media-quality','voice','qa'],
  simulation:['predict-orchestrator','simulation-swarm','game-producer','game-creative-director','game-technical-director','gameplay-specialist','playtest-reviewer','qa'],
  artifacts:['predict-orchestrator','document','qa'],
  security:['predict-orchestrator','qa','error-recovery','evidence-graph'],
  memory:['predict-orchestrator','memory-librarian','run-librarian'],
  education:['predict-orchestrator','research','memory-librarian'],
  performance:['predict-orchestrator','codebase-investigator','browser-debugger','game-technical-director','qa']
};

const CAPABILITY_HINTS:Record<OmniCoreDomain,string[]>={
  chat:['predictlm-master','human-presence','provider-mesh','prompt-os'],
  build:['predictlm-master','agent-fabric','autodev-runtime','build-review','testing','vibe-security','open-lovable-build','capability-fusion'],
  research:['predictlm-master','web-reach','deep-research','research-source-matrix','evidence-graph','grok-xai','github-knowledge'],
  legal:['predictlm-master','lexis-twincore-x10','predictlm-scanner','datajud','report-architect','office-artifacts'],
  media:['predictlm-master','grok-imagine-parity','visual-reference-grounding','media-director-deep','brag-launch-video','temporal-video','media-pipelines','image-skill'],
  simulation:['predictlm-master','game-studio-fabric','mirofish-simulation','neurocore','nvidia-accelerated'],
  artifacts:['predictlm-master','office-artifacts','report-architect'],
  security:['predictlm-master','defensive-bug-hunter','fraud-shield','vibe-security','build-review'],
  memory:['predictlm-master','second-brain','neurocore','github-knowledge'],
  education:['predictlm-master','tutor-mode','books-courses','research-source-matrix'],
  performance:['predictlm-master','token-budget','cache','nvidia-accelerated','runtime-federation','testing']
};

function requestedCores(prompt:string,domain:OmniCoreDomain):NeuroControllerId[]{
  const q=normalize(prompt);
  const selected:NeuroControllerId[]=[];
  if(/\b(humano|human|h01)\b/.test(q))selected.push('human');
  if(/\b(camundongo|mouse|microns|allen)\b/.test(q))selected.push('mouse');
  if(/\b(macaco|macaque|macaca|primate)\b/.test(q))selected.push('macaque');
  if(/\b(mosca|fly|flywire|fafb)\b/.test(q))selected.push('fly');
  if(/\b(quatro|4|todos|all).{0,30}\b(cerebr|core|controller|especie|species)\b/.test(q)
    ||/\b(cerebr|core|controller|especie|species).{0,30}\b(quatro|4|todos|all)\b/.test(q))return['human','mouse','macaque','fly'];
  if(!selected.length&&domain==='simulation'&&/\b(neuro|cognit|brain|cerebro|connectome)\b/.test(q))return['human','mouse','macaque','fly'];
  return[...new Set(selected)];
}

function scoreCapability(prompt:string,capability:(typeof skills)[number]){
  const q=normalize(prompt);
  const hay=normalize([capability.id,capability.name,capability.category,capability.description].join(' '));
  let score=0;
  for(const token of q.split(/[^a-z0-9]+/).filter(x=>x.length>=4)){
    if(hay.includes(token))score++;
  }
  if(q.includes(normalize(capability.id)))score+=12;
  return score;
}

export function omniCorePlan(prompt:string){
  const domain=classify(prompt);
  const agentIds=AGENT_HINTS[domain];
  const agents=PREDICT_AGENTS.filter(agent=>agentIds.includes(agent.id));
  const preferredIds=CAPABILITY_HINTS[domain];
  const preferred=preferredIds
    .map(id=>skills.find(skill=>skill.id===id))
    .filter(Boolean) as (typeof skills)[number][];
  const discovered=skills
    .map(skill=>({skill,score:scoreCapability(prompt,skill)}))
    .filter(x=>x.score>0&&!preferred.some(p=>p.id===x.skill.id))
    .sort((a,b)=>b.score-a.score)
    .slice(0,4)
    .map(x=>x.skill);
  const capabilities=[...preferred,...discovered].slice(0,10);
  const coreIds=requestedCores(prompt,domain);
  const neuroCores=coreIds.map(id=>CONTROLLER_COVERAGE[id]);

  return{
    domain,
    agents,
    capabilities,
    neuroCores,
    orchestration:['RECALL','ROUTE','PLAN','FORGE','AEGIS','COUNCIL_X10_IF_NEEDED','CHAIR','PARALLAX','EXECUTE','VERIFY','CAPTURE','IMPROVE'],
    rules:[
      'Use only capabilities actually available in the host.',
      'Do not expose hidden chain-of-thought or internal debate.',
      'Do not fabricate plugin/tool execution.',
      'Use the smallest relevant subset of the OmniCore catalog.',
      'Neuro cores are dataset-informed software controllers, not complete biological brains.'
    ]
  };
}

export function omniCorePortableContext(prompt:string){
  const plan=omniCorePlan(prompt);
  const lines=[
    'OMNICORE UNIVERSAL — portable capability router.',
    'Host-neutral contract: one coherent assistant may delegate internally to bounded agents, plugins/capabilities, skills and dataset-informed neuro cores.',
    'Task domain: '+plan.domain+'.',
    'Selected agents: '+(plan.agents.map(x=>x.name).join(', ')||'none')+'.',
    'Selected capabilities: '+(plan.capabilities.map(x=>x.id).join(', ')||'none')+'.',
    plan.neuroCores.length
      ?'Selected neuro cores: '+plan.neuroCores.map(x=>x.shortLabel+' ['+x.summary+']').join(' | ')+'.'
      :'No species neuro core is required for this turn.',
    'Do not pretend missing tools are connected. Provider/model names are engines, not identity.',
    'Public output contains the useful result, evidence and limitations; internal agent debate remains private.'
  ];
  return lines.join('\n');
}
