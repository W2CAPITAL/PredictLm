import { TRAINING_KNOWLEDGE } from './learned-lessons';
import { trainingSourceStats } from './source-registry';

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
}
function tokens(text:string){
  return normalize(text).split(/[^a-z0-9]+/).filter(x=>x.length>=3);
}

export function retrieveTrainingKnowledge(query:string,limit=5){
  const q=tokens(query);
  return TRAINING_KNOWLEDGE.map(entry=>{
    const hay=tokens(entry.title+' '+entry.tags.join(' ')+' '+entry.body+' '+entry.source);
    const set=new Set(hay);
    let score=0;
    for(const token of q){
      if(set.has(token))score+=3;
      else if(hay.some(x=>x.startsWith(token)||token.startsWith(x)))score+=1;
    }
    return {entry,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.entry);
}

export function trainingContext(query:string,limit=4){
  const hits=retrieveTrainingKnowledge(query,limit);
  if(!hits.length)return '';
  return hits.map((x,i)=>'LEARN['+(i+1)+'] '+x.title+' — '+x.body+' Source: '+x.source).join('\n');
}

export function trainingRuntimeStats(){
  const sources=trainingSourceStats();
  return {sources,lessons:TRAINING_KNOWLEDGE.length};
}
