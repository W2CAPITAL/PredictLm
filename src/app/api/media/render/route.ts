import { INVALID_IMAGE_PROVIDER_MESSAGE } from '@/lib/media/media-errors';
import {compactImagePromptForTransport,imageRouteBudget,publicImageBaseCandidates} from '@/lib/media/image-runtime';
import {circuitReadyProviders,recordProviderFailure,recordProviderSuccess} from '@/lib/server/provider-health';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,Math.round(value||0)));
}

function upstreamUrl(
  base:string,prompt:string,width:number,height:number,seed:number,model:string,enhance:boolean,
  references:string[]=[]
){
  const root=base.endsWith('/')?base:base+'/';
  const q=new URLSearchParams({
    width:String(width),
    height:String(height),
    seed:String(seed),
    nologo:'true',
    private:'true',
    safe:'true',
    enhance:enhance?'true':'false',
    model:model||'flux'
  });
  for(const ref of references.slice(0,3))q.append('image',ref);
  return root+encodeURIComponent(prompt)+'?'+q.toString();
}

async function fetchImage(url:string,timeoutMs:number){
  return fetch(url,{
    signal:AbortSignal.timeout(Math.max(1200,timeoutMs)),
    cache:'no-store',
    headers:{
      Accept:'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent':'PredictLM-Media/6.3',
      ...(process.env.POLLINATIONS_API_KEY?{'Authorization':'Bearer '+process.env.POLLINATIONS_API_KEY}:{})
    }
  });
}

function sniffImageType(bytes:Uint8Array,_header=''){
  if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a)return 'image/png';
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(4,12))==='ftypavif')return 'image/avif';
  return '';
}

function safeReference(input:string){
  try{
    const u=new URL(input);
    if(u.protocol!=='https:'&&u.protocol!=='http:')return '';
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h==='0.0.0.0'||h==='::1'||h.endsWith('.local'))return '';
    if(/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h))return '';
    const private172=h.match(/^172\.(\d{1,2})\./);
    if(private172&&Number(private172[1])>=16&&Number(private172[1])<=31)return '';
    return u.toString();
  }catch{return ''}
}

export async function GET(req:Request){
  const startedAt=Date.now();
  const budget=imageRouteBudget(startedAt,Number(process.env.PREDICTLM_RENDER_ROUTE_BUDGET_MS)||48_000);
  const url=new URL(req.url);
  const rawPrompt=String(url.searchParams.get('prompt')||'').trim();
  if(!rawPrompt)return new Response('Prompt vazio.',{status:400});

  // The route is used as an <img src>. Keep its URL and upstream path prompt
  // intentionally compact; the full internal orchestration prompt never belongs here.
  const prompt=compactImagePromptForTransport(
    rawPrompt,
    rawPrompt.slice(0,700),
    Number(process.env.PREDICTLM_RENDER_PROMPT_MAX_CHARS)||2800
  );
  const width=clamp(Number(url.searchParams.get('width'))||1024,256,2048);
  const height=clamp(Number(url.searchParams.get('height'))||1024,256,2048);
  const seed=Math.max(1,Math.min(2147483646,Math.floor(Number(url.searchParams.get('seed'))||1)));
  const model=String(url.searchParams.get('model')||'flux').slice(0,48);
  const enhance=String(url.searchParams.get('enhance')||'false').toLowerCase()==='true';
  const references=url.searchParams.getAll('reference')
    .map(x=>safeReference(String(x||'').trim()))
    .filter(Boolean)
    .slice(0,3);

  const configuredBase=String(process.env.PREDICT_PUBLIC_IMAGE_URL||'').trim();
  const bases=publicImageBaseCandidates(configuredBase);
  const modelPlan=references.length
    ? [
        {model,refs:references},
        {model:'kontext',refs:references},
        {model:'flux',refs:[]},
        {model:'turbo',refs:[]}
      ]
    : [
        {model,refs:[]},
        {model:'flux',refs:[]},
        {model:'turbo',refs:[]}
      ];

  const maxAttempts=Math.max(2,Math.min(5,Number(process.env.PREDICTLM_IMAGE_RENDER_ATTEMPTS)||4));
  const candidates=circuitReadyProviders(
    bases.flatMap(base=>modelPlan.map(entry=>({
      name:'public-image-render',
      base,
      model:entry.model,
      refs:entry.refs
    })))
  ).slice(0,maxAttempts);

  const failures:Array<{model:string;status:number;contentType:string;detail:string}>=[];
  for(let i=0;i<candidates.length;i++){
    if(!budget.canTry(3500))break;
    const candidate=candidates[i];
    try{
      const requestUrl=upstreamUrl(candidate.base,prompt,width,height,seed,candidate.model,enhance,candidate.refs);
      const upstream=await fetchImage(requestUrl,budget.timeout(12_000,3000));
      if(!upstream.ok){
        recordProviderFailure(candidate,new Error('public image '+upstream.status));
        failures.push({
          model:candidate.model,
          status:upstream.status,
          contentType:String(upstream.headers.get('content-type')||''),
          detail:'http-'+upstream.status
        });
      }else{
        const bytes=new Uint8Array(await upstream.arrayBuffer());
        const type=sniffImageType(bytes,String(upstream.headers.get('content-type')||''));
        if(type&&bytes.byteLength>=1024){
          recordProviderSuccess(candidate);
          return new Response(bytes,{
            status:200,
            headers:{
              'Content-Type':type,
              'Content-Length':String(bytes.byteLength),
              'Cache-Control':'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
              'X-Predict-Media':'public-image-proxy',
              'X-Predict-Reference-Count':String(candidate.refs.length),
              'X-Predict-Image-Model':candidate.model,
              'X-Predict-Render-Attempt':String(i+1),
              'X-Predict-Transport-Prompt-Chars':String(prompt.length),
              ...(references.length&&!candidate.refs.length?{'X-Predict-Reference-Degraded':'true'}:{})
            }
          });
        }
        recordProviderFailure(candidate,new Error('public image invalid payload'));
        failures.push({
          model:candidate.model,
          status:upstream.status,
          contentType:String(upstream.headers.get('content-type')||''),
          detail:bytes.byteLength<1024?'payload-too-small':'payload-not-an-image'
        });
      }
    }catch(error:any){
      const timeout=/timeout|abort/i.test(String(error?.name||'')+' '+String(error?.message||''));
      recordProviderFailure(candidate,error);
      failures.push({
        model:candidate.model,
        status:timeout?504:502,
        contentType:'',
        detail:timeout?'timeout':'provider-error'
      });
    }
  }

  return Response.json({
    error:INVALID_IMAGE_PROVIDER_MESSAGE,
    attempts:failures.length,
    retryable:true,
    diagnostics:failures.slice(-4),
    promptChars:prompt.length
  },{status:502,headers:{'Cache-Control':'no-store'}});
}
