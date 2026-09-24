import index from '@/data/github-knowledge-index.json';

export interface GitHubKnowledgeChunk{
  id:string;
  source:string;
  ref:string;
  path:string;
  license:string;
  domains:string[];
  heading:string;
  text:string;
  weight?:number;
}

const STOPWORDS=new Set([
  'como','posso','pode','quero','preciso','criar','fazer','montar','comecar','começar','passo','passos','zero',
  'sobre','para','uma','umas','uns','que','qual','quais','isso','isto','esse','essa','este','esta','agora','hoje',
  'com','sem','dos','das','por','porque','onde','quando'
]);

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
}
function toks(text:string){
  return normalize(text).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!STOPWORDS.has(x));
}

const chunks=(index.chunks||[]) as GitHubKnowledgeChunk[];
const docs=chunks.map(chunk=>({
  chunk,
  terms:toks([chunk.heading,...chunk.domains,chunk.text,chunk.source].join(' '))
}));
const df=new Map<string,number>();
for(const doc of docs){
  for(const term of new Set(doc.terms))df.set(term,(df.get(term)||0)+1);
}
const avgLen=docs.length?docs.reduce((s,d)=>s+d.terms.length,0)/docs.length:1;

function bm25(query:string,doc:{chunk:GitHubKnowledgeChunk;terms:string[]}){
  const q=[...new Set(toks(query))];
  if(!q.length)return 0;
  const freq=new Map<string,number>();
  for(const term of doc.terms)freq.set(term,(freq.get(term)||0)+1);
  let score=0;
  const N=Math.max(1,docs.length),k1=1.25,b=.7;
  for(const term of q){
    const f=freq.get(term)||0;
    if(!f)continue;
    const n=df.get(term)||0;
    const idf=Math.log(1+(N-n+.5)/(n+.5));
    const denom=f+k1*(1-b+b*doc.terms.length/Math.max(1,avgLen));
    score+=idf*(f*(k1+1)/denom);
  }
  return score*Number(doc.chunk.weight||1);
}

export function retrieveGitHubKnowledge(query:string,limit=3){
  const q=toks(query);
  if(!q.length)return [];
  const target=Math.max(1,Math.min(5,limit));
  const ranked=docs.map(doc=>({chunk:doc.chunk,score:bm25(query,doc)}))
    .filter(x=>x.score>.05)
    .sort((a,b)=>b.score-a.score);

  // Diversity-first: prefer one chunk per repository before allowing repeats.
  // This prevents one large/verbose source from monopolizing top-k context.
  const selected:typeof ranked=[];
  const seenSources=new Set<string>();
  for(const item of ranked){
    if(seenSources.has(item.chunk.source))continue;
    selected.push(item);
    seenSources.add(item.chunk.source);
    if(selected.length>=target)break;
  }
  if(selected.length<target){
    const selectedIds=new Set(selected.map(x=>x.chunk.id));
    for(const item of ranked){
      if(selectedIds.has(item.chunk.id))continue;
      selected.push(item);
      if(selected.length>=target)break;
    }
  }

  return selected.map(x=>({...x.chunk,score:x.score}));
}

export function githubKnowledgeContext(query:string,limit=3){
  return retrieveGitHubKnowledge(query,limit)
    .map((x,i)=>'GH['+(i+1)+'] '+x.heading+' — '+x.text+' Source: '+x.source+'@'+x.ref+' '+x.path+' · '+x.license)
    .join('\n');
}

export function githubKnowledgeStats(){
  return {
    version:String((index as any).knowledgeVersion||'unknown'),
    chunks:chunks.length,
    sources:new Set(chunks.map(x=>x.source)).size
  };
}
