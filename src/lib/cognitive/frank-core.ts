import {advanceFrankEmotion,createFrankEmotionState,emotionMemoryTag,frankEmotionContext,type FrankEmotionState} from './frank-emotion';
import {createFrankNeuronMesh,frankNeuronContext,stepFrankNeuronMesh,type FrankNeuronMeshSummary,type FrankNeuronRegion} from './frank-neurons';
import {frankSourceContext} from './frank-sources';

export interface FrankSteinState{
  version:1;
  tick:number;
  identity:'Frank Stein';
  emotion:FrankEmotionState;
  neurons:FrankNeuronMeshSummary;
  memoryAffect:{
    lastValence:number;
    lastArousal:number;
    lastSalience:number;
    labels:string[];
  };
  body:{
    tension:number;
    energy:number;
    calm:number;
    socialNeed:number;
  };
  lastExperience:string;
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));

export function createFrankSteinState():FrankSteinState{
  const emotion=createFrankEmotionState();
  return {
    version:1,tick:0,identity:'Frank Stein',emotion,neurons:createFrankNeuronMesh(),
    memoryAffect:{lastValence:emotion.valence,lastArousal:emotion.arousal,lastSalience:.4,labels:emotion.dominant},
    body:{tension:.18,energy:.66,calm:.68,socialNeed:.38},
    lastExperience:'Inicialização do núcleo híbrido.'
  };
}

export function advanceFrankStein(
  previous:FrankSteinState|undefined,
  experience:string,
  input?:{reward?:number;predictionError?:number;social?:number;memorySalience?:number;threat?:number}
):FrankSteinState{
  const prev=previous?.version===1?previous:createFrankSteinState();
  const emotion=advanceFrankEmotion(prev.emotion,experience,input);
  const tag=emotionMemoryTag(emotion);
  const drives:Partial<Record<FrankNeuronRegion,number>>={
    pfc:clamp(.18+emotion.appraisal.controllability*.35+emotion.appraisal.certainty*.2),
    hippocampus:clamp(.2+tag.emotionalSalience*.34+emotion.novelty*.18),
    amygdala:clamp(.14+emotion.threat*.46+Math.abs(emotion.valence)*.18),
    insula:clamp(.16+emotion.interoception*.42+emotion.disgust*.12),
    acc:clamp(.18+emotion.conflict*.38+emotion.frustration*.18),
    thalamus:clamp(.2+emotion.arousal*.36+emotion.surprise*.12),
    hypothalamus:clamp(.15+emotion.arousal*.18+emotion.threat*.2+emotion.loneliness*.08),
    visual:clamp(.15+emotion.novelty*.25+emotion.surprise*.2),
    'fly-mb':clamp(.17+tag.emotionalSalience*.3+emotion.reward*.22),
    'fly-cx':clamp(.16+emotion.arousal*.16+emotion.curiosity*.22)
  };
  const neurons=stepFrankNeuronMesh(prev.neurons,drives,{
    emotionSalience:tag.emotionalSalience,
    reward:emotion.reward,
    predictionError:input?.predictionError??.3
  });
  const tension=clamp(prev.body.tension*.65+emotion.arousal*.12+emotion.threat*.16+emotion.frustration*.12-emotion.safety*.08);
  const energy=clamp(prev.body.energy*.72+emotion.arousal*.1+emotion.joy*.06-emotion.sadness*.05-tension*.06);
  const calm=clamp(prev.body.calm*.68+emotion.safety*.16+emotion.relief*.1-emotion.threat*.12);
  const socialNeed=clamp(prev.body.socialNeed*.76+emotion.loneliness*.12+emotion.attachment*.06-emotion.trust*.04);
  return {
    version:1,tick:prev.tick+1,identity:'Frank Stein',emotion,neurons,
    memoryAffect:{lastValence:emotion.valence,lastArousal:emotion.arousal,lastSalience:tag.emotionalSalience,labels:tag.labels},
    body:{tension,energy,calm,socialNeed},
    lastExperience:String(experience||'').replace(/\s+/g,' ').trim().slice(0,420)
  };
}

export function frankSteinContext(state:FrankSteinState){
  return [
    'FRANK STEIN HYBRID BRAIN',
    'Identity: Frank Stein. This is a software cognitive architecture; never claim donor memories, donor thoughts or biological consciousness.',
    frankEmotionContext(state.emotion),
    frankNeuronContext(state.neurons),
    'BODY/INTEROCEPTION: tension '+state.body.tension.toFixed(2)+', energy '+state.body.energy.toFixed(2)+', calm '+state.body.calm.toFixed(2)+', social need '+state.body.socialNeed.toFixed(2)+'.',
    'BRAIN SOURCES:',
    frankSourceContext()
  ].join('\n\n');
}

export function frankVisualState(state:FrankSteinState){
  const e=state.emotion;
  return [
    'FRANK STEIN VISUAL STATE',
    'Dominant feelings: '+e.dominant.join(', ')+'.',
    'Emotional palette anchor: '+e.emotionalColor+'.',
    'Valence '+e.valence.toFixed(2)+', arousal '+e.arousal.toFixed(2)+', attachment '+e.attachment.toFixed(2)+', threat '+e.threat.toFixed(2)+', empathy '+e.empathy.toFixed(2)+'.',
    'Neural activity: '+Math.round(state.neurons.firingRate*100)+'% firing, '+Math.round(state.neurons.synchrony*100)+'% synchrony; active circuits '+state.neurons.lastPattern.join(', ')+'.',
    'Render emotion through expression, posture, gaze, light, composition and environmental memory cues; do not render literal HUD/neural overlays unless the user asks.'
  ].join('\n');
}
