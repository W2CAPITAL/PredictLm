export type KnowledgeKind='episode'|'decision'|'constraint'|'entity'|'concept'|'error'|'preference';

export interface KnowledgeNode{
  id:string;
  kind:KnowledgeKind;
  title:string;
  summary:string;
  tokens:string[];
  firstSeen:number;
  lastSeen:number;
  mentions:number;
  confidence:number;
  source:'user'|'assistant';
}

export interface KnowledgeEdge{
  from:string;
  to:string;
  relation:'related'|'supports'|'contradicts'|'follows';
  weight:number;
  updatedAt:number;
}

export interface KnowledgeFabricState{
  version:1;
  nodes:KnowledgeNode[];
  edges:KnowledgeEdge[];
  lastUpdated:number;
}

const KEY='predictlm-knowledge-fabric-v1';
const STOP=new Set(['para','como','uma','uns','das','dos','que','isso','essa','este','esta','com','sem','the','and','for','from','your','voce','você','quero','preciso','fazer','criar']);

function norm(v:string){
  return String(v||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}
function words(v:string){
  return norm(v).split(/[^a-z0-9]+/).filter(x=>x.length>=4&&!STOP.has(x)).slice(0,48);
}
function hash(v:string){
  let h=2166136261;
  for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function compact(v:string,max=300){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max)}
function inferKind(text:string,role:'user'|'assistant'):KnowledgeKind{
  const q=norm(text);
  if(/\b(decidi|decisao|decisão|vamos usar|ficou definido|definido|escolhi)\b/.test(q))return 'decision';
  if(/\b(nunca|sempre|nao deve|não deve|sem |obrigatorio|obrigatório|restricao|restrição)\b/.test(q))return 'constraint';
  if(/\b(erro|falha|bug|quebrou|nao funciona|não funciona|exception|timeout)\b/.test(q))return 'error';
  if(role==='user'&&/\b(prefiro|gosto|quero que|nao quero|não quero)\b/.test(q))return 'preference';
  return 'episode';
}
function titleFor(text:string){
  const clean=compact(text,100);
  return clean.length<76?clean:clean.slice(0,73)+'...';
}
function shared(a:string[],b:string[]){
  const bs=new Set(b);let n=0;
  for(const t of new Set(a))if(bs.has(t))n++;
  return n;
}
function negated(text:string){
  return /\b(nao|não|nunca|sem|jamais|not|never|no)\b/.test(norm(text));
}

export function createKnowledgeFabric():KnowledgeFabricState{
  return {version:1,nodes:[],edges:[],lastUpdated:Date.now()};
}

export function ingestKnowledgeTurn(
  previous:KnowledgeFabricState|undefined,
  role:'user'|'assistant',
  content:string
):KnowledgeFabricState{
  const state=previous?.version===1?previous:createKnowledgeFabric();
  const summary=compact(content,340);
  if(summary.length<8)return state;
  const tk=words(summary);
  if(!tk.length)return state;
  const kind=inferKind(summary,role);
  const signature=kind+'|'+tk.slice(0,10).join('|');
  const id='k_'+hash(signature);
  const now=Date.now();
  const nodes=[...state.nodes];
  const existing=nodes.findIndex(x=>x.id===id);
  if(existing>=0){
    nodes[existing]={...nodes[existing],summary,lastSeen:now,mentions:nodes[existing].mentions+1,confidence:Math.min(1,nodes[existing].confidence+.03)};
  }else{
    nodes.unshift({id,kind,title:titleFor(summary),summary,tokens:tk,firstSeen:now,lastSeen:now,mentions:1,confidence:role==='user'?.82:.64,source:role});
  }

  const current=nodes.find(x=>x.id===id)!;
  const edges=[...state.edges.filter(e=>e.from!==id||now-e.updatedAt<90*86400000)];
  for(const other of nodes){
    if(other.id===id)continue;
    const overlap=shared(current.tokens,other.tokens);
    if(overlap<2)continue;
    const relation=negated(current.summary)!==negated(other.summary)&&overlap>=3?'contradicts':'related';
    const key=id+'|'+other.id+'|'+relation;
    if(edges.some(e=>e.from+'|'+e.to+'|'+e.relation===key))continue;
    edges.push({from:id,to:other.id,relation,weight:Math.min(1,.25+overlap*.12),updatedAt:now});
    if(edges.length>420)break;
  }

  return {
    version:1,
    nodes:nodes.sort((a,b)=>(b.mentions*b.confidence+b.lastSeen/1e15)-(a.mentions*a.confidence+a.lastSeen/1e15)).slice(0,180),
    edges:edges.slice(-420),
    lastUpdated:now
  };
}

export function relevantKnowledge(state:KnowledgeFabricState|undefined,query:string,limit=8){
  if(!state?.nodes?.length)return [];
  const q=words(query);
  return state.nodes.map(node=>{
    const overlap=shared(q,node.tokens);
    const recency=Math.max(0,1-(Date.now()-node.lastSeen)/(90*86400000));
    const score=overlap*4+node.confidence*2+Math.min(2,node.mentions*.2)+recency;
    return {node,score};
  }).filter(x=>x.score>2.2).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.node);
}

export function knowledgeContext(state:KnowledgeFabricState|undefined,query:string){
  const nodes=relevantKnowledge(state,query,7);
  if(!nodes.length)return '';
  const ids=new Set(nodes.map(x=>x.id));
  const contradictions=(state?.edges||[]).filter(e=>e.relation==='contradicts'&&ids.has(e.from)&&ids.has(e.to)).slice(0,4);
  return [
    'PERSISTENT KNOWLEDGE FABRIC — use only when relevant; newer explicit user instructions override older entries.',
    ...nodes.map(n=>'MEM '+n.kind+' · '+n.summary),
    ...contradictions.map(e=>'CONTRADICTION FLAG · '+e.from+' ↔ '+e.to),
    'Do not expose this memory ledger unless the user asks about remembered context.'
  ].join('\n');
}

export function readBrowserKnowledgeFabric(){
  if(typeof window==='undefined')return createKnowledgeFabric();
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    return raw?.version===1?raw as KnowledgeFabricState:createKnowledgeFabric();
  }catch{return createKnowledgeFabric()}
}
export function writeBrowserKnowledgeFabric(state:KnowledgeFabricState){
  if(typeof window==='undefined')return;
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}
}
export function recordBrowserKnowledgeTurn(role:'user'|'assistant',content:string){
  const next=ingestKnowledgeTurn(readBrowserKnowledgeFabric(),role,content);
  writeBrowserKnowledgeFabric(next);
  return next;
}
export function browserKnowledgeContext(query:string){
  return knowledgeContext(readBrowserKnowledgeFabric(),query);
}
