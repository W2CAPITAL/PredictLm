import { compactText } from '@/lib/token-budget';

export type VisualReferenceProvider='firecrawl'|'pinterest-via-firecrawl'|'google-images'|'pinterest-via-google';

export interface VisualReference{
  provider:VisualReferenceProvider;
  title:string;
  imageUrl:string;
  sourceUrl:string;
  site:string;
}

export interface VisualReferencePlan{
  query:string;
  references:VisualReference[];
  warnings:string[];
}

function normalize(input:string){
  return String(input||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

function safeHost(input:string){
  try{return new URL(input).hostname.toLowerCase()}catch{return ''}
}

function coreVisualIntent(input:string){
  const raw=String(input||'').trim();
  const cut=raw.split(/\.\s*(?:Cinematic|Photoreal|Editorial|3D|Anime|Minimal|Product)\s+visual direction/i)[0];
  return compactText(cut||raw,280);
}

export function isPersistentSelfPortraitRequest(input:string){
  const p=normalize(coreVisualIntent(input));
  return /\b(como voce se ve|como voce e na vida real|como voce seria na vida real|sua aparencia|seu rosto|seu visual|sua forma humana|mostre voce|retrato de voce|how do you see yourself|what do you look like|how would you look in real life|your real life appearance|your appearance|your face|portrait of yourself)\b/.test(p);
}

export function isSpecificVisualPrompt(input:string){
  const raw=coreVisualIntent(input);
  const p=normalize(raw);
  if(/\b(naruto|sasuke|kurama|susanoo|sharingan|rinnegan|uchiha|uzumaki|pokemon|pikachu|goku|vegeta|sonic|mario|zelda|batman|superman|spider[- ]?man|homem aranha|kuromi|hello kitty)\b/.test(p))return true;
  if(/\b(personagem|character|anime|manga|franquia|franchise|jogo|game|filme|movie|serie|series|marca|brand)\b/.test(p)&&/[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}\d_-]{2,}/u.test(raw))return true;
  if(/[“"'‘’][^”"'‘’]{3,}[”"'‘’]/.test(raw))return true;
  return /\b(?:personagem|character)\s+[\p{L}\d_-]{3,}/iu.test(raw);
}

export function buildVisualIdentityLock(input:string){
  const p=normalize(coreVisualIntent(input));
  const rules=[
    'VISUAL IDENTITY LOCK: preserve the exact identity of every explicitly named character, product, brand, landmark or known subject.',
    'Do not replace a named subject with a generic lookalike, approximate archetype, unrelated creature, mecha, costume or hybrid.',
    'Preserve canonical silhouette, facial traits, costume, colors, symbols, scale and requested transformation/power form when those details are known.',
    'Keep distinct named opponents visually separate; never fuse them unless the user explicitly asks for a fusion.',
    'The requested action, matchup and composition are mandatory, not optional inspiration.'
  ];
  if(/\b(naruto|uzumaki)\b/.test(p)&&/\b(kurama|kyuubi|kyubi|nove caudas|nine tails)\b/.test(p)){
    rules.push('Naruto lock: Naruto Uzumaki must remain recognizably Naruto inside the golden-orange Kurama/Nine-Tails chakra form, with fox-like chakra silhouette/tails and canonical black chakra markings; never substitute a generic blond warrior, lion or dragon.');
  }
  if(/\b(sasuke|uchiha)\b/.test(p)&&/\bsusanoo\b/.test(p)){
    rules.push('Sasuke lock: Sasuke Uchiha must remain recognizably Sasuke with the violet/purple Perfect Susanoo as a complete armored humanoid chakra avatar; never substitute a generic purple robot, demon or unrelated armor.');
  }
  if(/\b(naruto|uzumaki)\b/.test(p)&&/\b(sasuke|uchiha)\b/.test(p)){
    rules.push('Matchup lock: stage Naruto/Kurama and Sasuke/Perfect Susanoo as two opposing, readable combatants in the same battle; preserve orange/gold versus violet/purple separation and show an actual clash or imminent strike.');
  }
  return rules.join(' ');
}

export function buildVisualReferenceQuery(input:string){
  const raw=coreVisualIntent(input);
  const p=normalize(raw);
  if(/\bnaruto\b/.test(p)&&/\bkurama\b/.test(p)&&/\bsasuke\b/.test(p)&&/\bsusanoo\b/.test(p)){
    return 'Naruto Uzumaki Kurama Chakra Mode vs Sasuke Uchiha Perfect Susanoo anime reference';
  }
  if(/\bnaruto\b/.test(p)&&/\bkurama\b/.test(p))return 'Naruto Uzumaki Kurama Chakra Mode Nine Tails canonical anime reference';
  if(/\bsasuke\b/.test(p)&&/\bsusanoo\b/.test(p))return 'Sasuke Uchiha Perfect Susanoo canonical anime reference';
  return compactText(raw+' official character design visual reference',320);
}

function isSafePublicUrl(input:string){
  try{
    const u=new URL(input);
    if(!['http:','https:'].includes(u.protocol))return false;
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h.endsWith('.local')||h==='::1'||h==='0.0.0.0')return false;
    if(/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h))return false;
    const m=h.match(/^172\.(\d+)\./);
    if(m&&Number(m[1])>=16&&Number(m[1])<=31)return false;
    return true;
  }catch{return false}
}

async function googleImageSearch(query:string,limit:number,pinterest=false):Promise<VisualReference[]>{
  const key=String(process.env.GOOGLE_IMAGE_SEARCH_API_KEY||'').trim();
  const cx=String(process.env.GOOGLE_IMAGE_SEARCH_CX||'').trim();
  if(!key||!cx)return [];
  const q=pinterest?query+' site:pinterest.com/pin/':query;
  const params=new URLSearchParams({
    key,cx,q,searchType:'image',safe:'active',num:String(Math.max(1,Math.min(10,limit)))
  });
  const r=await fetch('https://www.googleapis.com/customsearch/v1?'+params.toString(),{
    cache:'no-store',
    signal:AbortSignal.timeout(9000)
  });
  if(!r.ok)throw new Error('Google Images '+r.status);
  const data=await r.json();
  return (Array.isArray(data?.items)?data.items:[])
    .map((item:any)=>{
      const imageUrl=String(item?.link||'').trim();
      const sourceUrl=String(item?.image?.contextLink||item?.link||'').trim();
      if(!isSafePublicUrl(imageUrl)||!isSafePublicUrl(sourceUrl))return null;
      return {
        provider:pinterest?'pinterest-via-google':'google-images',
        title:String(item?.title||query).replace(/\s+/g,' ').trim().slice(0,180),
        imageUrl,
        sourceUrl,
        site:safeHost(sourceUrl)
      } satisfies VisualReference;
    })
    .filter(Boolean) as VisualReference[];
}

async function firecrawlImageSearch(query:string,limit:number,pinterest=false):Promise<VisualReference[]>{
  const key=String(process.env.FIRECRAWL_API_KEY||'').trim();
  if(!key)return [];
  const r=await fetch('https://api.firecrawl.dev/v2/search',{
    method:'POST',
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({query:(pinterest?(query+' site:pinterest.com/pin/'):query).slice(0,480),sources:['images'],limit:Math.max(2,Math.min(10,limit))}),
    cache:'no-store',
    signal:AbortSignal.timeout(12000)
  });
  if(!r.ok)throw new Error('Firecrawl Images '+r.status);
  const data=await r.json();
  const rows=Array.isArray(data?.data?.images)?data.data.images:[];
  return rows.map((item:any)=>{
    const imageUrl=String(typeof item==='string'?item:(item?.imageUrl||item?.url||'')).trim();
    const sourceUrl=String(typeof item==='string'?item:(item?.url||item?.sourceUrl||item?.imageUrl||'')).trim();
    if(!isSafePublicUrl(imageUrl)||!isSafePublicUrl(sourceUrl))return null;
    return {
      provider:pinterest?'pinterest-via-firecrawl':'firecrawl',
      title:String(typeof item==='string'?query:(item?.title||query)).replace(/\s+/g,' ').trim().slice(0,180),
      imageUrl,
      sourceUrl,
      site:safeHost(sourceUrl)
    } satisfies VisualReference;
  }).filter(Boolean) as VisualReference[];
}

export async function resolveVisualReferences(input:string,limit?:number):Promise<VisualReferencePlan>{
  const maxEnv=Number(process.env.PREDICTLM_VISUAL_REFERENCE_MAX||4);
  const max=Math.max(1,Math.min(8,Number(limit)||maxEnv||4));
  const query=buildVisualReferenceQuery(input);
  if(!isSpecificVisualPrompt(input))return {query,references:[],warnings:[]};

  const warnings:string[]=[];
  const hasFirecrawl=!!String(process.env.FIRECRAWL_API_KEY||'').trim();
  const hasGoogle=!!String(process.env.GOOGLE_IMAGE_SEARCH_API_KEY||'').trim()&&!!String(process.env.GOOGLE_IMAGE_SEARCH_CX||'').trim();
  const order=String(process.env.PREDICTLM_VISUAL_REFERENCE_PROVIDER_ORDER||'firecrawl,pinterest-firecrawl,google,pinterest-google')
    .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);

  const tasks:{label:string;run:Promise<VisualReference[]>}[]=[];
  for(const id of order){
    if(id==='firecrawl'&&hasFirecrawl)tasks.push({label:'Firecrawl Images',run:firecrawlImageSearch(query,max,false)});
    if((id==='pinterest-firecrawl'||id==='pinterest-via-firecrawl')&&hasFirecrawl)tasks.push({label:'Pinterest via Firecrawl',run:firecrawlImageSearch(query,Math.min(3,max),true)});
    if((id==='google'||id==='google-images')&&hasGoogle)tasks.push({label:'Google Images',run:googleImageSearch(query,max,false)});
    if((id==='pinterest-google'||id==='pinterest-via-google')&&hasGoogle)tasks.push({label:'Pinterest via Google Images',run:googleImageSearch(query,Math.min(3,max),true)});
  }

  const settled=await Promise.allSettled(tasks.map(x=>x.run));
  const merged:VisualReference[]=[];
  settled.forEach((task,index)=>{
    if(task.status==='fulfilled')merged.push(...task.value);
    else warnings.push(tasks[index].label+' indisponível: '+String((task.reason as any)?.message||task.reason||'erro'));
  });

  if(!hasFirecrawl&&!hasGoogle){
    warnings.push('Nenhuma fonte externa de referência visual está configurada; usando identity lock textual.');
  }

  const seen=new Set<string>();
  const references=merged.filter(ref=>{
    const key=ref.imageUrl;
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,max);
  return {query,references,warnings:Array.from(new Set(warnings))};
}

export function buildReferenceEvidencePrompt(refs:VisualReference[]){
  if(!refs.length)return '';
  const lines=refs.slice(0,6).map((ref,index)=>'REF['+(index+1)+'] '+ref.title+' · '+ref.site+' · '+ref.provider);
  return [
    'REFERENCE GROUNDING: use the supplied visual references only to verify identity, silhouette, costume, color, symbols, proportions and requested form.',
    'Do not copy a reference composition blindly; create a new composition that still matches the user request.',
    ...lines
  ].join('\n');
}

export interface InlineImageData{
  mimeType:string;
  data:string;
}

export function inlineImageFromDataUrl(input:string):InlineImageData|null{
  const m=String(input||'').match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if(!m)return null;
  if(m[2].length>7_000_000)return null;
  return {mimeType:m[1].toLowerCase(),data:m[2]};
}

export async function fetchReferenceInlineData(ref:VisualReference):Promise<InlineImageData|null>{
  if(!isSafePublicUrl(ref.imageUrl))return null;
  try{
    const r=await fetch(ref.imageUrl,{
      headers:{'User-Agent':'Mozilla/5.0 PredictLM-VisualReference/1.0','Accept':'image/avif,image/webp,image/png,image/jpeg'},
      redirect:'follow',
      cache:'no-store',
      signal:AbortSignal.timeout(6500)
    });
    if(!r.ok)return null;
    const mime=String(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
    if(!['image/png','image/jpeg','image/webp'].includes(mime))return null;
    const len=Number(r.headers.get('content-length')||0);
    if(len>4_500_000)return null;
    const bytes=new Uint8Array(await r.arrayBuffer());
    if(bytes.byteLength>4_500_000)return null;
    return {mimeType:mime,data:Buffer.from(bytes).toString('base64')};
  }catch{return null}
}
