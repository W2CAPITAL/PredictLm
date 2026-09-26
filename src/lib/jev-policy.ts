export type JevTier='fast'|'balanced'|'strong'|'long';

export interface JevRouteDecision{
  tier:JevTier;
  confidence:number;
  complexity:number;
  reasoning:number;
  toolComplexity:number;
  contextPressure:number;
  reasons:string[];
}

type Msg={role:string;content:string};
type FileLike={path:string;content:string;language?:string};

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const norm=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,' ').replace(/[^a-z0-9_./-]+/g,' ').replace(/\s+/g,' ').trim();
const terms=(s:string)=>new Set(norm(s).split(' ').filter(x=>x.length>=3&&!['para','como','uma','que','com','sem','the','and','this','isso','essa','esse'].includes(x)));

export function jevRouteDecision(
  prompt:string,
  options:{deep?:boolean;hasTools?:boolean;contextChars?:number;build?:boolean;research?:boolean;legal?:boolean}={}
):JevRouteDecision{
  const p=norm(prompt);
  const length=String(prompt||'').length;
  const code=/\b(code|codigo|typescript|javascript|python|react|next|api|banco|database|sql|bug|erro|refator|arquitet|deploy|build|implemente|corrija)\b/.test(p);
  const multi=/\b(compare|compar|analise|analisa|estrateg|plano|arquitet|investigue|pesquise|prove|demonstre|otimize|melhore|integre|migre|refator)\b/.test(p);
  const create=/\b(crie|criar|construa|implemente|desenvolva|gere|build|faça|faca)\b/.test(p);
  const highStakes=options.legal||/\b(jurid|processo|tribunal|contrato|prazo|saude|medic|financeir|seguranca|security)\b/.test(p);
  const complexity=clamp(
    (length>900?.28:length>350?.16:.05)+
    (code?.24:0)+(multi?.24:0)+(create?.12:0)+(options.build?.24:0)+(options.research?.14:0)
  );
  const reasoning=clamp((options.deep?.34:0)+(multi?.3:0)+(highStakes?.22:0)+(code?.16:0));
  const toolComplexity=clamp((options.hasTools?.34:0)+(options.build?.38:0)+(options.research?.22:0)+(highStakes?.12:0));
  const contextChars=Math.max(0,Number(options.contextChars||0));
  const contextPressure=clamp(contextChars/60000);
  const weighted=complexity*.34+reasoning*.33+toolComplexity*.23+contextPressure*.10;
  let tier:JevTier='fast';
  if(contextPressure>.86||weighted>.82)tier='long';
  else if(options.build||options.deep||weighted>.56)tier='strong';
  else if(weighted>.26)tier='balanced';

  // Low-confidence routing never downgrades a demanding task.
  const confidence=clamp(.58+Math.abs(weighted-.5)*.62+(options.build?.12:0));
  if((options.build||highStakes)&&tier==='fast')tier='balanced';

  const reasons=[
    code?'code':'',
    multi?'multi-step reasoning':'',
    options.build?'build/tools':'',
    options.research?'research':'',
    highStakes?'high-stakes verification':'',
    contextPressure>.55?'large context':''
  ].filter(Boolean);
  return {tier,confidence,complexity,reasoning,toolComplexity,contextPressure,reasons};
}

function overlapScore(a:string,b:string){
  const aa=terms(a),bb=terms(b);
  if(!aa.size||!bb.size)return 0;
  let hit=0;
  for(const x of aa)if(bb.has(x))hit++;
  return hit/Math.max(1,Math.min(aa.size,bb.size));
}

/**
 * Verbatim context compaction inspired by fast-jev-compaction:
 * never rewrites retained messages, preserves newest turns, and removes old
 * low-relevance turns instead of summarizing them into lossy prose.
 */
export function jevCompactHistory<T extends Msg>(
  messages:T[],
  goal:string,
  options:{maxChars?:number;preserveRecent?:number}={}
){
  const maxChars=Math.max(4000,options.maxChars||24000);
  const preserveRecent=Math.max(2,options.preserveRecent||8);
  const rows=messages.filter(x=>x&&typeof x.content==='string');
  const pinnedStart=0;
  const recentStart=Math.max(0,rows.length-preserveRecent);
  const scored=rows.map((message,index)=>({
    message,index,
    pinned:index===pinnedStart||index>=recentStart,
    score:overlapScore(message.content,goal)+(message.role==='user'?.08:0)
  }));

  let selected=scored.filter(x=>x.pinned);
  const selectedIds=new Set(selected.map(x=>x.index));
  let chars=selected.reduce((n,x)=>n+x.message.content.length,0);
  for(const row of scored.filter(x=>!x.pinned).sort((a,b)=>b.score-a.score||b.index-a.index)){
    if(row.score<=0)continue;
    if(chars+row.message.content.length>maxChars)continue;
    selected.push(row);selectedIds.add(row.index);chars+=row.message.content.length;
  }
  selected=selected.sort((a,b)=>a.index-b.index);

  // If pinned content alone exceeds the budget, keep the newest pinned turns.
  while(chars>maxChars&&selected.length>2){
    const removable=selected.findIndex(x=>!x.pinned||x.index!==pinnedStart);
    if(removable<0)break;
    chars-=selected[removable].message.content.length;
    selected.splice(removable,1);
  }
  return {
    messages:selected.map(x=>x.message),
    stats:{before:rows.length,after:selected.length,charsBefore:rows.reduce((n,x)=>n+x.content.length,0),charsAfter:chars,dropped:rows.length-selected.length}
  };
}

/**
 * File selection keeps exact file bodies. Policy and ranking stay in code,
 * matching Jev's recommendation to separate judgment from action.
 */
export function jevSelectWorkspaceFiles<T extends FileLike>(
  files:T[],
  task:string,
  options:{maxFiles?:number;maxChars?:number}={}
){
  const maxFiles=Math.max(4,options.maxFiles||24);
  const maxChars=Math.max(12000,options.maxChars||65000);
  const requested=[...String(task||'').matchAll(/(?:^|\s|[('"`])([\w./-]+\.(?:tsx?|jsx?|mjs|cjs|json|css|md|yml|yaml|sql|py))(?:\s|$|[)'"`,])/g)].map(x=>x[1]);
  const root=/^(package\.json|tsconfig(?:\.[^.]+)?\.json|next\.config\.|vite\.config\.|README|AGENTS\.md|CLAUDE\.md|src\/app\/(?:page|layout)\.|src\/App\.)/i;
  const scored=files.map((file,index)=>{
    const path=String(file.path||'');
    let score=overlapScore(path+' '+file.content.slice(0,1200),task)*12;
    if(root.test(path))score+=4;
    if(requested.some(x=>path===x||path.endsWith('/'+x)))score+=30;
    if(/test|spec/i.test(path)&&/test|bug|erro|corrij|fix/i.test(task))score+=5;
    if(/package\.json$/.test(path))score+=2;
    return {file,index,score};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);

  const chosen:T[]=[];
  let chars=0;
  for(const row of scored){
    if(chosen.length>=maxFiles)break;
    if(row.score<=0&&chosen.length>=6)continue;
    const size=row.file.content.length;
    if(chars+size>maxChars&&chosen.length>=4)continue;
    chosen.push(row.file);chars+=size;
  }
  return {
    files:chosen,
    stats:{before:files.length,after:chosen.length,charsBefore:files.reduce((n,x)=>n+x.content.length,0),charsAfter:chars}
  };
}
