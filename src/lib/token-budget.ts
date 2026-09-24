export type TokenSaveMode='lite'|'full'|'ultra';
export type CompactMessage={role:string;content:string};

export interface TokenBudgetStats{
  mode:TokenSaveMode;
  before:number;
  after:number;
  saved:number;
  savedPct:number;
  droppedMessages:number;
  dedupedBlocks:number;
}

const DEFAULTS={
  lite:{history:1800,context:2200,maxBlock:1000},
  full:{history:1200,context:1500,maxBlock:760},
  ultra:{history:800,context:950,maxBlock:520}
} as const;

export function estimateTokens(text:string){
  const s=String(text||'');
  if(!s)return 0;
  const ascii=(s.match(/[\x00-\x7F]/g)||[]).length;
  const nonAscii=s.length-ascii;
  return Math.max(1,Math.ceil(ascii/4+nonAscii/2));
}

export function normalizeForDedup(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export function compactText(text:string,maxTokens:number){
  let s=String(text||'')
    .replace(/\r/g,'')
    .replace(/[ \t]+/g,' ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
  if(estimateTokens(s)<=maxTokens)return s;

  const maxChars=Math.max(160,Math.floor(maxTokens*3.5));
  const lines=s.split('\n').map(x=>x.trim()).filter(Boolean);
  const seen=new Set<string>();
  const unique:string[]=[];
  for(const line of lines){
    const key=normalizeForDedup(line);
    if(!key||seen.has(key))continue;
    seen.add(key);
    unique.push(line);
  }
  s=unique.join('\n');
  if(s.length<=maxChars)return s;

  const sentences=s.split(/(?<=[.!?])\s+/).filter(Boolean);
  if(sentences.length>=3){
    const kept:string[]=[];
    let chars=0;
    for(const sentence of sentences){
      if(chars+sentence.length>maxChars)break;
      kept.push(sentence);
      chars+=sentence.length+1;
    }
    if(kept.length)return kept.join(' ');
  }

  const head=Math.floor(maxChars*.72);
  const tail=Math.max(80,maxChars-head-18);
  return s.slice(0,head).trim()+'\n[… compactado …]\n'+s.slice(-tail).trim();
}

export function dedupeBlocks(blocks:string[]){
  const seen=new Set<string>();
  const out:string[]=[];
  let deduped=0;
  for(const block of blocks){
    const cleaned=String(block||'').trim();
    if(!cleaned)continue;
    const key=normalizeForDedup(cleaned).slice(0,900);
    if(!key||seen.has(key)){deduped++;continue}
    seen.add(key);
    out.push(cleaned);
  }
  return {blocks:out,deduped};
}

export function packHistory(messages:CompactMessage[],mode:TokenSaveMode='full'){
  const budget=DEFAULTS[mode].history;
  const recent=messages.filter(x=>x&&typeof x.content==='string'&&x.content.trim()).slice(-14);
  const chosen:CompactMessage[]=[];
  const seen=new Set<string>();
  let used=0;
  for(let i=recent.length-1;i>=0;i--){
    const raw=recent[i];
    const dedupKey=raw.role+'|'+normalizeForDedup(raw.content);
    if(seen.has(dedupKey))continue;
    seen.add(dedupKey);
    const remaining=Math.max(80,budget-used);
    const content=compactText(raw.content,Math.min(remaining,mode==='ultra'?280:420));
    const cost=estimateTokens(content)+6;
    if(used+cost>budget&&chosen.length>=2)continue;
    chosen.unshift({...raw,content});
    used+=cost;
    if(used>=budget)break;
  }
  return {messages:chosen,dropped:Math.max(0,recent.length-chosen.length),tokens:used};
}

export function packContext(
  sections:{label:string;text:string;priority?:number}[],
  mode:TokenSaveMode='full'
){
  const cfg=DEFAULTS[mode];
  const before=sections.reduce((n,x)=>n+estimateTokens(x.text),0);
  const sorted=[...sections].sort((a,b)=>(b.priority||0)-(a.priority||0));
  const seen=new Set<string>();
  const blocks:string[]=[];
  let deduped=0;
  for(const section of sorted){
    const body=compactText(section.text,cfg.maxBlock);
    const key=normalizeForDedup(body).slice(0,1400);
    if(!key)continue;
    if(seen.has(key)){deduped++;continue}
    seen.add(key);
    blocks.push(section.label+'\n'+body);
  }
  const kept:string[]=[];
  let used=0;
  for(const block of blocks){
    const remain=cfg.context-used;
    if(remain<80)break;
    const compacted=compactText(block,remain);
    const cost=estimateTokens(compacted);
    if(cost<=0)continue;
    kept.push(compacted);
    used+=cost;
  }
  const text=kept.join('\n\n');
  return {
    text,
    before,
    after:estimateTokens(text),
    deduped
  };
}

export function optimizePromptPackage(input:{
  messages?:CompactMessage[];
  sections?:{label:string;text:string;priority?:number}[];
  mode?:TokenSaveMode;
}){
  const mode=input.mode||'full';
  const history=packHistory(input.messages||[],mode);
  const context=packContext(input.sections||[],mode);
  const before=(input.messages||[]).reduce((n,x)=>n+estimateTokens(x.content),0)+context.before;
  const after=history.tokens+context.after;
  const stats:TokenBudgetStats={
    mode,
    before,
    after,
    saved:Math.max(0,before-after),
    savedPct:before?Math.max(0,Math.round((1-after/before)*100)):0,
    droppedMessages:history.dropped,
    dedupedBlocks:context.deduped
  };
  return {messages:history.messages,context:context.text,stats};
}
