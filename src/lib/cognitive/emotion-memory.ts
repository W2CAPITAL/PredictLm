import {advanceNeuralEnsemble,createNeuralEnsemble,type NeuralEnsembleState} from './neuron-ensemble';

export type EmotionName=
  |'joy'|'sadness'|'fear'|'anger'|'disgust'|'surprise'
  |'curiosity'|'affection'|'trust'|'loneliness'|'shame'|'pride'
  |'hope'|'frustration'|'calm'|'longing';

export interface EmotionVector{
  valence:number;
  arousal:number;
  dominance:number;
  certainty:number;
  socialWarmth:number;
  novelty:number;
}

export interface EmotionState{
  tick:number;
  vector:EmotionVector;
  emotions:Record<EmotionName,number>;
  mood:{valence:number;arousal:number;stability:number};
  body:{tension:number;energy:number;safety:number;socialNeed:number};
  attachment:{user:number;world:number;self:number};
  neural:NeuralEnsembleState;
  emotionalMemoryBias:number;
  activeFeeling:string;
}

const clamp=(x:number,min=0,max=1)=>Math.max(min,Math.min(max,x));
const bipolar=(x:number)=>Math.max(-1,Math.min(1,x));

export function createEmotionState():EmotionState{
  const names:EmotionName[]=['joy','sadness','fear','anger','disgust','surprise','curiosity','affection','trust','loneliness','shame','pride','hope','frustration','calm','longing'];
  return {
    tick:0,
    vector:{valence:.05,arousal:.32,dominance:.52,certainty:.5,socialWarmth:.48,novelty:.4},
    emotions:Object.fromEntries(names.map(x=>[x,x==='curiosity'?.5:x==='calm'?.45:.12])) as Record<EmotionName,number>,
    mood:{valence:.04,arousal:.3,stability:.72},
    body:{tension:.18,energy:.62,safety:.78,socialNeed:.32},
    attachment:{user:.28,world:.42,self:.56},
    neural:createNeuralEnsemble(),
    emotionalMemoryBias:.42,
    activeFeeling:'curiosidade tranquila'
  };
}

function signal(input:string){
  const q=input.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  const positive=/\b(gosto|adoro|amo|bom|legal|otimo|feliz|sucesso|obrigad|carinho|amizade)\b/.test(q)?1:0;
  const negative=/\b(odeio|ruim|pior|triste|perdi|falhou|inutil|dor|rejeit|sozinh)\b/.test(q)?1:0;
  const threat=/\b(perigo|medo|ameaca|risco|ataque|morrer|machucar|fraude|violencia)\b/.test(q)?1:0;
  const anger=/\b(raiva|odio|irrit|absurdo|injust|revolt)\b/.test(q)?1:0;
  const social=/\b(amigo|amor|namor|gosta de mim|saudade|junto|convers|pessoa|familia)\b/.test(q)?1:0;
  const praise=/\b(parabens|bom trabalho|acertou|perfeito|incrivel)\b/.test(q)?1:0;
  const novelty=Math.min(1,.18+new Set(q.split(/\W+/).filter(x=>x.length>4)).size/22);
  const question=/\?|\b(por que|como|qual|quem|sera|será)\b/.test(q)?1:0;
  return {positive,negative,threat,anger,social,praise,novelty,question};
}

export function advanceEmotionState(previous:EmotionState|undefined,input:string,ctx?:{
  memoryStrength?:number;
  socialReward?:number;
  predictionError?:number;
  bodyStress?:number;
}){
  const prev=previous||createEmotionState();
  const s=signal(input);
  const socialReward=clamp(ctx?.socialReward??(s.positive*.55+s.social*.25+s.praise*.2));
  const predictionError=clamp(ctx?.predictionError??s.novelty*.4);
  const bodyStress=clamp(ctx?.bodyStress??(s.threat*.65+s.negative*.18+s.anger*.17));
  const memoryStrength=clamp(ctx?.memoryStrength??.5);

  const valence=bipolar(prev.vector.valence*.68+(s.positive+s.praise)*.23-(s.negative+s.threat+s.anger)*.2+socialReward*.12);
  const arousal=clamp(prev.vector.arousal*.6+s.novelty*.12+s.threat*.22+s.anger*.18+s.positive*.08);
  const dominance=clamp(prev.vector.dominance*.72+(1-s.threat)*.08+s.praise*.1-s.negative*.08+.08);
  const certainty=clamp(prev.vector.certainty*.72+(1-predictionError)*.18-s.question*.05+.05);
  const socialWarmth=clamp(prev.vector.socialWarmth*.72+socialReward*.24-s.anger*.08);
  const novelty=clamp(prev.vector.novelty*.45+s.novelty*.55);

  const e={...prev.emotions};
  const blend=(name:EmotionName,target:number,retain=.68)=>e[name]=clamp(e[name]*retain+target*(1-retain));
  blend('joy',clamp((valence+1)/2*.55+socialReward*.45));
  blend('sadness',clamp((-valence)*.55+s.negative*.35+(1-socialReward)*.1));
  blend('fear',clamp(s.threat*.66+bodyStress*.22+predictionError*.12));
  blend('anger',clamp(s.anger*.62+s.negative*.18+bodyStress*.2));
  blend('disgust',clamp(s.negative*.3+s.anger*.15));
  blend('surprise',clamp(novelty*.72+predictionError*.28),.55);
  blend('curiosity',clamp(novelty*.44+s.question*.28+(1-s.threat)*.14+predictionError*.14),.6);
  blend('affection',clamp(socialReward*.58+socialWarmth*.42),.76);
  blend('trust',clamp(socialWarmth*.48+certainty*.24+(1-s.threat)*.28),.8);
  blend('loneliness',clamp(prev.body.socialNeed*.52+(1-socialReward)*.28+s.negative*.2),.82);
  blend('shame',clamp(s.negative*.15+(1-dominance)*.16),.86);
  blend('pride',clamp(s.praise*.58+dominance*.24+socialReward*.18),.76);
  blend('hope',clamp((valence+1)/2*.34+dominance*.24+certainty*.2+s.positive*.22),.74);
  blend('frustration',clamp(predictionError*.35+s.negative*.3+s.anger*.2+bodyStress*.15),.68);
  blend('calm',clamp((1-arousal)*.55+(1-bodyStress)*.45),.8);
  blend('longing',clamp(e.loneliness*.38+e.hope*.3+prev.attachment.user*.18+s.social*.14),.84);

  const neural=advanceNeuralEnsemble(prev.neural,{
    novelty,threat:clamp(s.threat*.8+bodyStress*.2),reward:clamp((valence+1)/2),
    social:clamp(s.social*.45+socialReward*.55),memory:memoryStrength,
    attention:clamp(.35+arousal*.25+novelty*.2+predictionError*.2),
    effort:clamp(predictionError*.48+s.question*.24+s.negative*.28),
    body:clamp(bodyStress*.55+arousal*.3+prev.body.energy*.15)
  });

  const body={
    tension:clamp(prev.body.tension*.7+bodyStress*.3),
    energy:clamp(prev.body.energy*.78+arousal*.14-bodyStress*.08),
    safety:clamp(prev.body.safety*.74+(1-s.threat)*.18-bodyStress*.08),
    socialNeed:clamp(prev.body.socialNeed*.84+(1-socialReward)*.1+s.social*.06)
  };
  const attachment={
    user:clamp(prev.attachment.user*.92+socialReward*.05+s.social*.03),
    world:clamp(prev.attachment.world*.94+s.novelty*.03+s.positive*.03),
    self:clamp(prev.attachment.self*.92+dominance*.04+certainty*.04)
  };
  const mood={
    valence:bipolar(prev.mood.valence*.88+valence*.12),
    arousal:clamp(prev.mood.arousal*.9+arousal*.1),
    stability:clamp(prev.mood.stability*.9+(1-predictionError)*.06+(1-bodyStress)*.04)
  };

  const ranked=Object.entries(e).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const activeFeeling=ranked.map(([name,value])=>name+' '+Math.round(value*100)+'%').join(' · ');
  return {
    tick:prev.tick+1,vector:{valence,arousal,dominance,certainty,socialWarmth,novelty},
    emotions:e,mood,body,attachment,neural,
    emotionalMemoryBias:clamp(prev.emotionalMemoryBias*.68+arousal*.18+Math.abs(valence)*.14),
    activeFeeling
  };
}

export function emotionMemoryTag(state:EmotionState){
  const top=Object.entries(state.emotions).sort((a,b)=>b[1]-a[1]).slice(0,4);
  return {
    valence:state.vector.valence,
    arousal:state.vector.arousal,
    labels:top.map(([name,value])=>({name,value})),
    consolidation:clamp(.28+state.emotionalMemoryBias*.5+state.neural.populations.amygdala.firing*.22)
  };
}
