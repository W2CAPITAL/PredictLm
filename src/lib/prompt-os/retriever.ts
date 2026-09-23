import { GENERATED_PROMPT_CORPUS } from './corpus.generated';

function toks(s:string){
  return new Set(String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').split(/[^a-z0-9]+/).filter(x=>x.length>=3));
}
export function retrievePromptPatterns(query:string,limit=3){
  const q=toks(query);
  return GENERATED_PROMPT_CORPUS.map(p=>{
    const h=toks([p.title,p.category,...p.tags,p.text].join(' '));
    let score=0;for(const t of q)if(h.has(t))score+=p.tags.includes(t)?4:1;
    return {p,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.p);
}
