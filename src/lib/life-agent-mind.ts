import type {LifeSimulationState} from './life-simulation-engine';
import type {LifeWorldObject,VisionSnapshot} from './life-world-open';

export interface LifeAgentGoal{
  id:string;
  text:string;
  priority:number;
  progress:number;
  horizon:'now'|'today'|'long';
  createdTick:number;
}

export interface LifePlaceMemory{
  location:string;
  visits:number;
  lastTick:number;
  valence:number;
  familiarity:number;
}

export interface LifeObjectMemory{
  objectId:string;
  uses:number;
  lastTick:number;
  valence:number;
  preference:number;
}

export interface LifeAgentMind{
  version:1;
  boredom:number;
  noveltySeeking:number;
  safetySeeking:number;
  socialDrive:number;
  masteryDrive:number;
  autonomyDrive:number;
  fatigueAwareness:number;
  habits:Record<string,number>;
  placeMemory:LifePlaceMemory[];
  objectMemory:LifeObjectMemory[];
  goals:LifeAgentGoal[];
  currentWant:string;
  currentFocus:string;
  publicThought:string;
  lastChoice:string;
  lastChoiceTick:number;
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const id=()=> 'goal-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5);

export function createLifeAgentMind():LifeAgentMind{
  return {
    version:1,boredom:.18,noveltySeeking:.62,safetySeeking:.48,socialDrive:.44,masteryDrive:.58,autonomyDrive:.7,fatigueAwareness:.36,
    habits:{},placeMemory:[],objectMemory:[],
    goals:[
      {id:id(),text:'Entender melhor o mundo ao redor',priority:.68,progress:.08,horizon:'long',createdTick:0},
      {id:id(),text:'Desenvolver um projeto pessoal',priority:.64,progress:.05,horizon:'long',createdTick:0}
    ],
    currentWant:'explorar sem urgência',currentFocus:'ambiente',publicThought:'Quero entender onde estou antes de decidir.',lastChoice:'',lastChoiceTick:0
  };
}

export function normalizeLifeAgentMind(raw:any):LifeAgentMind{
  const b=createLifeAgentMind();
  if(!raw||raw.version!==1)return b;
  return {
    ...b,...raw,
    habits:raw.habits&&typeof raw.habits==='object'?raw.habits:{},
    placeMemory:Array.isArray(raw.placeMemory)?raw.placeMemory.slice(-24):[],
    objectMemory:Array.isArray(raw.objectMemory)?raw.objectMemory.slice(-80):[],
    goals:Array.isArray(raw.goals)&&raw.goals.length?raw.goals.slice(-12):b.goals
  };
}

function upsertPlace(m:LifeAgentMind,state:LifeSimulationState,valence=.05){
  const rows=[...m.placeMemory];const i=rows.findIndex(x=>x.location===state.person.location);
  if(i>=0){
    const p=rows[i];rows[i]={...p,visits:p.visits+1,lastTick:state.tick,valence:clamp((p.valence+1)/2*.82+(valence+1)/2*.18)*2-1,familiarity:clamp(p.familiarity+.04)};
  }else rows.push({location:state.person.location,visits:1,lastTick:state.tick,valence,familiarity:.2});
  return rows.slice(-24);
}

export function advanceLifeAgentMind(
  previous:LifeAgentMind|undefined,
  state:LifeSimulationState,
  vision:VisionSnapshot,
  input?:{usedObject?:LifeWorldObject|null;success?:boolean;message?:string}
):LifeAgentMind{
  const p=normalizeLifeAgentMind(previous);
  const visibleNovelty=vision.visible.reduce((a,x)=>a+(p.objectMemory.some(m=>m.objectId===x.id)?.5:1),0)/Math.max(1,vision.visible.length);
  const sameChoice=state.tick-p.lastChoiceTick<10&&p.lastChoice===state.person.currentAction;
  const boredom=clamp(p.boredom*.72+(sameChoice?.16:0)+(visibleNovelty<.35?.12:0)-visibleNovelty*.08);
  const socialDrive=clamp(p.socialDrive*.74+(100-state.needs.social)/100*.18+(vision.seesOtherAgent?.08:0));
  const fatigueAwareness=clamp(p.fatigueAwareness*.7+(100-state.needs.energy)/100*.22+state.needs.stress/100*.08);
  const safetySeeking=clamp(p.safetySeeking*.78+(100-state.needs.health)/100*.08+state.needs.stress/100*.1);
  const noveltySeeking=clamp(p.noveltySeeking*.76+state.neuro.curiosity*.16+boredom*.12);
  const masteryDrive=clamp(p.masteryDrive*.8+(100-state.needs.focus)/100*.05+state.neuro.curiosity*.1);
  let objectMemory=[...p.objectMemory];
  if(input?.usedObject){
    const obj=input.usedObject;const i=objectMemory.findIndex(x=>x.objectId===obj.id);
    const delta=input.success===false?-.16:.1;
    if(i>=0){
      const m=objectMemory[i];objectMemory[i]={...m,uses:m.uses+1,lastTick:state.tick,valence:Math.max(-1,Math.min(1,m.valence+delta)),preference:clamp(m.preference+delta*.5)};
    }else objectMemory.push({objectId:obj.id,uses:1,lastTick:state.tick,valence:delta,preference:clamp(.5+delta*.5)});
  }
  objectMemory=objectMemory.slice(-80);
  const urgent=[
    ['recuperar energia',(100-state.needs.energy)/100],
    ['comer',(100-state.needs.hunger)/100],
    ['procurar companhia',socialDrive],
    ['reduzir tensão',state.needs.stress/100],
    ['explorar algo novo',noveltySeeking],
    ['aprender/criar',masteryDrive]
  ].sort((a,b)=>(b[1] as number)-(a[1] as number));
  const currentWant=String(urgent[0]?.[0]||'observar');
  const focus=vision.visible[0]?.label||state.person.location;
  const publicThought=
    currentWant==='explorar algo novo'
      ? 'Estou ficando entediado com o padrão atual; quero encontrar algo diferente.'
      : currentWant==='recuperar energia'
        ? 'Meu corpo está puxando minha atenção para descanso.'
        : currentWant==='comer'
          ? 'Estou percebendo a fome como prioridade.'
          : currentWant==='procurar companhia'
            ? 'Quero algum contato, mas não preciso falar se não surgir motivo.'
            : currentWant==='reduzir tensão'
              ? 'Estou tenso; quero um ambiente ou ação que reduza isso.'
              : 'Quero avançar em algo que me faça aprender ou criar.';
  return {
    ...p,boredom,noveltySeeking,safetySeeking,socialDrive,masteryDrive,fatigueAwareness,
    placeMemory:upsertPlace(p,state,input?.success===false?-.2:.04),objectMemory,
    currentWant,currentFocus:focus,publicThought
  };
}

export function scoreMindObject(mind:LifeAgentMind,obj:LifeWorldObject,state:LifeSimulationState){
  const memory=mind.objectMemory.find(x=>x.objectId===obj.id);
  const habit=mind.habits[obj.kind]||0;
  let score=(memory?.preference??.5)*16+habit*10;
  if(obj.affordances.includes('research')||obj.affordances.includes('study')||obj.affordances.includes('create'))score+=mind.masteryDrive*18;
  if(obj.affordances.includes('observe'))score+=mind.noveltySeeking*15;
  if(obj.affordances.includes('talk')||obj.affordances.includes('message'))score+=mind.socialDrive*14;
  if(obj.affordances.includes('rest')||obj.affordances.includes('sleep'))score+=mind.fatigueAwareness*20;
  if(state.tick-(memory?.lastTick??-999)<8)score-=18+mind.boredom*15;
  if(memory&&memory.uses>4)score+=habit*6-mind.boredom*memory.uses;
  return score;
}

export function commitLifeChoice(mindInput:LifeAgentMind,choice:string,tick:number,objectKind?:string){
  const mind=normalizeLifeAgentMind(mindInput);
  const habits={...mind.habits};
  if(objectKind)habits[objectKind]=clamp((habits[objectKind]||0)*.88+.12);
  return {...mind,habits,lastChoice:choice,lastChoiceTick:tick};
}

export function lifeMindSummary(m:LifeAgentMind){
  return [
    'Quer: '+m.currentWant,
    'Foco: '+m.currentFocus,
    'Pensamento público: '+m.publicThought,
    'Tédio '+Math.round(m.boredom*100)+'% · novidade '+Math.round(m.noveltySeeking*100)+'% · social '+Math.round(m.socialDrive*100)+'% · domínio '+Math.round(m.masteryDrive*100)+'%',
    'Objetivos: '+m.goals.slice(0,3).map(g=>g.text+' '+Math.round(g.progress*100)+'%').join(' | ')
  ].join('\n');
}
