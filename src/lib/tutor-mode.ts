export type TutorKnowledgeType='memory'|'concept'|'procedure'|'design';
export type TutorQuestionType='choice'|'short'|'open';
export type TutorNextAction='answer_pending'|'review'|'probe'|'practice'|'assess'|'complete';

export interface TutorAttempt{
  correct:boolean;
  at?:number;
}

export interface TutorProgressInput{
  type:TutorKnowledgeType;
  attempts:TutorAttempt[];
  qualitativeMastered?:boolean;
  hasPending?:boolean;
  dueReview?:boolean;
}

const RECENCY_WEIGHTS=[0.5,0.7,0.85,0.95,1] as const;
const CONFIDENCE_CAP:Record<number,number>={1:0.5,2:0.8};

function normalize(text:string){
  return String(text||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function levenshtein(a:string,b:string){
  const x=normalize(a),y=normalize(b);
  if(!x)return y.length;
  if(!y)return x.length;
  const prev=Array.from({length:y.length+1},(_,i)=>i);
  for(let i=1;i<=x.length;i++){
    let last=prev[0];
    prev[0]=i;
    for(let j=1;j<=y.length;j++){
      const old=prev[j];
      const cost=x[i-1]===y[j-1]?0:1;
      prev[j]=Math.min(prev[j]+1,prev[j-1]+1,last+cost);
      last=old;
    }
  }
  return prev[y.length];
}

function similarity(a:string,b:string){
  const x=normalize(a),y=normalize(b);
  const max=Math.max(x.length,y.length);
  if(!max)return 1;
  return 1-levenshtein(x,y)/max;
}

export function isTutorRequest(prompt:string){
  const p=normalize(prompt);
  return /\b(me ensine|ensine me|quero aprender|quero estudar|estudar|estudo|tutor|tutoria|quiz|simulado|flashcard|flashcards|pratique comigo|praticar|me teste|teste meu|explique como professor|aula|revisao para prova|revisar para prova|plano de estudos|mastery|dominar esse assunto)\b/.test(p);
}

export function inferTutorKnowledgeType(prompt:string):TutorKnowledgeType{
  const p=normalize(prompt);
  if(/\b(decor|memor|vocab|definicao|termo|datas?|formula)\b/.test(p))return 'memory';
  if(/\b(procedimento|passo a passo|como fazer|algoritmo|calculo|resolver|executar|pratica)\b/.test(p))return 'procedure';
  if(/\b(projeto|design|arquitetura|estrategia|criar uma solucao|tradeoff)\b/.test(p))return 'design';
  return 'concept';
}

export function computeTutorMastery(attempts:TutorAttempt[]|boolean[]){
  const correctness=attempts.map(x=>typeof x==='boolean'?x:x.correct);
  if(!correctness.length)return 0;
  const recent=correctness.slice(-RECENCY_WEIGHTS.length);
  const weights=RECENCY_WEIGHTS.slice(RECENCY_WEIGHTS.length-recent.length);
  let weighted=0,total=0;
  for(let i=0;i<recent.length;i++){
    const w=weights[i];
    weighted+=w*(recent[i]?1:0);
    total+=w;
  }
  const score=total?weighted/total:0;
  return Math.min(score,CONFIDENCE_CAP[recent.length]??1);
}

export function tutorMasteryThreshold(type:TutorKnowledgeType){
  return type==='memory'||type==='procedure'?0.9:1;
}

export function tutorNextAction(input:TutorProgressInput):TutorNextAction{
  if(input.hasPending)return 'answer_pending';
  if(input.dueReview)return 'review';

  const mastery=computeTutorMastery(input.attempts);
  if(input.type==='concept'||input.type==='design'){
    if(input.qualitativeMastered)return 'complete';
    return input.attempts.length?'assess':'probe';
  }
  if(mastery>=tutorMasteryThreshold(input.type))return 'complete';
  return input.attempts.length?'practice':'probe';
}

export function gradeTutorAnswer(userAnswer:string,expectedAnswer:string,type:TutorQuestionType='short'){
  const user=normalize(userAnswer);
  const expected=normalize(expectedAnswer);
  if(!expected)return {correct:false,score:0,reason:'expected-answer-missing'};

  if(type==='choice'){
    const correct=user.replace(/\s+/g,'')===expected.replace(/\s+/g,'');
    return {correct,score:correct?1:0,reason:correct?'exact-choice':'choice-mismatch'};
  }

  if(type==='short'){
    if(user===expected)return {correct:true,score:1,reason:'exact-short'};
    const score=similarity(user,expected);
    const correct=expected.length<=30&&score>=0.85;
    return {correct,score,reason:correct?'near-short':'short-mismatch'};
  }

  const keywords=expected.split(/[,;\n]+/).map(normalize).filter(Boolean);
  if(!keywords.length)return {correct:false,score:0,reason:'open-keywords-missing'};
  const matched=keywords.filter(k=>user.includes(k)).length;
  const score=matched/keywords.length;
  return {correct:score>=0.6,score,reason:score>=0.6?'open-keywords':'open-insufficient'};
}

export function tutorSystemContext(prompt:string){
  if(!isTutorRequest(prompt))return '';

  const type=inferTutorKnowledgeType(prompt);
  const wantsQuiz=/\b(quiz|simulado|me teste|teste meu|flashcard|flashcards)\b/.test(normalize(prompt));
  const wantsPlan=/\b(plano de estudos|cronograma|mastery|dominar esse assunto)\b/.test(normalize(prompt));

  return [
    'TUTOR MODE ativo.',
    'Objetivo pedagógico: '+type+'.',
    'Use a sequência PROBE → TEACH/PRACTICE → ASSESS → REVIEW, avançando por evidência de domínio, não por uma fase arbitrária.',
    'Uma resposta correta isolada não basta para declarar domínio.',
    type==='concept'||type==='design'
      ? 'Para conceitos/design, avalie compreensão por explicação Feynman, aplicação e trade-offs; não use só comparação literal de texto.'
      : 'Para memória/procedimento, prefira checagem objetiva e prática repetida com feedback curto.',
    'Quando usar conteúdo recuperado, preserve fonte/arquivo/página/chunk quando disponível e não invente citações.',
    'Se contexto foi truncado ou a fonte não cobre algo, diga isso claramente.',
    wantsQuiz
      ? 'O usuário pediu teste: faça UMA questão por vez, não revele a resposta antes da tentativa e dê feedback depois.'
      : 'Explique de forma progressiva, com exemplo concreto e uma checagem curta de entendimento quando isso ajudar.',
    wantsPlan
      ? 'Estruture o plano em objetivos pequenos com pré-requisitos, critério de domínio e revisão futura.'
      : ''
  ].filter(Boolean).join('\n');
}

const STATE_KEY='predictlm-tutor-progress-v1';

export function tutorTopicKey(topic:string){
  return normalize(topic).slice(0,120);
}

export function readTutorAttempts(topic:string):TutorAttempt[]{
  if(typeof window==='undefined')return [];
  try{
    const all=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');
    const value=all?.[tutorTopicKey(topic)];
    return Array.isArray(value?.attempts)?value.attempts.slice(-20):[];
  }catch{return []}
}

export function recordTutorAttempt(topic:string,correct:boolean){
  if(typeof window==='undefined')return;
  try{
    const all=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');
    const key=tutorTopicKey(topic);
    const attempts:Array<TutorAttempt>=Array.isArray(all?.[key]?.attempts)?all[key].attempts:[];
    attempts.push({correct,at:Date.now()});
    all[key]={attempts:attempts.slice(-20),updatedAt:Date.now()};
    localStorage.setItem(STATE_KEY,JSON.stringify(all));
  }catch{}
}
