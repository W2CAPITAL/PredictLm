import { TRAINING_KNOWLEDGE } from './learned-lessons';
import { trainingSourceStats } from './source-registry';
import { githubKnowledgeStats } from '@/lib/github-knowledge-engine';

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
}
const TRAINING_STOPWORDS=new Set([
  'como','posso','pode','quero','preciso','criar','fazer','montar','comecar','começar','aprender','ensine','passo','passos',
  'zero','sobre','para','uma','umas','uns','que','qual','quais','isso','isto','esse','essa','este','esta','agora','hoje'
]);
function tokens(text:string){
  return normalize(text).split(/[^a-z0-9]+/).filter(x=>x.length>=3);
}
function queryTokens(text:string){
  return tokens(text).filter(x=>!TRAINING_STOPWORDS.has(x));
}

export function retrieveTrainingKnowledge(query:string,limit=5){
  const q=queryTokens(query);
  if(!q.length)return [];
  return TRAINING_KNOWLEDGE.map(entry=>{
    const title=tokens(entry.title);
    const tags=tokens(entry.tags.join(' '));
    const body=tokens(entry.body+' '+entry.source);
    const titleSet=new Set(title), tagSet=new Set(tags), bodySet=new Set(body);
    let score=0,strong=0,bodyHits=0;
    for(const token of q){
      if(titleSet.has(token)){score+=7;strong++;continue;}
      if(tagSet.has(token)){score+=8;strong++;continue;}
      if(bodySet.has(token)){score+=3;bodyHits++;continue;}
    }
    return {entry,score,relevant:q.length===1?(strong>=1||bodyHits>=1):(strong>=1||bodyHits>=2)};
  }).filter(x=>x.relevant&&x.score>=3).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.entry);
}

export function trainingContext(query:string,limit=4){
  const hits=retrieveTrainingKnowledge(query,limit);
  if(!hits.length)return '';
  return hits.map((x,i)=>'LEARN['+(i+1)+'] '+x.title+' — '+x.body+' Source: '+x.source).join('\n');
}

export function trainingRuntimeStats(){
  const sources=trainingSourceStats();
  return {sources,lessons:TRAINING_KNOWLEDGE.length,githubKnowledge:githubKnowledgeStats()};
}
