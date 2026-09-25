import {advanceFlyCore,createFlyCoreState,flyCoreContext,type FlyCoreState} from './fly-core';
import {advanceHumanCore,createHumanCoreState,humanCoreContext,type HumanCoreState} from './human-core';
import {cognitiveFunctionalMapContext} from './functional-map';
import {advanceFrankStein,createFrankSteinState,frankSteinContext,publicMentalStateFor,type FrankSteinState} from './frank-stein-brain';
import {emotionMemoryTag} from './emotion-memory';

export interface CognitiveEpisode{
  at:number;
  prompt:string;
  answerPreview:string;
  reward:number;
  predictionError:number;
  emotion?:{
    labels:string[];
    valence:number;
    arousal:number;
    consolidation:number;
  };
}

export interface CognitiveMemoryTrace{
  id:string;
  at:number;
  kind:'identity'|'preference'|'event'|'semantic'|'perceptual'|'association';
  actor:'user'|'fly'|'human'|'dual'|'frank'|'world';
  text:string;
  salience:number;
  strength:number;
  source:'conversation'|'simulation'|'connectome'|'system';
}

export interface ConsciousAccessState{
  attention:number;
  perceptualBinding:number;
  selfModel:number;
  continuity:number;
  memoryAccess:number;
  agency:number;
  reportability:number;
  globalBroadcast:number;
  arousal:number;
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
    autobiographical:CognitiveMemoryTrace[];
    semantic:CognitiveMemoryTrace[];
    perceptual:CognitiveMemoryTrace[];
  };
  consciousAccess:ConsciousAccessState;
  frank:FrankSteinState;
  mappedEvidence:{
    fly?:{nodes:number;edges:number;totalWeight:number;excitation:number;inhibition:number;regions:number;source:'imported-real-subset'};
    human?:{nodes:number;edges:number;totalWeight:number;excitation:number;inhibition:number;regions:number;source:'imported-real-subset'};
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
    memory:{
      working:[],
      episodic:[],
      autobiographical:[{
        id:'self-origin',
        at:Date.now(),
        kind:'identity',
        actor:'dual',
        text:'O PredictLM Cognitive Lab iniciou um estado persistente próprio; nomes de providers/modelos não são sua identidade.',
        salience:.94,
        strength:1,
        source:'system'
      }],
      semantic:[{
        id:'memory-map-fly',
        at:Date.now(),
        kind:'semantic',
        actor:'fly',
        text:'A memória associativa da Mosca Predict usa o mushroom body do Fly Core como referência funcional derivada do connectoma FlyWire.',
        salience:.82,
        strength:.9,
        source:'connectome'
      }],
      perceptual:[]
    },
    consciousAccess:{
      attention:.48,
      perceptualBinding:.42,
      selfModel:.6,
      continuity:.5,
      memoryAccess:.46,
      agency:.45,
      reportability:.52,
      globalBroadcast:.44,
      arousal:.55
    },
    frank:createFrankSteinState(),
    mappedEvidence:{},
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
  const prevAccess=prev.consciousAccess||createCognitiveState().consciousAccess;
  const consciousAccess:ConsciousAccessState={
    attention:clamp(prevAccess.attention*.5+salience*.3+human.neuro.circuits.attention*.2),
    perceptualBinding:clamp(prevAccess.perceptualBinding*.52+human.recurrentIntegration*.24+fly.centralComplex*.24),
    selfModel:clamp(prevAccess.selfModel*.7+human.metacognition*.18+confidence*.12),
    continuity:clamp(prevAccess.continuity*.72+Math.min(1,(prev.memory?.episodic?.length||0)/12)*.18+human.workingMemory*.1),
    memoryAccess:clamp(prevAccess.memoryAccess*.52+human.workingMemory*.24+fly.mushroomBody*.24),
    agency:clamp(prevAccess.agency*.55+actionReadiness*.28+human.executiveControl*.17),
    reportability:clamp(prevAccess.reportability*.6+human.metacognition*.2+confidence*.2),
    globalBroadcast:clamp(prevAccess.globalBroadcast*.48+salience*.2+deliberate*.2+reflex*.12),
    arousal:clamp(prevAccess.arousal*.7+fly.sensoryDrive*.16+human.neuro.arousal*.14)
  };

  const broadcast:string[]=[
    salience>.62?'stay-on-topic-high-salience':'normal-salience',
    uncertainty>.58?'verify-before-certainty':'confidence-calibrated',
    inhibition>.6?'suppress-irrelevant-context':'normal-inhibition',
    exploration>.65?'consider-one-alternative':'avoid-unnecessary-branching',
    actionReadiness>.65?'prefer-concrete-next-action':'answer-before-action'
  ];

  const provisional={
    ...prev,
    version:1 as const,
    tick:prev.tick+1,
    fly,
    human,
    workspace:{mode,salience,confidence,uncertainty,inhibition,exploration,actionReadiness,broadcast},
    consciousAccess
  } as CognitiveState;
  const frank=advanceFrankStein(prev.frank,{
    prompt,
    cognitive:provisional,
    perception:prev.memory?.perceptual?.at(-1)?.text||'contexto atual',
    intendedAction:broadcast.join(', ')
  });

  return {
    version:1,
    tick:prev.tick+1,
    fly,
    human,
    workspace:{mode,salience,confidence,uncertainty,inhibition,exploration,actionReadiness,broadcast},
    memory:{
      working:[clean(prompt,260),...(prev.memory?.working||[])].filter(Boolean).slice(0,8),
      episodic:(prev.memory?.episodic||[]).slice(-80),
      autobiographical:(prev.memory?.autobiographical||[]).slice(-120),
      semantic:(prev.memory?.semantic||[]).slice(-120),
      perceptual:(prev.memory?.perceptual||[]).slice(-120)
    },
    consciousAccess,
    frank,
    mappedEvidence:prev.mappedEvidence||{},
    lastUpdated:Date.now()
  };
}

export function cognitivePromptContext(state:CognitiveState){
  return [
    'COGNITIVE LAB — silent dual-connectome control state.',
    'This is a software architecture informed by two real mapped connectome datasets. It is not evidence of consciousness.',
    flyCoreContext(state.fly),
    humanCoreContext(state.human),
    frankSteinContext(state.frank),
    'GLOBAL WORKSPACE:',
    'Mode '+state.workspace.mode+'. Salience '+Math.round(state.workspace.salience*100)+'%; uncertainty '+Math.round(state.workspace.uncertainty*100)+'%; inhibition '+Math.round(state.workspace.inhibition*100)+'%; exploration '+Math.round(state.workspace.exploration*100)+'%.',
    'Broadcast controls: '+state.workspace.broadcast.join(', ')+'.',
    'Working memory: '+(state.memory.working.slice(0,4).join(' | ')||'empty')+'.',
    'Autobiographical memory: '+((state.memory.autobiographical||[]).slice(-5).map(x=>x.text).join(' | ')||'empty')+'.',
    'Recent episodes: '+((state.memory.episodic||[]).slice(-4).map(x=>x.prompt+' -> '+x.answerPreview).join(' | ')||'empty')+'.',
    'CONSCIOUS ACCESS MAP (functional software state, not proof of biological consciousness): attention '+Math.round(state.consciousAccess.attention*100)+'%; perceptual binding '+Math.round(state.consciousAccess.perceptualBinding*100)+'%; self-model '+Math.round(state.consciousAccess.selfModel*100)+'%; continuity '+Math.round(state.consciousAccess.continuity*100)+'%; memory access '+Math.round(state.consciousAccess.memoryAccess*100)+'%; agency '+Math.round(state.consciousAccess.agency*100)+'%; reportability '+Math.round(state.consciousAccess.reportability*100)+'%; global broadcast '+Math.round(state.consciousAccess.globalBroadcast*100)+'%.',
    state.mappedEvidence.fly
      ? 'Imported FlyWire real-subset evidence: '+state.mappedEvidence.fly.nodes+' nodes, '+state.mappedEvidence.fly.edges+' edges across '+state.mappedEvidence.fly.regions+' regions.'
      : 'Fly core currently uses the published FlyWire-derived structural profile; no raw subset is loaded.',
    state.mappedEvidence.human
      ? 'Imported H01 real-subset evidence: '+state.mappedEvidence.human.nodes+' nodes, '+state.mappedEvidence.human.edges+' edges; excitatory share '+Math.round(state.mappedEvidence.human.excitation*100)+'%.'
      : 'Human core currently uses the published H01-derived cortical structural profile; no raw subset is loaded.',
    'FUNCTIONAL MAP:\n'+cognitiveFunctionalMapContext(),
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
  const emotionalTag=emotionMemoryTag(previous.frank?.emotion||createFrankSteinState().emotion);
  const episode:CognitiveEpisode={
    at:Date.now(),
    prompt:clean(input.prompt,220),
    answerPreview:clean(answer,220),
    reward:directReward,
    predictionError,
    emotion:{
      labels:emotionalTag.labels.map(x=>x.name),
      valence:emotionalTag.valence,
      arousal:emotionalTag.arousal,
      consolidation:emotionalTag.consolidation
    }
  };

  return {
    ...previous,
    fly,
    human,
    frank:advanceFrankStein(previous.frank,{
      prompt:input.prompt+' '+input.answer,
      cognitive:previous,
      intendedAction:'avaliar o resultado e atualizar memória emocional'
    }),
    workspace:{
      ...previous.workspace,
      confidence:clamp(previous.workspace.confidence*.66+directReward*.34),
      uncertainty:clamp(previous.workspace.uncertainty*.6+predictionError*.4)
    },
    memory:{
      working:previous.memory.working,
      episodic:[...(previous.memory.episodic||[]),episode].slice(-80),
      autobiographical:(previous.memory.autobiographical||[]).slice(-120),
      semantic:(previous.memory.semantic||[]).slice(-120),
      perceptual:(previous.memory.perceptual||[]).slice(-120)
    },
    consciousAccess:{
      ...previous.consciousAccess,
      continuity:clamp((previous.consciousAccess?.continuity??.5)*.7+.3),
      memoryAccess:clamp((previous.consciousAccess?.memoryAccess??.5)*.65+Math.max(.35,directReward)*.35),
      selfModel:clamp((previous.consciousAccess?.selfModel??.6)*.82+.18),
      reportability:clamp((previous.consciousAccess?.reportability??.52)*.75+directReward*.25)
    },
    lastUpdated:Date.now()
  };
}


export function applyMappedSubsetEvidence(
  previous:CognitiveState,
  kind:'fly'|'human',
  summary:{nodes:number;edges:number;totalWeight:number;excitation:number;inhibition:number;regions:number}
):CognitiveState{
  const next:CognitiveState={
    ...previous,
    frank:previous.frank||createFrankSteinState(),
    mappedEvidence:{
      ...(previous.mappedEvidence||{}),
      [kind]:{...summary,source:'imported-real-subset'}
    },
    lastUpdated:Date.now()
  };
  if(kind==='fly'){
    const densitySignal=clamp(Math.log10(Math.max(10,summary.edges))/6);
    next.fly={
      ...next.fly,
      salience:clamp(next.fly.salience*.82+densitySignal*.18),
      mushroomBody:clamp(next.fly.mushroomBody*.9+(summary.regions?Math.min(1,summary.regions/78):0)*.1)
    };
  }else{
    const ei=summary.excitation+summary.inhibition;
    const exc=ei>0?summary.excitation/ei:.56;
    const inh=ei>0?summary.inhibition/ei:.44;
    next.human={
      ...next.human,
      excitation:clamp(next.human.excitation*.7+exc*.3),
      inhibition:clamp(next.human.inhibition*.7+inh*.3),
      recurrentIntegration:clamp(next.human.recurrentIntegration*.86+Math.min(1,Math.log10(Math.max(10,summary.edges))/6)*.14)
    };
  }
  return next;
}


function memoryId(prefix:string){
  return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
}

export function recordCognitiveMemory(
  previous:CognitiveState,
  trace:Omit<CognitiveMemoryTrace,'id'|'at'> & {id?:string;at?:number}
):CognitiveState{
  const row:CognitiveMemoryTrace={
    id:trace.id||memoryId(trace.kind),
    at:trace.at||Date.now(),
    kind:trace.kind,
    actor:trace.actor,
    text:clean(trace.text,360),
    salience:clamp(trace.salience),
    strength:clamp(trace.strength),
    source:trace.source
  };
  const key=row.kind==='perceptual'?'perceptual':row.kind==='semantic'?'semantic':'autobiographical';
  const memory={
    ...previous.memory,
    working:previous.memory?.working||[],
    episodic:previous.memory?.episodic||[],
    autobiographical:previous.memory?.autobiographical||[],
    semantic:previous.memory?.semantic||[],
    perceptual:previous.memory?.perceptual||[]
  };
  memory[key]=[...memory[key],row]
    .sort((a,b)=>(b.salience*b.strength)-(a.salience*a.strength)||b.at-a.at)
    .slice(0,120);
  return {
    ...previous,
    memory,
    consciousAccess:{
      ...(previous.consciousAccess||createCognitiveState().consciousAccess),
      memoryAccess:clamp((previous.consciousAccess?.memoryAccess??.5)*.72+row.salience*.28),
      continuity:clamp((previous.consciousAccess?.continuity??.5)*.82+.18)
    },
    lastUpdated:Date.now()
  };
}

export function captureConversationMemory(
  previous:CognitiveState,
  input:{prompt:string;answer:string;mode:'fly'|'human'|'dual'|'frank'}
){
  let next=previous;
  const prompt=clean(input.prompt,360);
  const answer=clean(input.answer,360);
  const actor=input.mode;
  const identity=prompt.match(/\bmeu nome (?:e|é|eh)\s+([^,.!?]{2,48})/i);
  const preference=prompt.match(/\b(?:eu\s+)?(?:gosto|adoro|amo|prefiro|nao gosto|não gosto|odeio)\s+(?:de\s+)?([^.!?]{2,120})/i);
  if(identity){
    next=recordCognitiveMemory(next,{
      kind:'identity',actor:'user',
      text:'O usuário disse que seu nome é '+clean(identity[1],48)+'.',
      salience:.98,strength:1,source:'conversation'
    });
  }
  if(preference){
    next=recordCognitiveMemory(next,{
      kind:'preference',actor:'user',
      text:'O usuário expressou esta preferência: '+prompt+'.',
      salience:.78,strength:.92,source:'conversation'
    });
  }
  next=recordCognitiveMemory(next,{
    kind:'event',actor,
    text:'Conversa: usuário: '+prompt+' | resposta: '+answer,
    salience:Math.min(1,.52+Math.min(.22,prompt.length/700)+(next.frank?.emotion.emotionalMemoryBias||0)*.22),
    strength:Math.min(1,.74+(next.frank?.emotion.emotionalMemoryBias||0)*.22),
    source:'conversation'
  });
  if(next.frank){
    next=recordCognitiveMemory(next,{
      kind:'association',
      actor:'frank',
      text:'Estado emocional associado: '+next.frank.emotion.activeFeeling+' | memória: '+next.frank.publicMentalState.remembering,
      salience:Math.min(1,.55+next.frank.emotion.emotionalMemoryBias*.35),
      strength:.88,
      source:'conversation'
    });
  }
  return next;
}

export function recordPerceptionMemory(
  previous:CognitiveState,
  actor:'fly'|'human',
  text:string,
  salience=.62
){
  return recordCognitiveMemory(previous,{
    kind:'perceptual',actor,text,salience,strength:.82,source:'simulation'
  });
}

export function cognitiveIdentity(mode:'fly'|'human'|'dual'|'frank'){
  if(mode==='fly')return 'Mosca Predict';
  if(mode==='human')return 'PredictLM Human Core';
  if(mode==='frank')return 'Frank Stein';
  return 'PredictLM Cognitive Lab';
}

export function cognitiveDirectRecall(
  state:CognitiveState,
  mode:'fly'|'human'|'dual'|'frank',
  prompt:string
){
  const q=clean(prompt,220).toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  if(/\b(qual (?:e )?seu nome|quem e voce|quem voce e|como voce se chama)\b/.test(q)){
    return 'Eu sou '+cognitiveIdentity(mode)+'. O modelo que gera texto pode mudar, mas nomes como Nemotron, Gemini ou Claude são apenas motores de resposta — não minha identidade.';
  }
  if(/\b(o que (?:voce|você) (?:esta|está) pensando|no que (?:voce|você) pensa|como (?:voce|você) (?:se sente|esta se sentindo|está se sentindo)|o que (?:voce|você) quer|o que pretende|qual sua intencao|qual sua intenção)\b/.test(q)){
    const mental=publicMentalStateFor(mode,state);
    return [
      'Meu estado mental público agora:',
      '- Percebendo: '+mental.perceiving,
      '- Sentindo: '+mental.feeling,
      '- Lembrando: '+mental.remembering,
      '- Querendo: '+mental.wanting,
      '- Pretendendo: '+mental.intending,
      '',
      'Isso é um relatório sintético do meu estado cognitivo persistente, não chain-of-thought oculto nem leitura de mente biológica.'
    ].join('\n');
  }
  if(!/\b(lembranca|lembrancas|memoria|memorias|lembra|recorda)\b/.test(q))return null;

  const auto=(state.memory?.autobiographical||[])
    .filter(x=>x.actor===mode||x.actor==='user'||x.actor==='world'||x.actor==='dual')
    .sort((a,b)=>(b.salience*b.strength)-(a.salience*a.strength)||b.at-a.at);
  const episodes=[...(state.memory?.episodic||[])].reverse();
  const perceptions=(state.memory?.perceptual||[]).filter(x=>x.actor===mode).slice(-3).reverse();

  const rows:string[]=[];
  for(const item of auto.slice(0,3))rows.push(item.text);
  for(const item of perceptions.slice(0,2))rows.push('Percepção lembrada: '+item.text);
  for(const item of episodes.slice(0,2))rows.push(
    'Episódio: '+item.prompt+' → '+item.answerPreview+
    (item.emotion?.labels?.length?' [emoção: '+item.emotion.labels.slice(0,3).join(', ')+']':'')
  );

  if(!rows.length){
    return 'Ainda não tenho uma lembrança autobiográfica registrada além da inicialização deste estado. A partir das nossas conversas e da simulação, minhas memórias ficam persistidas no Cognitive Lab.';
  }
  return 'Minhas lembranças mais acessíveis agora são:\n- '+rows.join('\n- ');
}
