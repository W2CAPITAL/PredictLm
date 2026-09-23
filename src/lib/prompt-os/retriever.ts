import { GENERATED_PROMPT_CORPUS } from './corpus.generated';

const STOP=new Set([
  'como','posso','pode','quero','preciso','criar','fazer','montar','comecar','começar','aprender','ensine','passo','passos',
  'zero','sobre','para','uma','umas','uns','que','qual','quais','isso','isto','esse','essa','este','esta','agora','hoje'
]);

function toks(s:string){
  return new Set(String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!STOP.has(x)));
}
export function retrievePromptPatterns(query:string,limit=3){
  const q=toks(query);
  if(!q.size)return [];
  return GENERATED_PROMPT_CORPUS.map(p=>{
    const title=toks(p.title);
    const tags=toks(p.tags.join(' '));
    const text=toks([p.category,p.text].join(' '));
    let score=0,strong=0,weak=0;
    for(const t of q){
      if(title.has(t)){score+=6;strong++;continue;}
      if(tags.has(t)){score+=7;strong++;continue;}
      if(text.has(t)){score+=2;weak++;}
    }
    const relevant=q.size===1?(strong>=1||weak>=1):(strong>=1||weak>=2);
    return {p,score,relevant};
  }).filter(x=>x.relevant&&x.score>=2).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.p);
}
