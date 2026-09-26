import type {FlyCoreState} from './fly-core';
import type {HumanCoreState} from './human-core';
import {emitAppLearningEvent} from '../app-learning';

export type SimulatedBrainProfile='explorer'|'planner'|'skeptic'|'social';

export interface SimulatedBrain{
  id:string;
  label:string;
  profile:SimulatedBrainProfile;
  attention:number;
  confidence:number;
  noveltyDrive:number;
  inhibition:number;
  socialDrive:number;
  currentHypothesis:string;
}

export interface OrganismState{
  version:1;
  tick:number;
  drives:{
    energy:number;
    safety:number;
    social:number;
    novelty:number;
    rest:number;
    curiosity:number;
  };
  affect:{valence:number;arousal:number};
  attentionTarget:string;
  currentGoal:string;
  selectedAction:string;
  alternativeAction:string;
  innerTelemetry:string;
  simulatedBrains:SimulatedBrain[];
  lastExperience:string;
  lastUpdated:number;
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const clean=(s:string,max=160)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,max);

function hash01(input:string){
  let h=2166136261;
  for(let i=0;i<input.length;i++){
    h^=input.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return (h>>>0)/4294967295;
}

export function createOrganismState():OrganismState{
  return {
    version:1,
    tick:0,
    drives:{energy:.72,safety:.78,social:.48,novelty:.58,rest:.22,curiosity:.66},
    affect:{valence:.08,arousal:.52},
    attentionTarget:'ambiente',
    currentGoal:'observar antes de agir',
    selectedAction:'explorar',
    alternativeAction:'aguardar',
    innerTelemetry:'Estado inicial: percepção aberta, baixa urgência e curiosidade moderada.',
    simulatedBrains:[
      {id:'human-a',label:'Humano A · Explorador',profile:'explorer',attention:.58,confidence:.48,noveltyDrive:.78,inhibition:.34,socialDrive:.5,currentHypothesis:'há algo novo para descobrir'},
      {id:'human-b',label:'Humano B · Planejador',profile:'planner',attention:.62,confidence:.61,noveltyDrive:.42,inhibition:.66,socialDrive:.44,currentHypothesis:'é melhor formar um plano curto antes de agir'},
      {id:'human-c',label:'Humano C · Cético',profile:'skeptic',attention:.68,confidence:.42,noveltyDrive:.36,inhibition:.74,socialDrive:.35,currentHypothesis:'a evidência ainda pode estar incompleta'},
      {id:'human-d',label:'Humano D · Social',profile:'social',attention:.54,confidence:.55,noveltyDrive:.5,inhibition:.46,socialDrive:.8,currentHypothesis:'o contexto social pode alterar a melhor ação'}
    ],
    lastExperience:'',
    lastUpdated:Date.now()
  };
}

export function normalizeOrganismState(raw:any):OrganismState{
  const base=createOrganismState();
  if(!raw||raw.version!==1)return base;
  return {
    ...base,
    ...raw,
    drives:{...base.drives,...(raw.drives||{})},
    affect:{...base.affect,...(raw.affect||{})},
    simulatedBrains:Array.isArray(raw.simulatedBrains)&&raw.simulatedBrains.length
      ? raw.simulatedBrains.slice(0,8).map((x:any,i:number)=>({...base.simulatedBrains[i%base.simulatedBrains.length],...x}))
      : base.simulatedBrains,
    lastUpdated:Number(raw.lastUpdated||Date.now())
  };
}

function inferTarget(prompt:string){
  const p=clean(prompt,220);
  if(!p)return 'ambiente';
  const quoted=p.match(/["“](.{2,70})["”]/)?.[1];
  if(quoted)return clean(quoted,70);
  const words=p.split(/\s+/).filter(x=>x.length>3);
  return clean(words.slice(-5).join(' '),70)||'mensagem atual';
}

export function advanceOrganism(
  previous:OrganismState|undefined,
  input:{prompt:string;fly:FlyCoreState;human:HumanCoreState;workspaceUncertainty:number}
):OrganismState{
  const prev=normalizeOrganismState(previous);
  const prompt=clean(input.prompt,260);
  const q=prompt.toLowerCase();
  const entropy=hash01(prompt+'|'+prev.tick);
  const isSocial=/\b(voce|você|humano|pessoa|amigo|conversa|fala|nome)\b/i.test(prompt);
  const isThreat=/\b(perigo|ameaça|fug|medo|ataque|machuc|risco)\b/i.test(prompt);
  const isNovel=/\b(novo|imagine|crie|descubra|explore|estranho|diferente|simul)\b/i.test(prompt);
  const isRest=/\b(descans|dorm|cansa|pausa|calma)\b/i.test(prompt);

  const drives={
    energy:clamp(prev.drives.energy-.008-(1-input.human.neuro.energy)*.012+(isRest ? .018 : 0)),
    safety:clamp(prev.drives.safety+(isThreat?-.12:.008)+(input.fly.threat>.6?-.04:0)),
    social:clamp(prev.drives.social+(isSocial ? .035 : -.004)),
    novelty:clamp(prev.drives.novelty+(isNovel ? .055 : -.006)+entropy*.008),
    rest:clamp(prev.drives.rest+.01+(prev.drives.energy < .4 ? .03 : 0)-(isRest ? .08 : 0)),
    curiosity:clamp(prev.drives.curiosity+(isNovel ? .04 : .002)+(input.fly.exploration-.5)*.02)
  };

  const arousal=clamp(
    prev.affect.arousal*.58+
    input.fly.salience*.16+
    input.human.neuro.arousal*.12+
    (isThreat ? .18 : 0)+
    (isNovel ? .08 : 0)
  );
  const valence=clamp(
    (prev.affect.valence+1)/2*.62+
    drives.safety*.18+
    input.human.neuro.confidence*.1+
    (isSocial ? .05 : 0),
    0,1
  )*2-1;

  const target=inferTarget(prompt);
  const urgency=(1-drives.safety)*.5+drives.rest*.22+input.fly.threat*.28;
  const exploreScore=drives.curiosity*.35+drives.novelty*.28+input.fly.exploration*.22+entropy*.15;
  const deliberateScore=input.human.executiveControl*.36+input.human.workingMemory*.22+(1-input.workspaceUncertainty)*.2+drives.energy*.12+prev.simulatedBrains[1].inhibition*.1;
  const socialScore=drives.social*.42+(isSocial ? .35 : 0)+prev.simulatedBrains[3].socialDrive*.23;

  let selectedAction='observar';
  let alternativeAction='explorar';
  let goal='entender o estímulo atual sem repetir um script';

  if(urgency>.5){
    selectedAction='afastar-se e reavaliar';
    alternativeAction='procurar abrigo';
    goal='reduzir risco antes de retomar exploração';
  }else if(isRest||drives.rest>.68){
    selectedAction='reduzir atividade';
    alternativeAction='procurar local confortável';
    goal='recuperar energia e estabilizar o estado interno';
  }else if(socialScore>Math.max(exploreScore,deliberateScore)){
    selectedAction='interagir';
    alternativeAction='observar sinais sociais';
    goal='testar uma interação e atualizar o modelo do outro';
  }else if(deliberateScore>exploreScore+.08){
    selectedAction='planejar próximo passo';
    alternativeAction='testar hipótese pequena';
    goal='escolher uma ação reversível baseada no contexto';
  }else{
    selectedAction=entropy>.52?'explorar caminho novo':'inspecionar alvo';
    alternativeAction=entropy>.52?'inspecionar alvo':'explorar caminho novo';
    goal='obter informação nova e atualizar memória espacial/semântica';
  }

  const profiles=prev.simulatedBrains.map((brain)=>{
    const profileBias=brain.profile==='explorer'?exploreScore:
      brain.profile==='planner'?deliberateScore:
      brain.profile==='skeptic'?input.workspaceUncertainty:
      socialScore;
    const confidence=clamp(brain.confidence*.7+(1-input.workspaceUncertainty)*.16+profileBias*.14);
    const attention=clamp(brain.attention*.68+input.fly.salience*.12+input.human.neuro.circuits.attention*.12+profileBias*.08);
    const hypothesis=brain.profile==='explorer'
      ? 'uma ação diferente pode revelar informação útil sobre '+target
      : brain.profile==='planner'
        ? 'um próximo passo curto e reversível é preferível para '+target
        : brain.profile==='skeptic'
          ? 'a interpretação de '+target+' precisa sobreviver a uma hipótese alternativa'
          : 'a reação de outros agentes pode mudar o significado de '+target;
    return {...brain,attention,confidence,currentHypothesis:hypothesis};
  });

  const innerTelemetry=[
    'atenção em '+target,
    'objetivo: '+goal,
    'ação candidata: '+selectedAction,
    'alternativa: '+alternativeAction,
    'curiosidade '+Math.round(drives.curiosity*100)+'%',
    'segurança '+Math.round(drives.safety*100)+'%',
    'arousal '+Math.round(arousal*100)+'%'
  ].join(' · ');

  return {
    version:1,
    tick:prev.tick+1,
    drives,
    affect:{valence,arousal},
    attentionTarget:target,
    currentGoal:goal,
    selectedAction,
    alternativeAction,
    innerTelemetry,
    simulatedBrains:profiles,
    lastExperience:q?prompt:prev.lastExperience,
    lastUpdated:Date.now()
  };
}

export function learnOrganismOutcome(previous:OrganismState|undefined,input:{reward:number;predictionError:number;experience:string}){
  const prev=normalizeOrganismState(previous);
  emitAppLearningEvent({surface:'cognitive/organism',action:'learn-outcome '+clean(input.experience,90),kind:'cognitive',success:input.reward>=.5,novelty:input.predictionError,uncertainty:input.predictionError,salience:Math.max(input.reward,input.predictionError),metadata:{tick:prev.tick}});
  const reward=clamp(input.reward);
  const predictionError=clamp(input.predictionError);
  return {
    ...prev,
    drives:{
      ...prev.drives,
      curiosity:clamp(prev.drives.curiosity*.94+predictionError*.06),
      safety:clamp(prev.drives.safety*.96+reward*.04),
      energy:clamp(prev.drives.energy-.006)
    },
    affect:{
      valence:clamp((prev.affect.valence+1)/2*.78+reward*.22)*2-1,
      arousal:clamp(prev.affect.arousal*.82+predictionError*.18)
    },
    simulatedBrains:prev.simulatedBrains.map(x=>({
      ...x,
      confidence:clamp(x.confidence*.82+reward*.12+(1-predictionError)*.06)
    })),
    lastExperience:clean(input.experience,220),
    lastUpdated:Date.now()
  };
}

export function organismContext(state:OrganismState|undefined){
  const s=normalizeOrganismState(state);
  return [
    'ORGANISM SIMULATION STATE (software telemetry, not literal mind-reading):',
    'Attention target: '+s.attentionTarget+'. Goal: '+s.currentGoal+'.',
    'Selected action: '+s.selectedAction+'. Alternative: '+s.alternativeAction+'.',
    'Drives: energy '+Math.round(s.drives.energy*100)+'%, safety '+Math.round(s.drives.safety*100)+'%, social '+Math.round(s.drives.social*100)+'%, novelty '+Math.round(s.drives.novelty*100)+'%, rest '+Math.round(s.drives.rest*100)+'%, curiosity '+Math.round(s.drives.curiosity*100)+'%.',
    'Functional affect: valence '+Math.round(s.affect.valence*100)+'; arousal '+Math.round(s.affect.arousal*100)+'%.',
    'Simulated human ensemble: '+s.simulatedBrains.map(x=>x.label+' -> '+x.currentHypothesis).join(' | ')+'.',
    'Do not claim these are biological thoughts or real people. They are inspectable internal variables used to diversify decisions.'
  ].join('\n');
}
