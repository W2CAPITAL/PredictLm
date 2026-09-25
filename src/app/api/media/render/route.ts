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

  try{
    const referenceModels=references.length
      ? [model,'kontext','nanobanana-2-lite','p-image-edit'].filter((x,i,a)=>x&&a.indexOf(x)===i)
      : [model,'turbo'].filter((x,i,a)=>x&&a.indexOf(x)===i);
    let upstream:Response|null=null;
    let usedModel=model;
    for(let i=0;i<referenceModels.length;i++){
      usedModel=referenceModels[i];
      upstream=await fetchImage(upstreamUrl(prompt,width,height,seed,usedModel,enhance,references));
      if(upstream.ok)break;
      if(i<referenceModels.length-1)await new Promise(r=>setTimeout(r,650));
    }

    if(!upstream||!upstream.ok){
      const status=upstream?.status||502;
      const detail=upstream
        ? (await upstream.text().catch(()=>'')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,220)
        : 'Nenhum modelo de imagem respondeu.';
      return Response.json({error:'Provider de imagem respondeu '+status,detail},{status:502});
    }

    const type=String(upstream.headers.get('content-type')||'');
    if(!type.startsWith('image/')){
      return Response.json({error:'Provider não retornou uma imagem válida.',contentType:type},{status:502});
    }

    const body=await upstream.arrayBuffer();
    if(body.byteLength<1024)return Response.json({error:'Imagem recebida vazia ou incompleta.'},{status:502});

    return new Response(body,{
      status:200,
      headers:{
        'Content-Type':type,
        'Content-Length':String(body.byteLength),
        'Cache-Control':'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
        'X-Predict-Media':'pollinations-proxy',
        'X-Predict-Reference-Count':String(references.length),
        'X-Predict-Image-Model':usedModel
      }
    });
  }catch(error:any){
    const timeout=error?.name==='AbortError';
    return Response.json({error:timeout?'A geração de imagem excedeu 55 segundos.':String(error?.message||'Falha no provider de imagem.')},{status:504});
  }
}
