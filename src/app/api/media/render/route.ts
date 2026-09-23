export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,Math.round(value||0)));
}

function upstreamUrl(prompt:string,width:number,height:number,seed:number,model:string){
  const base=String(process.env.PREDICT_PUBLIC_IMAGE_URL||'https://image.pollinations.ai/prompt/').trim();
  const root=base.endsWith('/')?base:base+'/';
  const q=new URLSearchParams({
    width:String(width),
    height:String(height),
    seed:String(seed),
    nologo:'true',
    private:'true',
    safe:'true',
    model:model||'flux'
  });
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
        'User-Agent':'PredictLM-Media/6.1'
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

  try{
    const target=upstreamUrl(prompt,width,height,seed,model);
    let upstream=await fetchImage(target);

    // Uma segunda tentativa curta com turbo cobre indisponibilidade específica
    // do modelo sem devolver HTML quebrado como se fosse uma imagem.
    if(!upstream.ok&&model!=='turbo'){
      await new Promise(r=>setTimeout(r,900));
      upstream=await fetchImage(upstreamUrl(prompt,width,height,seed,'turbo'));
    }

    if(!upstream.ok){
      const detail=(await upstream.text().catch(()=>'')).
        replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,220);
      return Response.json({error:'Provider de imagem respondeu '+upstream.status,detail},{status:502});
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
        'X-Predict-Media':'pollinations-proxy'
      }
    });
  }catch(error:any){
    const timeout=error?.name==='AbortError';
    return Response.json({error:timeout?'A geração de imagem excedeu 55 segundos.':String(error?.message||'Falha no provider de imagem.')},{status:504});
  }
}
