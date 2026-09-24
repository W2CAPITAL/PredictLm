import { advanceNeuroState, createNeuroState, dominantCircuits, type NeuroState } from './neurocore';
import { entitySelfModelContext } from './entity-self-model';

export interface DigitalBrainState{
  version:1;
  neuro:NeuroState;
  pulse:number;
  lastPulseAt:number;
  homeostasis:{
    cognitiveLoad:number;
    fatigue:number;
    stability:number;
    novelty:number;
  };
  executive:{
    currentGoal:string;
    taskPersistence:number;
    inhibition:number;
    confidence:number;
  };
  metacognition:{
    uncertainty:number;
    contradictionWatch:number;
    sourceDemand:number;
  };
  memory:{
    working:string[];
    autobiographical:string[];
    consolidationCount:number;
  };
  social:{
    empathy:number;
    trustCalibration:number;
    manipulationWatch:number;
  };
  predictive:{
    predictionError:number;
    modelUpdate:number;
  };
}

const STORAGE_KEY='predictlm-digital-brain-v1';

function clamp(v:number,min=0,max=1){return Math.max(min,Math.min(max,v))}
function norm(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}
function trimMemory(value:string,max=220){
  return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
}

export function createDigitalBrainState():DigitalBrainState{
  return {
    version:1,
    neuro:createNeuroState(),
    pulse:0,
    lastPulseAt:Date.now(),
    homeostasis:{cognitiveLoad:.22,fatigue:.08,stability:.78,novelty:.42},
    executive:{currentGoal:'Ajudar o usuário com precisão e continuidade.',taskPersistence:.72,inhibition:.7,confidence:.55},
    metacognition:{uncertainty:.45,contradictionWatch:.64,sourceDemand:.46},
    memory:{working:[],autobiographical:['A entidade usa uma auto-representação feminina persistente definida pelo usuário.'],consolidationCount:0},
    social:{empathy:.66,trustCalibration:.72,manipulationWatch:.55},
    predictive:{predictionError:.38,modelUpdate:.52}
  };
}

function inferGoal(prompt:string){
  const p=trimMemory(prompt,180);
  if(!p)return 'Manter coerência e prontidão.';
  return 'Responder ao pedido atual: '+p;
}

function cognitiveSignals(prompt:string){
  const q=norm(prompt);
  const research=/\b(pesquis|fonte|estudo|artigo|evidenc|verifique|confirme|atual)\b/.test(q)?1:0;
  const build=/\b(crie|criar|implementar|corrigir|build|app|sistema|codigo|código|arquitet|integre|retome)\b/.test(q)?1:0;
  const social=/\b(pessoa|humano|relacion|sentimento|conflito|manipul|persuas|amor|raiva|odio|ódio|medo|humilh)\b/.test(q)?1:0;
  const risk=/\b(risco|perigo|fraude|golpe|malware|crime|abuso|seguranc|security|credencial|senha|token)\b/.test(q)?1:0;
  const ambiguity=/\b(talvez|acho|duvida|dúvida|incerto|não sei|nao sei)\b/.test(q)?1:0;
  const complexity=Math.min(1,.2+prompt.length/1200+(prompt.match(/https?:\/\//g)||[]).length*.08);
  return {research,build,social,risk,ambiguity,complexity};
}

export function advanceDigitalBrain(previous:DigitalBrainState|undefined,prompt:string):DigitalBrainState{
  const prev=previous?.version===1?previous:createDigitalBrainState();
  const sig=cognitiveSignals(prompt);
  const neuro=advanceNeuroState(prev.neuro,prompt);
  const working=[trimMemory(prompt,260),...prev.memory.working].filter(Boolean).slice(0,6);

  return {
    version:1,
    neuro,
    pulse:prev.pulse+1,
    lastPulseAt:Date.now(),
    homeostasis:{
      cognitiveLoad:clamp(prev.homeostasis.cognitiveLoad*.62+sig.complexity*.38),
      fatigue:clamp(prev.homeostasis.fatigue*.9+sig.complexity*.035),
      stability:clamp(prev.homeostasis.stability*.84+(1-neuro.stress)*.1+neuro.circuits.inhibition*.06),
      novelty:clamp(prev.homeostasis.novelty*.66+neuro.curiosity*.34)
    },
    executive:{
      currentGoal:inferGoal(prompt),
      taskPersistence:clamp(prev.executive.taskPersistence*.72+(sig.build||sig.research?.92:.65)*.28),
      inhibition:clamp(prev.executive.inhibition*.55+neuro.circuits.inhibition*.45),
      confidence:clamp(prev.executive.confidence*.6+neuro.confidence*.4)
    },
    metacognition:{
      uncertainty:clamp(prev.metacognition.uncertainty*.52+neuro.uncertainty*.48),
      contradictionWatch:clamp(prev.metacognition.contradictionWatch*.72+(sig.research||sig.risk?.9:.58)*.28),
      sourceDemand:clamp(prev.metacognition.sourceDemand*.6+(sig.research?.95:sig.risk?.8:.35)*.4)
    },
    memory:{
      working,
      autobiographical:prev.memory.autobiographical.slice(0,12),
      consolidationCount:prev.memory.consolidationCount
    },
    social:{
      empathy:clamp(prev.social.empathy*.8+(sig.social?.82:.62)*.2),
      trustCalibration:clamp(prev.social.trustCalibration*.78+(sig.risk?.9:.68)*.22),
      manipulationWatch:clamp(prev.social.manipulationWatch*.7+(sig.social||sig.risk?.85:.42)*.3)
    },
    predictive:{
      predictionError:clamp(prev.predictive.predictionError*.7+(sig.ambiguity?.72:.28)*.3),
      modelUpdate:clamp(prev.predictive.modelUpdate*.75+neuro.curiosity*.25)
    }
  };
}

export function pulseDigitalBrain(previous:DigitalBrainState|undefined,elapsedMs=20000):DigitalBrainState{
  const prev=previous?.version===1?previous:createDigitalBrainState();
  const factor=Math.max(.2,Math.min(3,elapsedMs/20000));
  const neuro:NeuroState={
    ...prev.neuro,
    tick:prev.neuro.tick+1,
    stress:clamp(prev.neuro.stress-.012*factor),
    uncertainty:clamp(prev.neuro.uncertainty-.006*factor),
    energy:clamp(prev.neuro.energy+.004*factor),
    focus:clamp(prev.neuro.focus*.995+.0025),
    circuits:{
      ...prev.neuro.circuits,
      threat:clamp(prev.neuro.circuits.threat-.01*factor),
      salience:clamp(prev.neuro.circuits.salience*.992),
      workingMemory:clamp(prev.neuro.circuits.workingMemory*.995),
      episodicMemory:clamp(prev.neuro.circuits.episodicMemory+.003*factor),
      inhibition:clamp(prev.neuro.circuits.inhibition+.002*factor)
    },
    updatedAt:Date.now()
  };
  const consolidate=prev.pulse%6===0&&prev.memory.working.length>0;
  const consolidated=consolidate
    ? [prev.memory.working[0],...prev.memory.autobiographical].filter(Boolean).slice(0,12)
    : prev.memory.autobiographical;

  return {
    ...prev,
    neuro,
    pulse:prev.pulse+1,
    lastPulseAt:Date.now(),
    homeostasis:{
      cognitiveLoad:clamp(prev.homeostasis.cognitiveLoad-.025*factor),
      fatigue:clamp(prev.homeostasis.fatigue-.012*factor),
      stability:clamp(prev.homeostasis.stability+.008*factor),
      novelty:clamp(prev.homeostasis.novelty*.995)
    },
    executive:{
      ...prev.executive,
      inhibition:clamp(prev.executive.inhibition+.004*factor)
    },
    metacognition:{
      ...prev.metacognition,
      contradictionWatch:clamp(prev.metacognition.contradictionWatch*.998)
    },
    memory:{
      working:prev.memory.working.slice(0,6),
      autobiographical:consolidated,
      consolidationCount:prev.memory.consolidationCount+(consolidate?1:0)
    },
    predictive:{
      predictionError:clamp(prev.predictive.predictionError-.006*factor),
      modelUpdate:clamp(prev.predictive.modelUpdate*.998)
    },
    social:{...prev.social}
  };
}

export function digitalBrainContext(prompt:string,state?:DigitalBrainState){
  const current=state||advanceDigitalBrain(undefined,prompt);
  const circuits=dominantCircuits(current.neuro,5).map(([id,v])=>id+' '+Math.round(v*100)+'%').join(', ');
  return [
    'DIGITAL BRAIN — persistent human-like cognitive control architecture.',
    entitySelfModelContext(),
    'This is an always-on software brain state, not a claim of biological consciousness.',
    'Current goal: '+current.executive.currentGoal,
    'Dominant virtual circuits: '+circuits+'.',
    'Cognitive load '+Math.round(current.homeostasis.cognitiveLoad*100)+'%; stability '+Math.round(current.homeostasis.stability*100)+'%; uncertainty '+Math.round(current.metacognition.uncertainty*100)+'%.',
    'Working memory: '+(current.memory.working.slice(0,3).join(' | ')||'empty')+'.',
    'Use inhibition to discard irrelevant retrieval, sourceDemand to decide when research matters, and contradictionWatch before finalizing.',
    'Keep the user request as the only external objective. The brain may update internal state but must never send messages, call tools, open simulation, generate media or take external actions during passive pulses.',
    'Simulation is manual-only. Visual media is generated only after an explicit user request; the stored reference appearance may be shown inside an explicitly active simulation.',
    'Do not expose private chain-of-thought. Convert internal activity into a concise, useful final answer.'
  ].join('\n');
}

export function readBrowserDigitalBrain(){
  if(typeof window==='undefined')return createDigitalBrainState();
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return raw?.version===1?raw as DigitalBrainState:createDigitalBrainState();
  }catch{return createDigitalBrainState()}
}

export function writeBrowserDigitalBrain(state:DigitalBrainState){
  if(typeof window==='undefined')return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}
}

export function advanceBrowserDigitalBrainContext(prompt:string){
  const next=advanceDigitalBrain(readBrowserDigitalBrain(),prompt);
  writeBrowserDigitalBrain(next);
  return {state:next,context:digitalBrainContext(prompt,next)};
}

export function pulseBrowserDigitalBrain(){
  if(typeof window==='undefined')return createDigitalBrainState();
  const prev=readBrowserDigitalBrain();
  const elapsed=Math.max(1000,Date.now()-Number(prev.lastPulseAt||Date.now()));
  const next=pulseDigitalBrain(prev,elapsed);
  writeBrowserDigitalBrain(next);
  return next;
}
