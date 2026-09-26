export interface EvidenceNode{
  id:string;
  url:string;
  host:string;
  title:string;
  quality:number;
  relevance:number;
  tier:string;
  tokens:string[];
}
export interface EvidenceEdge{
  from:string;
  to:string;
  relation:'corroborates'|'possible-conflict'|'same-domain';
  weight:number;
}
export interface EvidenceGraph{
  nodes:EvidenceNode[];
  edges:EvidenceEdge[];
  clusters:Array<{label:string;nodeIds:string[]}>;
  gaps:string[];
}

const STOP=new Set(['para','como','uma','uns','das','dos','que','this','that','with','from','sobre','site','http','https']);
function norm(v:string){return String(v||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim()}
function toks(v:string){return norm(v).split(/[^a-z0-9]+/).filter(x=>x.length>=4&&!STOP.has(x)).slice(0,50)}
function host(url:string){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}}
function overlap(a:string[],b:string[]){const s=new Set(b);return [...new Set(a)].filter(x=>s.has(x)).length}
function neg(v:string){return /\b(no|not|never|nao|não|sem|falso|false|refuta|deny|denies)\b/.test(norm(v))}
function idOf(url:string){let h=0;for(let i=0;i<url.length;i++)h=(Math.imul(h,31)+url.charCodeAt(i))|0;return 'e_'+(h>>>0).toString(36)}

export function buildEvidenceGraph(items:any[],query:string):EvidenceGraph{
  const nodes:Array<EvidenceNode&{text:string}>=[];
  const seen=new Set<string>();
  for(const item of items||[]){
    const url=String(item?.url||'').trim();
    if(!url||seen.has(url))continue;
    seen.add(url);
    const title=String(item?.title||url).trim();
    const text=[title,item?.description,item?.summary].filter(Boolean).join(' ');
    nodes.push({
      id:idOf(url),url,host:host(url),title,
      quality:Number(item?.qualityScore||0),
      relevance:Number(item?.relevanceScore||0),
      tier:String(item?.qualityTier||'unknown'),
      tokens:toks(text),
      text
    });
    if(nodes.length>=32)break;
  }
  const edges:EvidenceEdge[]=[];
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
    const a=nodes[i],b=nodes[j];
    const shared=overlap(a.tokens,b.tokens);
    if(shared<2)continue;
    const relation=a.host===b.host?'same-domain':neg(a.text)!==neg(b.text)&&shared>=3?'possible-conflict':'corroborates';
    edges.push({from:a.id,to:b.id,relation,weight:Math.min(1,.2+shared*.12)});
  }
  const clusterMap=new Map<string,string[]>();
  for(const n of nodes){
    const label=n.tokens.find(t=>toks(query).includes(t))||n.tokens[0]||n.host||'geral';
    clusterMap.set(label,[...(clusterMap.get(label)||[]),n.id]);
  }
  const strong=nodes.filter(n=>n.quality>=70);
  const distinctStrongHosts=new Set(strong.map(n=>n.host)).size;
  const gaps:string[]=[];
  if(nodes.length<3)gaps.push('Poucas fontes recuperadas.');
  if(distinctStrongHosts<2)gaps.push('Baixa diversidade de fontes fortes.');
  if(edges.some(e=>e.relation==='possible-conflict'))gaps.push('Há possíveis conflitos semânticos entre fontes; revisar antes de concluir.');
  if(!nodes.some(n=>n.tier==='official'||n.tier==='academic'||n.tier==='primary'))gaps.push('Nenhuma fonte oficial/acadêmica/primária foi classificada.');
  return {
    nodes:nodes.map(({text,...n})=>n),
    edges:edges.slice(0,120),
    clusters:[...clusterMap.entries()].map(([label,nodeIds])=>({label,nodeIds})).sort((a,b)=>b.nodeIds.length-a.nodeIds.length).slice(0,12),
    gaps
  };
}
