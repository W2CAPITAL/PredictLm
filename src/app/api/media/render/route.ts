import { INVALID_IMAGE_PROVIDER_MESSAGE } from '@/lib/media/media-errors';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,Math.round(value||0)));
}

function upstreamUrl(
  prompt:string,width:number,height:number,seed:number,model:string,enhance:boolean,
  references:string[]=[]
){
  const key=String(process.env.POLLINATIONS_API_KEY||'').trim();
  const configured=String(process.env.PREDICT_PUBLIC_IMAGE_URL||'').trim();
  const base=configured||(key?'https://gen.pollinations.ai/image/':'https://image.pollinations.ai/prompt/');
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

async function fetchImage(url:string){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),55000);
  try{
    return await fetch(url,{
      signal:controller.signal,
      cache:'no-store',
      headers:{
        Accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent':'PredictLM-Media/6.2',
        ...(process.env.POLLINATIONS_API_KEY?{'Authorization':'Bearer '+process.env.POLLINATIONS_API_KEY}:{})
      }
    });
  }finally{clearTimeout(timer)}
}

function sniffImageType(bytes:Uint8Array,header=''){
  const type=String(header||'').split(';')[0].trim().toLowerCase();
  if(type==='image/png'||type==='image/jpeg'||type==='image/webp'||type==='image/avif')return type;
  if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return 'image/png';
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(4,12)).includes('ftypavif'))return 'image/avif';
  return '';
}

export async function GET(req:Request){
  const url=new URL(req.url);
  const prompt=String(url.searchParams.get('prompt')||'').trim();
  if(!prompt)return new Response('Prompt vazio.',{status:400});

  const width=clamp(Number(url.searchParams.get('width'))||1024,256,2048);
  const height=clamp(Number(url.searchParams.get('height'))||1024,256,2048);
  const seed=Math.max(1,Math.min(2147483646,Math.floor(Number(url.searchParams.get('seed'))||1)));
  const model=String(url.searchParams.get('model')||'flux').slice(0,40);
  const enhance=String(url.searchParams.get('enhance')||'false').toLowerCase()==='true';
  const references=url.searchParams.getAll('reference')
    .map(x=>String(x||'').trim())
    .filter(x=>{
      try{
        const u=new URL(x);
        return u.protocol==='https:'||u.protocol==='http:';
      }catch{return false}
    })
    .slice(0,3);

  const referenceModels=references.length
    ? [model,'kontext','nanobanana-2-lite','p-image-edit','flux'].filter((x,i,a)=>x&&a.indexOf(x)===i)
    : [model,'flux','turbo'].filter((x,i,a)=>x&&a.indexOf(x)===i);

  const failures:Array<{model:string;status:number;contentType:string;detail:string}>=[];
  for(let i=0;i<referenceModels.length;i++){
    const usedModel=referenceModels[i];
    try{
      const upstream=await fetchImage(upstreamUrl(prompt,width,height,seed,usedModel,enhance,references));
      if(!upstream.ok){
        failures.push({
          model:usedModel,
          status:upstream.status,
          contentType:String(upstream.headers.get('content-type')||''),
          detail:(await upstream.text().catch(()=>'')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,180)
        });
      }else{
        const bytes=new Uint8Array(await upstream.arrayBuffer());
        const type=sniffImageType(bytes,String(upstream.headers.get('content-type')||''));
        if(type&&bytes.byteLength>=1024){
          return new Response(bytes,{
            status:200,
            headers:{
              'Content-Type':type,
              'Content-Length':String(bytes.byteLength),
              'Cache-Control':'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
              'X-Predict-Media':'pollinations-proxy',
              'X-Predict-Reference-Count':String(references.length),
              'X-Predict-Image-Model':usedModel,
              'X-Predict-Render-Attempt':String(i+1)
            }
          });
        }
        failures.push({
          model:usedModel,
          status:upstream.status,
          contentType:String(upstream.headers.get('content-type')||''),
          detail:bytes.byteLength<1024?'payload-too-small':'payload-not-an-image'
        });
      }
    }catch(error:any){
      failures.push({
        model:usedModel,
        status:error?.name==='AbortError'?504:502,
        contentType:'',
        detail:error?.name==='AbortError'?'timeout':String(error?.message||'provider-error').slice(0,180)
      });
    }
    if(i<referenceModels.length-1)await new Promise(r=>setTimeout(r,450));
  }

  return Response.json({
    error:INVALID_IMAGE_PROVIDER_MESSAGE,
    attempts:failures.length,
    diagnostics:failures.slice(-4)
  },{status:502});
}
