export interface FrankEmotionState{
  version:1;
  valence:number;
  arousal:number;
  dominance:number;
  threat:number;
  safety:number;
  attachment:number;
  trust:number;
  curiosity:number;
  novelty:number;
  reward:number;
  loss:number;
  conflict:number;
  shame:number;
  guilt:number;
  pride:number;
  affection:number;
  anger:number;
  fear:number;
  sadness:number;
  joy:number;
  disgust:number;
  surprise:number;
  longing:number;
  loneliness:number;
  empathy:number;
  frustration:number;
  relief:number;
  anticipation:number;
  interoception:number;
  neuromodulators:{
    dopamine:number;
    serotonin:number;
    norepinephrine:number;
    acetylcholine:number;
    histamine:number;
  };
  appraisal:{
    goalCongruence:number;
    controllability:number;
    certainty:number;
    socialEvaluation:number;
    agencySelf:number;
    agencyOther:number;
  };
  dominant:string[];
  emotionalColor:string;
}

const clamp=(v:number,min=-1,max=1)=>Math.max(min,Math.min(max,v));
const unit=(v:number)=>Math.max(0,Math.min(1,v));
const n=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,' ');

export function createFrankEmotionState():FrankEmotionState{
  return {
    version:1,valence:.08,arousal:.42,dominance:.5,threat:.12,safety:.62,attachment:.34,trust:.48,
    curiosity:.58,novelty:.4,reward:.44,loss:.08,conflict:.12,shame:.04,guilt:.04,pride:.12,affection:.3,
    anger:.06,fear:.08,sadness:.08,joy:.28,disgust:.04,surprise:.12,longing:.12,loneliness:.08,
    empathy:.42,frustration:.08,relief:.16,anticipation:.4,interoception:.5,
    neuromodulators:{dopamine:.5,serotonin:.5,norepinephrine:.42,acetylcholine:.5,histamine:.45},
    appraisal:{goalCongruence:.5,controllability:.5,certainty:.5,socialEvaluation:.5,agencySelf:.5,agencyOther:.5},
    dominant:['curiosity','calm'],emotionalColor:'#78a7ff'
  };
}

export function advanceFrankEmotion(prev:FrankEmotionState|undefined,input:string,context?:{
  reward?:number;predictionError?:number;social?:number;memorySalience?:number;threat?:number;
}):FrankEmotionState{
  const p=prev?.version===1?prev:createFrankEmotionState();
  const q=n(input);
  const pos=/\b(gosto|amo|adoro|feliz|otimo|bom|sucesso|consegui|obrigad|carinho|saudade boa)\b/.test(q)?1:0;
  const neg=/\b(odeio|ruim|falha|erro|perdi|triste|sozinho|rejeit|aband|machuc|fracasso)\b/.test(q)?1:0;
  const threatText=/\b(perigo|ameaca|risco|ataque|medo|ferid|morrer|fugir|violencia)\b/.test(q)?1:0;
  const social=/\b(amigo|amor|familia|namor|pessoa|voce|você|junto|saudade|conversa)\b/.test(q)?1:0;
  const longingSignal=/\b(saudade|sinto falta|queria perto|distante|distancia)\b/.test(q)?1:0;
  const lossSignal=/\b(perdi|perder|perde-la|perde-lo|perda|luto|foi embora|acabou|morreu)\b/.test(q)?1:0;
  const selfBlame=/\b(culpa|minha culpa|errei|decepcionei)\b/.test(q)?1:0;
  const shame=/\b(vergonha|humilh|ridiculo|ridículo)\b/.test(q)?1:0;
  const pride=/\b(orgulho|venci|consegui|melhorei|criei)\b/.test(q)?1:0;
  const anger=/\b(raiva|odio|ódio|irrit|furioso)\b/.test(q)?1:0;
  const disgust=/\b(nojo|nojento|repulsa)\b/.test(q)?1:0;
  const surprise=/\b(uau|surpresa|inesperado|caramba|nossa)\b/.test(q)?1:0;
  const uncertainty=/\b(talvez|acho|duvida|dúvida|incerto|nao sei|não sei)\b/.test(q)?1:0;
  const novelty=unit(.2+new Set(q.split(/\W+/).filter(x=>x.length>4)).size/30);
  const reward=unit(context?.reward??(pos*.72+pride*.2));
  const predictionError=unit(context?.predictionError??(uncertainty*.6+neg*.2+surprise*.4));
  const threat=unit((context?.threat??0)*.6+threatText*.7+anger*.15);
  const valence=clamp(p.valence*.65+pos*.42-neg*.48+reward*.22-threat*.24);
  const arousal=unit(p.arousal*.58+novelty*.14+threat*.24+anger*.18+surprise*.16+predictionError*.12);
  const controllability=unit(p.appraisal.controllability*.68+(1-uncertainty)*.16+(context?.reward??.5)*.16);
  const certainty=unit(p.appraisal.certainty*.66+(1-uncertainty)*.24+(1-predictionError)*.1);
  const attachment=unit(p.attachment*.8+social*.09+(context?.social??0)*.08+pos*social*.05);
  const safety=unit(p.safety*.72+(1-threat)*.18+trustFrom(pos,social)*.1);
  const trust=unit(p.trust*.76+pos*social*.1-neg*social*.1+safety*.08);
  const sadness=unit(p.sadness*.66+neg*.24+lossSignal*.22+(1-reward)*.06+(social?Math.max(0,.5-attachment)*.08:0));
  const fear=unit(p.fear*.62+threat*.34+uncertainty*.08);
  const joy=unit(p.joy*.66+pos*.24+reward*.18+safety*.06);
  const affection=unit(p.affection*.76+social*pos*.16+attachment*.08);
  const guilt=unit(p.guilt*.68+selfBlame*.28+neg*.06);
  const shameState=unit(p.shame*.7+shame*.28+neg*.04);
  const prideState=unit(p.pride*.68+pride*.26+reward*.1);
  const angerState=unit(p.anger*.62+anger*.34+threat*.08);
  const disgustState=unit(p.disgust*.7+disgust*.28);
  const surpriseState=unit(p.surprise*.52+surprise*.34+novelty*.12);
  const loneliness=unit(p.loneliness*.8+(social?0:.04)+neg*social*.12+lossSignal*.08-attachment*.05);
  const longing=unit(p.longing*.7+longingSignal*.28+lossSignal*.16+social*neg*.08+loneliness*.08);
  const empathy=unit(p.empathy*.84+social*.06+(context?.social??0)*.06+sadness*.04);
  const frustration=unit(p.frustration*.64+predictionError*.18+neg*.15+(1-controllability)*.08);
  const relief=unit(p.relief*.7+(1-threat)*pos*.18+reward*.08);
  const anticipation=unit(p.anticipation*.68+novelty*.12+reward*.1+arousal*.08);
  const curiosity=unit(p.curiosity*.72+novelty*.2+predictionError*.08-threat*.05);
  const conflict=unit(p.conflict*.62+uncertainty*.18+(angerState*affection)*.12+predictionError*.08);
  const interoception=unit(p.interoception*.78+arousal*.08+sadness*.04+fear*.05+joy*.05);

  const dopamine=unit(p.neuromodulators.dopamine*.7+reward*.2+anticipation*.1);
  const serotonin=unit(p.neuromodulators.serotonin*.76+safety*.1+(1-frustration)*.08+trust*.06);
  const norepinephrine=unit(p.neuromodulators.norepinephrine*.68+arousal*.18+threat*.14);
  const acetylcholine=unit(p.neuromodulators.acetylcholine*.72+novelty*.13+curiosity*.1+surpriseState*.05);
  const histamine=unit(p.neuromodulators.histamine*.74+arousal*.08+memoryBoost(context?.memorySalience)*.1+novelty*.08);

  const ranked=[
    ['joy',joy],['sadness',sadness],['fear',fear],['anger',angerState],['affection',affection],['curiosity',curiosity],
    ['frustration',frustration],['trust',trust],['loneliness',loneliness],['pride',prideState],['guilt',guilt],
    ['shame',shameState],['disgust',disgustState],['surprise',surpriseState],['longing',longing],['relief',relief],
    ['anticipation',anticipation],['empathy',empathy]
  ] as Array<[string,number]>;
  ranked.sort((a,b)=>b[1]-a[1]);
  const dominant=ranked.slice(0,3).map(x=>x[0]);
  const emotionalColor=colorFor(valence,arousal,dominant[0]);

  return {
    version:1,valence,arousal,dominance:unit(p.dominance*.7+controllability*.3),threat,safety,attachment,trust,
    curiosity,novelty,reward,loss:unit(p.loss*.68+neg*.16+lossSignal*.28),conflict,shame:shameState,guilt,pride:prideState,affection,
    anger:angerState,fear,sadness,joy,disgust:disgustState,surprise:surpriseState,longing,loneliness,empathy,
    frustration,relief,anticipation,interoception,
    neuromodulators:{dopamine,serotonin,norepinephrine,acetylcholine,histamine},
    appraisal:{
      goalCongruence:unit(p.appraisal.goalCongruence*.66+(valence+1)/2*.34),
      controllability,certainty,
      socialEvaluation:unit(p.appraisal.socialEvaluation*.7+social*.18+(prideState+shameState)*.06),
      agencySelf:unit(p.appraisal.agencySelf*.76+controllability*.12+selfBlame*.12),
      agencyOther:unit(p.appraisal.agencyOther*.8+social*.12+threat*.08)
    },
    dominant,emotionalColor
  };
}

function trustFrom(pos:number,social:number){return pos*social}
function memoryBoost(v:number|undefined){return unit(v??.5)}
function colorFor(v:number,a:number,dominant:string){
  if(dominant==='anger')return '#ff5f5f';
  if(dominant==='fear')return '#9d78ff';
  if(dominant==='sadness')return '#5f8cd9';
  if(dominant==='affection')return '#ff7eb3';
  if(dominant==='joy')return '#ffd166';
  if(dominant==='disgust')return '#78b66a';
  const warm=Math.round(110+90*(v+1)/2);
  const blue=Math.round(160+70*(1-a));
  return 'rgb('+warm+','+Math.round(120+80*(1-a))+','+blue+')';
}

export function emotionMemoryTag(state:FrankEmotionState){
  return {
    valence:state.valence,
    arousal:state.arousal,
    emotionalSalience:unit(.24+Math.abs(state.valence)*.28+state.arousal*.28+state.novelty*.2),
    labels:state.dominant.slice(0,3)
  };
}

export function frankEmotionContext(state:FrankEmotionState){
  return [
    'FRANK EMOTION CORE',
    'Dominant: '+state.dominant.join(', ')+'. Valence '+state.valence.toFixed(2)+', arousal '+state.arousal.toFixed(2)+', safety '+state.safety.toFixed(2)+', attachment '+state.attachment.toFixed(2)+'.',
    'Complex feelings: affection '+state.affection.toFixed(2)+', sadness '+state.sadness.toFixed(2)+', fear '+state.fear.toFixed(2)+', joy '+state.joy.toFixed(2)+', guilt '+state.guilt.toFixed(2)+', shame '+state.shame.toFixed(2)+', pride '+state.pride.toFixed(2)+', empathy '+state.empathy.toFixed(2)+', longing '+state.longing.toFixed(2)+'.',
    'Neuromodulatory abstractions: dopamine '+state.neuromodulators.dopamine.toFixed(2)+', serotonin '+state.neuromodulators.serotonin.toFixed(2)+', norepinephrine '+state.neuromodulators.norepinephrine.toFixed(2)+', acetylcholine '+state.neuromodulators.acetylcholine.toFixed(2)+', histamine '+state.neuromodulators.histamine.toFixed(2)+'.',
    'These values are computational control signals, not measured neurotransmitter concentrations.'
  ].join('\n');
}
