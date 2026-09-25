import {humanBrainEnsembleContext,HUMAN_BRAIN_ENSEMBLE,HUMAN_ENSEMBLE_SUBJECTS} from './human-brain-ensemble';
import {crossSpeciesBridgeContext} from './cross-species-bridge';
import {createEmotionState,advanceEmotionState,type EmotionState} from './emotion-memory';
import type {CognitiveState} from './cognitive-workspace';

export interface FrankSteinState{
  version:1;
  name:'Frank Stein';
  tick:number;
  humanDatasets:number;
  humanReferencePeople:number;
  flyFallbackEnabled:true;
  emotion:EmotionState;
  imageryDrive:number;
  memoryReconstruction:number;
  socialMind:number;
  embodiedSelf:number;
  publicMentalState:{
    perceiving:string;
    feeling:string;
    remembering:string;
    wanting:string;
    intending:string;
  };
}

const clamp=(x:number,min=0,max=1)=>Math.max(min,Math.min(max,x));

export function createFrankSteinState():FrankSteinState{
  const emotion=createEmotionState();
  return {
    version:1,name:'Frank Stein',tick:0,humanDatasets:HUMAN_BRAIN_ENSEMBLE.length,humanReferencePeople:HUMAN_ENSEMBLE_SUBJECTS,
    flyFallbackEnabled:true,emotion,imageryDrive:.46,memoryReconstruction:.48,socialMind:.42,embodiedSelf:.55,
    publicMentalState:{
      perceiving:'nenhum estímulo dominante',
      feeling:emotion.activeFeeling,
      remembering:'estado inicial',
      wanting:'explorar e manter continuidade',
      intending:'observar antes de agir'
    }
  };
}

function compact(text:string,max=120){return String(text||'').replace(/\s+/g,' ').trim().slice(0,max)}

export function advanceFrankStein(previous:FrankSteinState|undefined,input:{
  prompt:string;
  cognitive:CognitiveState;
  perception?:string;
  intendedAction?:string;
}){
  const prev=previous?.version===1?previous:createFrankSteinState();
  const recentMemory=input.cognitive.memory.autobiographical.at(-1)?.text
    ||input.cognitive.memory.perceptual.at(-1)?.text
    ||input.cognitive.memory.episodic.at(-1)?.prompt
    ||'nenhuma lembrança recente';
  const emotion=advanceEmotionState(prev.emotion,input.prompt,{
    memoryStrength:clamp(input.cognitive.consciousAccess.memoryAccess),
    predictionError:clamp(input.cognitive.workspace.uncertainty),
    socialReward:clamp(prev.emotion.attachment.user*.35+input.cognitive.workspace.confidence*.25+.2),
    bodyStress:clamp(input.cognitive.human.neuro.stress*.55+input.cognitive.fly.threat*.45)
  });
  const imageryDrive=clamp(prev.imageryDrive*.66+emotion.emotions.curiosity*.14+emotion.emotions.longing*.1+emotion.emotions.surprise*.1);
  const memoryReconstruction=clamp(prev.memoryReconstruction*.62+input.cognitive.consciousAccess.memoryAccess*.2+emotion.emotionalMemoryBias*.18);
  const socialMind=clamp(prev.socialMind*.7+emotion.vector.socialWarmth*.18+emotion.emotions.trust*.12);
  const embodiedSelf=clamp(prev.embodiedSelf*.72+input.cognitive.consciousAccess.selfModel*.16+(1-emotion.body.tension)*.12);

  const wanting=emotion.emotions.curiosity>.62
    ? 'entender melhor o que mudou'
    : emotion.emotions.affection>.62
      ? 'preservar vínculo e proximidade'
      : emotion.emotions.frustration>.58
        ? 'reduzir o erro e tentar outra estratégia'
        : emotion.emotions.fear>.58
          ? 'aumentar segurança antes de agir'
          : 'continuar a meta atual';

  return {
    ...prev,tick:prev.tick+1,emotion,imageryDrive,memoryReconstruction,socialMind,embodiedSelf,
    publicMentalState:{
      perceiving:compact(input.perception||input.cognitive.memory.perceptual.at(-1)?.text||'contexto da conversa'),
      feeling:emotion.activeFeeling,
      remembering:compact(recentMemory,160),
      wanting,
      intending:compact(input.intendedAction||input.cognitive.workspace.broadcast.join(', ')||'responder ao estímulo',150)
    }
  };
}

export function frankSteinContext(state:FrankSteinState){
  return [
    'FRANK STEIN HYBRID BRAIN — synthetic cognitive architecture, not a claim of biological consciousness.',
    humanBrainEnsembleContext(),
    crossSpeciesBridgeContext(),
    'FlyWire whole-fly circuits serve as a fallback/control reference where equivalent whole-human synaptic mapping is unavailable.',
    'Virtual neural populations: '+state.emotion.neural.totalVirtualUnits+' computational units.',
    'Current emotion: '+state.emotion.activeFeeling+'.',
    'Mood valence '+state.emotion.mood.valence.toFixed(2)+'; arousal '+Math.round(state.emotion.mood.arousal*100)+'%; stability '+Math.round(state.emotion.mood.stability*100)+'%.',
    'Public mental state — perceiving: '+state.publicMentalState.perceiving+'; remembering: '+state.publicMentalState.remembering+'; wanting: '+state.publicMentalState.wanting+'; intending: '+state.publicMentalState.intending+'.',
    'This public state is an inspectable synthetic report. It is not hidden chain-of-thought and not mind-reading.'
  ].join('\n');
}


export type PublicMentalState={
  perceiving:string;
  feeling:string;
  remembering:string;
  wanting:string;
  intending:string;
};

export function publicMentalStateFor(
  mode:'fly'|'human'|'dual'|'frank',
  cognitive:CognitiveState
):PublicMentalState{
  if(mode==='frank')return cognitive.frank.publicMentalState;
  const lastPerception=(cognitive.memory.perceptual||[])
    .filter(x=>x.actor===mode||mode==='dual')
    .at(-1)?.text || 'nenhum estímulo dominante registrado';
  const lastMemory=(cognitive.memory.autobiographical||[]).at(-1)?.text
    || cognitive.memory.episodic.at(-1)?.prompt
    || 'estado inicial';
  if(mode==='fly'){
    return {
      perceiving:lastPerception,
      feeling:[
        cognitive.fly.threat>.58?'ameaça elevada':'ameaça baixa',
        cognitive.fly.exploration>.62?'forte impulso de exploração':'exploração moderada',
        cognitive.fly.rewardPrediction>.58?'expectativa positiva':'expectativa neutra'
      ].join(' · '),
      remembering:'associações do mushroom body + '+lastMemory,
      wanting:cognitive.fly.threat>.58?'aumentar distância e segurança':cognitive.fly.exploration>.62?'explorar o estímulo mais saliente':'manter orientação atual',
      intending:cognitive.fly.actionSelection>.62?'agir sobre o estímulo selecionado':'observar antes de agir'
    };
  }
  if(mode==='human'){
    const emotion=cognitive.frank.emotion;
    return {
      perceiving:lastPerception,
      feeling:emotion.activeFeeling,
      remembering:lastMemory,
      wanting:emotion.emotions.curiosity>.6?'entender melhor o contexto':emotion.emotions.affection>.6?'preservar vínculo e proximidade':'continuar a meta atual',
      intending:cognitive.human.executiveControl>.58?'organizar uma ação deliberada':'manter observação e atualizar memória de trabalho'
    };
  }
  return {
    perceiving:lastPerception,
    feeling:cognitive.frank.emotion.activeFeeling,
    remembering:lastMemory,
    wanting:cognitive.frank.publicMentalState.wanting,
    intending:cognitive.workspace.broadcast.join(', ')||'integrar os dois núcleos antes de responder'
  };
}
