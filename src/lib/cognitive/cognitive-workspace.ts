import {advanceFlyCore,createFlyCoreState,flyCoreContext,type FlyCoreState} from './fly-core';
import {advanceHumanCore,createHumanCoreState,humanCoreContext,type HumanCoreState} from './human-core';

export interface CognitiveEpisode{
  at:number;
  prompt:string;
  answerPreview:string;
  reward:number;
  predictionError:number;
}

export interface CognitiveState{
  version:1;
  tick:number;
  fly:FlyCoreState;
  human:HumanCoreState;
  workspace:{
    mode:'reflexive'|'deliberative'|'balanced';
    salience:number;
    confidence:number;
    uncertainty:number;
    inhibition:number;
    exploration:number;
    actionReadiness:number;
    broadcast:string[];
  };
  memory:{
    working:string[];
    episodic:CognitiveEpisode[];
  };
  lastUpdated:number;
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const clean=(s:string,max=220)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,max);

export function createCognitiveState():CognitiveState{
  return {
    version:1,
    tick:0,
    fly:createFlyCoreState(),
    human:createHumanCoreState(),
    workspace:{
      mode:'balanced',
      salience:.4,
      confidence:.5,
      uncertainty:.4,
      inhibition:.48,
      exploration:.52,
      actionReadiness:.42,
      broadcast:[]
    },
    memory:{working:[],episodic:[]},
    lastUpdated:Date.now()
  };
}

export function advanceCognitiveWorkspace(previous:CognitiveState|undefined,prompt:string):CognitiveState{
  const prev=previous?.version===1?previous:createCognitiveState();
  const fly=advanceFlyCore(prev.fly,prompt);
  const human=advanceHumanCore(prev.human,prompt);

  const reflex=clamp(fly.salience*.32+fly.actionSelection*.28+fly.threat*.2+fly.centralComplex*.2);
  const deliberate=clamp(human.workingMemory*.24+human.executiveControl*.28+human.metacognition*.22+human.recurrentIntegration*.26);
  const mode:CognitiveState['workspace']['mode']=reflex>deliberate+.14?'reflexive':deliberate>reflex+.14?'deliberative':'balanced';
  const salience=clamp(fly.salience*.45+human.neuro.circuits.salience*.55);
  const uncertainty=clamp(fly.predictionError*.35+human.predictiveError*.65);
  const inhibition=clamp(fly.inhibition*.4+human.inhibition*.6);
  const exploration=clamp(fly.exploration*.55+human.neuro.curiosity*.45);
  const actionReadiness=clamp(fly.actionSelection*.48+human.neuro.circuits.action*.3+human.executiveControl*.22);
  const confidence=clamp((1-uncertainty)*.58+human.neuro.confidence*.32+fly.rewardPrediction*.1);

  const broadcast:string[]=[
    salience>.62?'stay-on-topic-high-salience':'normal-salience',
    uncertainty>.58?'verify-before-certainty':'confidence-calibrated',
    inhibition>.6?'suppress-irrelevant-context':'normal-inhibition',
    exploration>.65?'consider-one-alternative':'avoid-unnecessary-branching',
    actionReadiness>.65?'prefer-concrete-next-action':'answer-before-action'
  ];

  return {
    version:1,
    tick:prev.tick+1,
    fly,
    human,
    workspace:{mode,salience,confidence,uncertainty,inhibition,exploration,actionReadiness,broadcast},
    memory:{
      working:[clean(prompt,260),...prev.memory.working].filter(Boolean).slice(0,8),
      episodic:prev.memory.episodic.slice(-40)
    },
    lastUpdated:Date.now()
  };
}

export function cognitivePromptContext(state:CognitiveState){
  return [
    'COGNITIVE LAB — silent dual-connectome control state.',
    'This is a software architecture informed by two real mapped connectome datasets. It is not evidence of consciousness.',
    flyCoreContext(state.fly),
    humanCoreContext(state.human),
    'GLOBAL WORKSPACE:',
    'Mode '+state.workspace.mode+'. Salience '+Math.round(state.workspace.salience*100)+'%; uncertainty '+Math.round(state.workspace.uncertainty*100)+'%; inhibition '+Math.round(state.workspace.inhibition*100)+'%; exploration '+Math.round(state.workspace.exploration*100)+'%.',
    'Broadcast controls: '+state.workspace.broadcast.join(', ')+'.',
    'Working memory: '+(state.memory.working.slice(0,4).join(' | ')||'empty')+'.',
    'Use this only to improve attention, continuity, calibration and action selection. Never narrate it unless the user explicitly asks to inspect the Cognitive Lab.'
  ].join('\n\n');
}

export function applyCognitiveOutcome(
  previous:CognitiveState,
  input:{prompt:string;answer:string;explicitReward?:number}
):CognitiveState{
  const answer=clean(input.answer,1000);
  const q=answer.toLowerCase();
  const failure=/nao consegui|não consegui|erro|falha|provider|knowledge pack|runtime|rag|relacionado:/.test(q);
  const usefulLength=Math.min(1,answer.length/240);
  const directReward=typeof input.explicitReward==='number'
    ? clamp((input.explicitReward+1)/2)
    : clamp((failure?0:.65)+usefulLength*.22);
  const predictionError=clamp(previous.workspace.uncertainty*.44+(1-directReward)*.56);

  const fly:FlyCoreState={
    ...previous.fly,
    rewardPrediction:clamp(previous.fly.rewardPrediction*.72+directReward*.28),
    predictionError:clamp(previous.fly.predictionError*.56+predictionError*.44),
    mushroomBody:clamp(previous.fly.mushroomBody*.76+directReward*.16+usefulLength*.08)
  };
  const human:HumanCoreState={
    ...previous.human,
    predictiveError:clamp(previous.human.predictiveError*.58+predictionError*.42),
    metacognition:clamp(previous.human.metacognition*.82+predictionError*.18)
  };
  const episode:CognitiveEpisode={
    at:Date.now(),
    prompt:clean(input.prompt,220),
    answerPreview:clean(answer,220),
    reward:directReward,
    predictionError
  };

  return {
    ...previous,
    fly,
    human,
    workspace:{
      ...previous.workspace,
      confidence:clamp(previous.workspace.confidence*.66+directReward*.34),
      uncertainty:clamp(previous.workspace.uncertainty*.6+predictionError*.4)
    },
    memory:{
      working:previous.memory.working,
      episodic:[...previous.memory.episodic,episode].slice(-40)
    },
    lastUpdated:Date.now()
  };
}
