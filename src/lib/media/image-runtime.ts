import {compactText} from '@/lib/token-budget';

const IMPORTANT_IMAGE_LINE=/^(?:CANONICAL MATCHUP|LEFT:|RIGHT:|CENTER:|COLOR DISCIPLINE:|SETTING LOCK:|ORIGINAL USER INTENT:|STYLE TARGET:|ACTION LOCK:|COMPOSITION:|SUBJECT\[|\s{0,2}MUST SHOW:|MATCHUP RELATIONSHIP:|Kurama is |Gold\/orange belongs|SEMANTIC REPAIR|USER-SUPPLIED REFERENCE LOCK:|PERSISTENT VISUAL ID MEMORY:)/i;

export function compactImagePromptForTransport(fullPrompt:string,originalPrompt:string,maxChars=2600){
  const original=String(originalPrompt||'').replace(/\s+/g,' ').trim();
  const lines=String(fullPrompt||'')
    .replace(/\r/g,'')
    .split('\n')
    .map(line=>line.trim())
    .filter(Boolean);

  const selected:string[]=[];
  const seen=new Set<string>();
  const push=(line:string)=>{
    const clean=line.replace(/\s+/g,' ').trim();
    if(!clean)return;
    const key=clean.toLowerCase();
    if(seen.has(key))return;
    seen.add(key);
    selected.push(clean);
  };

  push('USER REQUEST: '+original);
  for(const line of lines){
    if(IMPORTANT_IMAGE_LINE.test(line))push(line);
  }

  // Preserve one concise quality directive even when the expanded prompt is huge.
  const quality=lines.find(line=>/clean anatomy|readable silhouettes|controlled effects|intentional lighting|crisp focal/i.test(line));
  if(quality)push(quality);

  let result=selected.join('\n');
  if(result.length<Math.min(maxChars*.55,1200)){
    result+='\n'+compactText(fullPrompt,Math.max(180,Math.floor(maxChars/5)));
  }
  result=result
    .replace(/\n{3,}/g,'\n\n')
    .trim();

  if(result.length>maxChars){
    result=compactText(result,Math.max(220,Math.floor(maxChars/3.7)));
  }
  if(result.length>maxChars)result=result.slice(0,maxChars).trim();
  return result;
}

export function imageProviderOrder(input:string){
  const allowed=new Set(['qwen','gemini','vercel-gateway','comfyui','nano','configured']);
  const parsed=String(input||'')
    .split(',')
    .map(x=>x.trim().toLowerCase())
    .filter(x=>allowed.has(x));
  return parsed.length?[...new Set(parsed)]:['qwen','gemini','vercel-gateway','comfyui','nano','configured'];
}

export function imageRouteBudget(startedAt:number,totalMs=52_000){
  const total=Math.max(12_000,Math.min(55_000,Number(totalMs)||52_000));
  const remaining=()=>Math.max(0,total-(Date.now()-startedAt));
  const canTry=(reserveMs=5_000)=>remaining()>Math.max(1_500,reserveMs);
  const timeout=(desiredMs=16_000,reserveMs=4_000)=>{
    const available=remaining()-reserveMs;
    return Math.max(1_200,Math.min(Math.max(1_200,desiredMs),available));
  };
  return {total,remaining,canTry,timeout};
}

export function publicImageBaseCandidates(configured:string){
  const defaults=['https://gen.pollinations.ai/image/'];
  const rows=[String(configured||'').trim(),...defaults]
    .filter(Boolean)
    .map(x=>x.endsWith('/')?x:x+'/');
  return [...new Set(rows)];
}
