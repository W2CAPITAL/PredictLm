import { canonicalMatchupLock, isNarutoKuramaVsSasukeSusanooPrompt, matchupReferenceQueries } from './canonical-matchup';
import { compactText } from '@/lib/token-budget';
import { extractRequestedNamedSubject, isConcreteCreaturePrompt, isLikelyNamedPersonPrompt, shouldForceLiteralMode } from '@/lib/media/media-fidelity';

export type VisualReferenceProvider='firecrawl'|'pinterest-via-firecrawl'|'google-images'|'pinterest-via-google'|'duckduckgo-images';

export interface VisualReference{
  provider:VisualReferenceProvider;
  title:string;
  imageUrl:string;
  sourceUrl:string;
  site:string;
  query:string;
}

export interface VisualReferencePlan{
  query:string;
  queries:string[];
  references:VisualReference[];
  warnings:string[];
  candidatesFound:number;
  searchRounds:number;
}

function normalize(input:string){
  return String(input||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}


function requestsMultiSubjectScene(input:string){
  const p=normalize(coreVisualIntent(input));
  if(/\b(vs\.?|versus|contra|lutando|enfrentando|batalha entre|fight(?:ing)?|battle|with opponent|com adversario|com adversário)\b/.test(p))return true;
  const named=[
    /\bnaruto\b/.test(p),/\bsasuke\b/.test(p),/\b(?:freeza|frieza)\b/.test(p),
    /\bgoku\b/.test(p),/\bvegeta\b/.test(p),/\bbroly\b/.test(p)
  ].filter(Boolean).length;
  return named>1;
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
  if(shouldForceLiteralMode(raw))return true;
  if(/\b(personagem|character|anime|manga|franquia|franchise|jogo|game|filme|movie|serie|series|marca|brand)\b/.test(p)&&/[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}\d_-]{2,}/u.test(raw))return true;
  if(/[“"'‘’][^”"'‘’]{3,}[”"'‘’]/.test(raw))return true;
  return /\b(?:personagem|character)\s+[\p{L}\d_-]{3,}/iu.test(raw);
}

export function buildVisualIdentityLock(input:string){
  const p=normalize(coreVisualIntent(input));
  const rules=[
    canonicalMatchupLock(input),
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
  if(/\b(freeza|frieza)\b/.test(p)){
    rules.push('Frieza lock: preserve the canonical Dragon Ball Frieza identity — smooth white bio-armor/body with purple plates and dome, sleek alien silhouette, recognizable face and proportions. Never substitute a red/black armored demon, dragon, generic monster or Saiyan.');
    if(!requestsMultiSubjectScene(input))rules.push('SINGLE SUBJECT LOCK: Frieza is the only primary character. Show exactly one Frieza as the focal subject. Do not add Goku, Vegeta, another Saiyan, a battle opponent, a second alien or a duplicate Frieza. A dramatic pose is allowed, but this is not a versus scene unless the user explicitly asked for one.');
  }
  if(/\b(oozaru|great ape|macaco de dragon ball|macaco do dragon ball)\b/.test(p)){
    rules.push('Dragon Ball Great Ape lock: depict the canonical Saiyan Oozaru/Great Ape — gigantic brown ape-like Saiyan transformation with tail and ferocious face. Never substitute an armored demon, robot ape, ordinary small monkey or unrelated kaiju.');
  }
  if(/\b(bijuu|besta de caudas|quatro caudas|four tails)\b/.test(p)&&/\b(naruto|anime naruto)\b/.test(p)){
    rules.push('Naruto Four-Tails Bijuu lock: depict Son Goku, the canonical Four-Tails tailed beast from Naruto — huge red/orange ape-like bijuu with exactly four tails and recognizable Naruto franchise design. Do not depict human Goku from Dragon Ball or another tailed beast.');
  }
  if(isLikelyNamedPersonPrompt(input)){
    const subject=extractRequestedNamedSubject(coreVisualIntent(input))||'the named person';
    rules.push('Named-person lock: the requested subject is '+subject+'. Preserve a normal human face, recognizable facial identity, natural human anatomy, hair/skin/age cues and requested clothing. Do not turn the person into a robot, cyborg, alien, armored humanoid, masked character or fantasy creature unless the user explicitly asks for that transformation.');
  }
  if(isConcreteCreaturePrompt(input)&&/\b(dragao|dragon)\b/.test(p)){
    const white=/\b(branco|white)\b/.test(p);
    const blueEyes=/\b(olhos azuis|blue eyes)\b/.test(p);
    rules.push('Dragon anatomy lock: depict an unmistakably mythological full-sized dragon, not a real-world lizard or gecko. It must have a clearly draconic head, powerful neck and torso, large fantasy-dragon proportions and visible dragon anatomy; wings should be large and functional-looking when shown. Never substitute an ordinary reptile, iguana, gecko, snake, dinosaur or bat.');
    if(white)rules.push('Color lock: the dragon scales/body must read clearly as white, ivory or pearlescent white across most of the creature.');
    if(blueEyes)rules.push('Eye lock: both visible eyes must be distinctly blue; do not change them to green, yellow, red or black.');
  }
  return rules.filter(Boolean).join(' ');
}

export function buildVisualReferenceQueries(input:string){
  const raw=coreVisualIntent(input);
  const p=normalize(raw);
  const queries:string[]=[];
  if(isNarutoKuramaVsSasukeSusanooPrompt(input)){
    queries.push(
      'Naruto Uzumaki Kurama chakra mode official anime reference full body',
      'Naruto Uzumaki Kurama link mode anime screenshot canonical',
      'Kurama Nine Tails Naruto canonical full body official anime reference',
      'Sasuke Uchiha Perfect Susanoo official anime reference full body',
      'Sasuke Perfect Susanoo anime screenshot canonical purple armored avatar',
      'Naruto Kurama vs Sasuke Susanoo final battle anime reference'
    );
    if(/\b(vale do fim|valley of the end|hashirama|madara|estatuas)\b/.test(p)){
      queries.push('Naruto Sasuke Valley of the End final battle anime reference');
    }
  }else if(/\b(freeza|frieza)\b/.test(p)){
    queries.push(
      'Frieza final form official Dragon Ball character reference white purple full body',
      'Frieza final form Dragon Ball Super anime screenshot canonical',
      'Frieza official character art solo white purple'
    );
  }else if(/\bnaruto\b/.test(p)&&/\b(kurama|kyuubi|kyubi|nove caudas|nine tails)\b/.test(p)){
    queries.push(
      'Naruto Uzumaki Kurama chakra mode official anime reference',
      'Naruto Kurama link mode anime screenshot canonical',
      'Kurama Nine Tails official anime full body reference'
    );
  }else if(/\bsasuke\b/.test(p)&&/\bsusanoo\b/.test(p)){
    queries.push(
      'Sasuke Uchiha Perfect Susanoo official anime reference',
      'Sasuke Perfect Susanoo anime screenshot full body purple avatar',
      'Sasuke Uchiha official anime character reference'
    );
  }else if(/\b(oozaru|great ape|macaco de dragon ball|macaco do dragon ball)\b/.test(p)){
    queries.push('Dragon Ball Oozaru Great Ape official anime reference','Saiyan Great Ape full body anime screenshot');
  }else if(/\b(bijuu|besta de caudas|quatro caudas|four tails)\b/.test(p)&&/\bnaruto\b/.test(p)){
    queries.push('Naruto Four Tails Son Goku Bijuu official anime reference','Son Goku Four Tails Naruto full body reference');
  }else{
    const base=buildVisualReferenceQuery(input);
    queries.push(base);
    if(isLikelyNamedPersonPrompt(raw)){
      const subject=extractRequestedNamedSubject(raw)||raw;
      queries.push(subject+' official portrait reference',subject+' canonical appearance reference');
    }else if(isSpecificVisualPrompt(raw)){
      queries.push(compactText(raw+' official art canonical appearance',320),compactText(raw+' anime screenshot reference',320));
    }
  }
  return [...new Set(queries.map(x=>compactText(x,320)).filter(Boolean))].slice(0,8);
}

export function buildVisualReferenceQuery(input:string){
  const raw=coreVisualIntent(input);
  const p=normalize(raw);
  if(/\bnaruto\b/.test(p)&&/\bkurama\b/.test(p)&&/\bsasuke\b/.test(p)&&/\bsusanoo\b/.test(p)){
    return 'Naruto Uzumaki Kurama Chakra Mode vs Sasuke Uchiha Perfect Susanoo anime reference';
  }
  if(/\bnaruto\b/.test(p)&&/\bkurama\b/.test(p))return 'Naruto Uzumaki Kurama Chakra Mode Nine Tails canonical anime reference single subject official design';
  if(/\bsasuke\b/.test(p)&&/\bsusanoo\b/.test(p))return 'Sasuke Uchiha Perfect Susanoo canonical anime reference';
  if(/\b(freeza|frieza)\b/.test(p))return 'Frieza Dragon Ball canonical anime character design reference white purple final form solo character no Goku';
  if(/\b(oozaru|great ape|macaco de dragon ball|macaco do dragon ball)\b/.test(p))return 'Dragon Ball Oozaru Great Ape Saiyan canonical anime reference';
  if(/\b(bijuu|besta de caudas|quatro caudas|four tails)\b/.test(p)&&/\b(naruto|anime naruto)\b/.test(p))return 'Naruto Four Tails Son Goku Bijuu canonical tailed beast anime reference';
  if(isLikelyNamedPersonPrompt(raw)){
    const subject=extractRequestedNamedSubject(raw)||raw;
    return compactText(subject+' recent portrait face appearance photographic reference',320);
  }
  if(isConcreteCreaturePrompt(raw)&&/\b(dragao|dragon)\b/.test(p)){
    const parts=['large mythological fantasy dragon anatomy reference'];
    if(/\b(branco|white)\b/.test(p))parts.unshift('white dragon');
    if(/\b(olhos azuis|blue eyes)\b/.test(p))parts.push('blue eyes');
    parts.push('full dragon body wings scales draconic head not lizard');
    return compactText(parts.join(' '),320);
  }
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


async function duckDuckGoImageSearch(query:string,limit:number):Promise<VisualReference[]>{
  const searchUrl='https://duckduckgo.com/?q='+encodeURIComponent(query);
  const htmlResponse=await fetch(searchUrl,{
    cache:'no-store',
    headers:{
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'Accept-Language':'en-US,en;q=0.9'
    },
    signal:AbortSignal.timeout(9000)
  });
  if(!htmlResponse.ok)throw new Error('DuckDuckGo Images bootstrap '+htmlResponse.status);
  const html=await htmlResponse.text();
  const vqd=
    html.match(/vqd["']?\s*[:=]\s*["']([^"']+)["']/i)?.[1]||
    html.match(/vqd\s*=\s*([\d-]+)/i)?.[1]||
    '';
  if(!vqd)throw new Error('DuckDuckGo Images token indisponível');

  const params=new URLSearchParams({
    l:'us-en',o:'json',q:query,vqd,f:',,,',p:'1',s:'0'
  });
  const response=await fetch('https://duckduckgo.com/i.js?'+params.toString(),{
    cache:'no-store',
    headers:{
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'Referer':searchUrl,
      'Accept':'application/json'
    },
    signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw new Error('DuckDuckGo Images '+response.status);
  const data=await response.json().catch(()=>({}));
  return (Array.isArray(data?.results)?data.results:[])
    .map((item:any)=>{
      const imageUrl=String(item?.image||'').trim();
      const sourceUrl=String(item?.url||item?.source||'').trim();
      if(!isSafePublicUrl(imageUrl)||!isSafePublicUrl(sourceUrl))return null;
      return {
        provider:'duckduckgo-images',
        title:String(item?.title||query).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,180),
        imageUrl,
        sourceUrl,
        site:safeHost(sourceUrl),
        query
      } satisfies VisualReference;
    })
    .filter(Boolean)
    .slice(0,Math.max(1,Math.min(12,limit))) as VisualReference[];
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
        site:safeHost(sourceUrl),
        query
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
      site:safeHost(sourceUrl),
      query
    } satisfies VisualReference;
  }).filter(Boolean) as VisualReference[];
}

export async function resolveVisualReferences(input:string,limit?:number):Promise<VisualReferencePlan>{
  const maxEnv=Number(process.env.PREDICTLM_VISUAL_REFERENCE_MAX||6);
  const max=Math.max(1,Math.min(8,Number(limit)||maxEnv||6));
  const matchup=matchupReferenceQueries(input);
  const queries=[...new Set([...matchup,...buildVisualReferenceQueries(input)])].slice(0,8);
  const query=queries.join(' | ');
  if(!isSpecificVisualPrompt(input))return {query,queries,references:[],warnings:[],candidatesFound:0,searchRounds:0};

  const warnings:string[]=[];
  const hasFirecrawl=!!String(process.env.FIRECRAWL_API_KEY||'').trim();
  const hasGoogle=!!String(process.env.GOOGLE_IMAGE_SEARCH_API_KEY||'').trim()&&!!String(process.env.GOOGLE_IMAGE_SEARCH_CX||'').trim();
  const order=String(process.env.PREDICTLM_VISUAL_REFERENCE_PROVIDER_ORDER||'google,firecrawl,pinterest-firecrawl,duckduckgo,pinterest-google')
    .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);

  const tasks:{label:string;query:string;run:Promise<VisualReference[]>}[]=[];
  for(const searchQuery of queries){
  for(const id of order){
    if(id==='firecrawl'&&hasFirecrawl)tasks.push({label:'Firecrawl Images',query:searchQuery,run:firecrawlImageSearch(searchQuery,max,false)});
    if((id==='pinterest-firecrawl'||id==='pinterest-via-firecrawl')&&hasFirecrawl)tasks.push({label:'Pinterest via Firecrawl',query:searchQuery,run:firecrawlImageSearch(searchQuery,Math.min(3,max),true)});
    if((id==='google'||id==='google-images')&&hasGoogle)tasks.push({label:'Google Images',query:searchQuery,run:googleImageSearch(searchQuery,max,false)});
    if((id==='pinterest-google'||id==='pinterest-via-google')&&hasGoogle)tasks.push({label:'Pinterest via Google Images',query:searchQuery,run:googleImageSearch(searchQuery,Math.min(3,max),true)});
    if(id==='duckduckgo'||id==='duckduckgo-images')tasks.push({label:'DuckDuckGo Images',query:searchQuery,run:duckDuckGoImageSearch(searchQuery,max)});
  }

  }
  const settled=await Promise.allSettled(tasks.map(x=>x.run));
  const merged:VisualReference[]=[];
  settled.forEach((task,index)=>{
    if(task.status==='fulfilled')merged.push(...task.value);
    else warnings.push(tasks[index].label+' · '+tasks[index].query+' indisponível: '+String((task.reason as any)?.message||task.reason||'erro'));
  });

  if(!hasGoogle){
    warnings.push('Google Images API não configurada; a busca visual automática continua por Firecrawl/DuckDuckGo quando disponíveis.');
  }

  const seen=new Set<string>();
  const canonicalTerms=normalize(buildVisualReferenceQuery(input)).split(/\s+/).filter(x=>x.length>3);
  const trustedHosts=/fandom\.com$|wikipedia\.org$|wikimedia\.org$|crunchyroll\.com$|viz\.com$|toei-anim\.co\.jp$|dragon-ball-official\.com$|naruto-official\.com$/i;
  const ranked=merged.filter(ref=>{
    const key=ref.imageUrl;
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>{
    const score=(ref:VisualReference)=>{
      const hay=normalize(ref.title+' '+ref.site+' '+ref.query);
      const lexical=canonicalTerms.reduce((sum,term)=>sum+(hay.includes(term)?1:0),0);
      return lexical+(trustedHosts.test(ref.site)?3:0)+(ref.provider==='google-images'?1.5:0);
    };
    return score(b)-score(a);
  });
  const references:VisualReference[]=[];
  for(const searchQuery of queries){
    const candidate=ranked.find(ref=>ref.query===searchQuery&&!references.some(x=>x.imageUrl===ref.imageUrl));
    if(candidate)references.push(candidate);
    if(references.length>=max)break;
  }
  for(const candidate of ranked){
    if(references.length>=max)break;
    if(!references.some(x=>x.imageUrl===candidate.imageUrl))references.push(candidate);
  }
  if(!references.length)warnings.push('A busca automática não retornou uma imagem pública utilizável desta vez.');
  return {
    query,queries,references,
    warnings:Array.from(new Set(warnings)),
    candidatesFound:ranked.length,
    searchRounds:queries.length>1?2:1
  };
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
