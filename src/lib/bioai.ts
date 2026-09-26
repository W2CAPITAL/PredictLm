import {
  advanceBioIntelligence,
  bioIntelligenceContext,
  createBioIntelligenceState,
  fuseBioIntelligence,
  type BioIntelligenceState,
  type BioLearningEvent
} from './biointelligence-fabric';

export type BioAISurface='chat'|'image'|'video'|'simulation'|'processes'|'build'|'research'|'memory'|'learning'|'app';

export type BioMemoryKind='episode'|'skill'|'world'|'media'|'legal'|'learning'|'preference';

export interface BioAIMemory{
  id:string;
  kind:BioMemoryKind;
  surface:BioAISurface;
  summary:string;
  tags:string[];
  salience:number;
  confidence:number;
  occurrences:number;
  createdAt:number;
  updatedAt:number;
}

export interface BioAIState{
  version:1;
  identity:'PredictLM BioAI';
  createdAt:number;
  lastUpdated:number;
  tick:number;
  brain:BioIntelligenceState;
  goal:string;
  attention:string;
  lastAction:string;
  lastOutcome:string;
  memory:BioAIMemory[];
  counters:{
    observations:number;
    successes:number;
    failures:number;
    simulations:number;
    media:number;
    legal:number;
    builds:number;
  };
}

export interface BioAIWorldObservation{
  health:number;
  hunger:number;
  hostileMobs:number;
  passiveMobs:number;
  villagers:number;
  structures:string[];
  inventory:Record<string,number>;
  chunksVisited:number;
  mined:number;
  placed:number;
  crafted:number;
  dungeonsCleared:number;
  day:number;
  biome:string;
  dimension:string;
}

const KEY='predictlm-bioai-v1';
const MEMORY_LIMIT=320;

function clamp(v:number,min=0,max=1){return Math.max(min,Math.min(max,v))}
function normalizeText(value:unknown,max=220){
  return String(value??'')
    .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,'[redacted-key]')
    .replace(/\b(?:sk|gsk|ghp|github_pat|sk-or-v1)[-_A-Za-z0-9]{12,}\b/g,'[redacted-token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]')
    .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/g,'[redacted-phone]')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,max);
}
function terms(value:string){
  return [...new Set(normalizeText(value,900).toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').split(/[^a-z0-9]+/).filter(x=>x.length>=3))].slice(0,28);
}
function hash(value:string){
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function memoryKind(event:BioLearningEvent):BioMemoryKind{
  if(event.kind==='simulation'||event.kind==='cognitive')return'world';
  if(event.kind==='media')return'media';
  if(event.kind==='legal')return'legal';
  if(event.kind==='build')return'skill';
  if(event.kind==='research')return'learning';
  return'episode';
}
function surfaceOf(input:string):BioAISurface{
  const s=String(input||'').toLowerCase();
  if(/image|imagine/.test(s))return'image';
  if(/video|media/.test(s))return'video';
  if(/simul|voxel|minecraft|cognitive/.test(s))return'simulation';
  if(/legal|process/.test(s))return'processes';
  if(/build|studio/.test(s))return'build';
  if(/research/.test(s))return'research';
  if(/memory/.test(s))return'memory';
  if(/learn/.test(s))return'learning';
  if(/chat/.test(s))return'chat';
  return'app';
}

export function createBioAIState(now=Date.now()):BioAIState{
  return {
    version:1,
    identity:'PredictLM BioAI',
    createdAt:now,
    lastUpdated:now,
    tick:0,
    brain:createBioIntelligenceState(),
    goal:'learn from outcomes while serving the current user request',
    attention:'current surface',
    lastAction:'',
    lastOutcome:'',
    memory:[],
    counters:{observations:0,successes:0,failures:0,simulations:0,media:0,legal:0,builds:0}
  };
}

export function normalizeBioAIState(raw:any):BioAIState{
  const fresh=createBioAIState(Number(raw?.createdAt)||Date.now());
  if(!raw||raw.version!==1)return fresh;
  const memory=Array.isArray(raw.memory)?raw.memory.slice(0,MEMORY_LIMIT).map((m:any)=>({
    id:normalizeText(m.id,80)||hash(String(m.summary||'')),
    kind:['episode','skill','world','media','legal','learning','preference'].includes(m.kind)?m.kind:'episode',
    surface:surfaceOf(m.surface),
    summary:normalizeText(m.summary,520),
    tags:Array.isArray(m.tags)?m.tags.map((x:any)=>normalizeText(x,40)).filter(Boolean).slice(0,16):[],
    salience:clamp(Number(m.salience)||0),
    confidence:clamp(Number(m.confidence)||0),
    occurrences:Math.max(1,Number(m.occurrences)||1),
    createdAt:Number(m.createdAt)||Date.now(),
    updatedAt:Number(m.updatedAt)||Date.now()
  })):[];

  return {
    ...fresh,
    ...raw,
    identity:'PredictLM BioAI',
    brain:raw.brain?.version===1?raw.brain:fresh.brain,
    memory,
    counters:{...fresh.counters,...(raw.counters||{})},
    lastUpdated:Number(raw.lastUpdated)||Date.now()
  };
}

export function loadBioAIState():BioAIState{
  if(typeof window==='undefined')return createBioAIState();
  try{return normalizeBioAIState(JSON.parse(localStorage.getItem(KEY)||'null'))}
  catch{return createBioAIState()}
}

export function saveBioAIState(state:BioAIState){
  if(typeof window==='undefined')return false;
  try{
    localStorage.setItem(KEY,JSON.stringify(normalizeBioAIState(state)));
    return true;
  }catch{
    try{
      const compact={...normalizeBioAIState(state),memory:state.memory.slice(0,120)};
      localStorage.setItem(KEY,JSON.stringify(compact));
      return true;
    }catch{return false}
  }
}

function remember(state:BioAIState,event:BioLearningEvent,priority:number,disagreement:number){
  if(priority<.48&&event.success!==false)return state.memory;
  const surface=surfaceOf(event.surface);
  const summary=normalizeText([
    event.kind,
    normalizeText(event.surface,80),
    normalizeText(event.action,180),
    event.success===false?'failed':event.success===true?'succeeded':'observed'
  ].join(' · '),520);
  if(!summary)return state.memory;
  const tagList=terms(summary).slice(0,12);
  const id='bio-'+hash(surface+'|'+summary.toLowerCase());
  const rows=[...state.memory];
  const current=rows.find(x=>x.id===id);
  if(current){
    current.occurrences+=1;
    current.updatedAt=Date.now();
    current.salience=clamp(current.salience*.72+priority*.28);
    current.confidence=clamp(current.confidence*.8+(event.success===false?.55:.75)*.2);
  }else{
    rows.unshift({
      id,
      kind:memoryKind(event),
      surface,
      summary,
      tags:tagList,
      salience:priority,
      confidence:event.success===false?.58:.72,
      occurrences:1,
      createdAt:Date.now(),
      updatedAt:Date.now()
    });
  }
  return rows.sort((a,b)=>(b.salience+b.occurrences*.02)-(a.salience+a.occurrences*.02)||b.updatedAt-a.updatedAt).slice(0,MEMORY_LIMIT);
}

export function advanceBioAI(previous:BioAIState|undefined,event:BioLearningEvent){
  const state=normalizeBioAIState(previous);
  const fusion=fuseBioIntelligence(event);
  const counters={...state.counters};
  counters.observations+=1;
  if(event.success===true)counters.successes+=1;
  if(event.success===false)counters.failures+=1;
  if(event.kind==='simulation'||event.kind==='cognitive')counters.simulations+=1;
  if(event.kind==='media')counters.media+=1;
  if(event.kind==='legal')counters.legal+=1;
  if(event.kind==='build')counters.builds+=1;

  const attention=fusion.researchGap
    ? 'resolve evidence gap on '+normalizeText(event.action,90)
    : fusion.consensus.sensory>.65
      ? 'inspect state and perceptual consistency'
      : fusion.consensus.inhibition>.65
        ? 'verify before acting'
        : 'execute the current reversible action';

  const next:BioAIState={
    ...state,
    tick:state.tick+1,
    lastUpdated:Date.now(),
    brain:advanceBioIntelligence(state.brain,event),
    goal:fusion.researchGap?'reduce uncertainty before durable change':'learn from the outcome without drifting from user intent',
    attention,
    lastAction:normalizeText(event.action,180),
    lastOutcome:event.success===false?'failure':event.success===true?'success':'observation',
    memory:remember(state,event,fusion.learningPriority,fusion.disagreement),
    counters
  };
  saveBioAIState(next);
  return {state:next,fusion};
}

export function observeBioAI(event:BioLearningEvent){
  return advanceBioAI(loadBioAIState(),event);
}

function scoreMemory(query:string,row:BioAIMemory){
  const q=new Set(terms(query));
  if(!q.size)return row.salience*.5;
  const overlap=row.tags.reduce((n,t)=>n+(q.has(t)?1:0),0);
  return overlap/Math.max(2,Math.min(q.size,row.tags.length||1))*1.6+row.salience*.55+Math.min(.28,row.occurrences*.03)+row.confidence*.25;
}

export function recallBioAI(query:string,limit=6,surface?:BioAISurface){
  const state=loadBioAIState();
  return state.memory
    .filter(x=>!surface||x.surface===surface)
    .map(row=>({row,score:scoreMemory(query,row)}))
    .filter(x=>x.score>.45)
    .sort((a,b)=>b.score-a.score)
    .slice(0,Math.max(1,Math.min(16,limit)))
    .map(x=>x.row);
}

export function bioAiKernelContext(event:BioLearningEvent,query=''){
  const staticContext=bioIntelligenceContext(event);
  const state=typeof window==='undefined'?null:loadBioAIState();
  const recalled=state?recallBioAI(query||event.action,4):[];
  return [
    'PREDICTLM BIOAI — one unified software intelligence spanning all product surfaces.',
    staticContext,
    'Operating loop: perceive → compare cross-species controllers → predict → choose reversible action → observe outcome → remember → improve.',
    'Wetware adapters are optional experimental I/O only. Local software operation must not depend on CL1, FinalSpark, organoids, paid APIs or remote databases.',
    state?('Persistent local state: tick '+state.tick+' · memories '+state.memory.length+' · failures '+state.counters.failures+' · simulations '+state.counters.simulations+'.'):'',
    ...recalled.map(m=>'RECALLED '+m.kind.toUpperCase()+' · '+m.summary),
    'Durable self-modification remains proposal-only until tests, build, security checks and human review pass.'
  ].filter(Boolean).join('\n');
}

export function bioAiSurfaceDirectives(surface:BioAISurface,prompt=''){
  const event:BioLearningEvent={
    surface,
    action:'prepare '+surface,
    kind:surface==='simulation'?'simulation':surface==='image'||surface==='video'?'media':surface==='processes'?'legal':surface==='build'?'build':surface==='research'?'research':'cognitive',
    success:undefined,
    novelty:Math.min(1,.34+String(prompt||'').length/1800),
    uncertainty:.42,
    salience:.58
  };
  const fusion=fuseBioIntelligence(event);
  return [
    'BIOAI '+surface.toUpperCase()+' DIRECTIVES',
    'attention '+Math.round(fusion.consensus.attention*100)+'%',
    'sensory '+Math.round(fusion.consensus.sensory*100)+'%',
    'prediction '+Math.round(fusion.consensus.prediction*100)+'%',
    'inhibition '+Math.round(fusion.consensus.inhibition*100)+'%',
    'Use memory for continuity, prediction for planning, sensory consistency for verification, and inhibition to reject unsupported changes.',
    'Never claim synthetic controller state is literal biological thought.'
  ].join(' · ');
}

export function chooseBioAIVoxelGoal(observation:BioAIWorldObservation){
  const inventory=observation.inventory||{};
  const hasFood=(inventory.bread||0)+(inventory.food||0)>0;
  const hasWood=(inventory.wood||0)+(inventory.planks||0)>4;
  const hasStone=(inventory.cobblestone||0)>6;
  const hasIron=(inventory.iron_ingot||0)>2;
  const hasWeapon=(inventory.iron_sword||0)+(inventory.stone_sword||0)+(inventory.wood_sword||0)>0;
  const seenDungeon=observation.structures.some(x=>/dungeon|masmorra/i.test(x));

  if(observation.health<8&&hasFood)return'comer e evitar combate enquanto recupera vida';
  if(observation.hunger<8&&hasFood)return'comer para recuperar fome';
  if(observation.hostileMobs>0&&hasWeapon&&observation.health>=10)return'atacar o mob hostil mais próximo';
  if(observation.hostileMobs>0&&(!hasWeapon||observation.health<10))return'explorar em direção oposta e buscar abrigo';
  if(seenDungeon&&hasWeapon&&observation.health>=14)return'explorar e saquear a masmorra próxima';
  if(!hasWood)return'minerar madeira e fabricar tábuas';
  if(!hasStone)return'minerar pedra e coletar pedregulho';
  if(!hasIron)return'explorar e minerar ferro';
  if(observation.placed<12&&hasWood)return'construir um abrigo simples perto da posição atual';
  if(observation.crafted<3)return'fabricar ferramentas e recursos úteis';
  if(observation.chunksVisited<12)return'explorar novos chunks e observar biomas, estruturas e recursos';
  return'explorar o mundo, coletar recursos raros e registrar descobertas sem destruir construções úteis';
}

export function bioAiStats(){
  const s=loadBioAIState();
  return {
    tick:s.tick,
    memories:s.memory.length,
    counters:s.counters,
    goal:s.goal,
    attention:s.attention,
    lastAction:s.lastAction,
    lastOutcome:s.lastOutcome
  };
}
