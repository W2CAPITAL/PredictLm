export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,Math.round(value||0)));
}

function publicUrl(prompt:string,width:number,height:number,seed:number,model:string){
  const base=process.env.PREDICT_PUBLIC_IMAGE_URL || 'https://image.pollinations.ai/prompt/';
  const root=base.endsWith('/')?base:base+'/';
  return root+encodeURIComponent(prompt)+
    '?width='+width+'&height='+height+'&seed='+seed+'&nologo=true&model='+encodeURIComponent(model||'flux');
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const prompt=String(body?.prompt||'').trim();
    if(!prompt)return Response.json({error:'Descreva a imagem.'},{status:400});

    const width=clamp(Number(body?.width)||1024,256,2048);
    const height=clamp(Number(body?.height)||1024,256,2048);
    const seed=Math.max(1,Math.min(2147483646,Math.floor(Number(body?.seed)||1)));
    const model=String(body?.model||process.env.MEDIA_IMAGE_MODEL||'flux').trim();
    const base=String(process.env.MEDIA_IMAGE_BASE_URL||'').trim();
    const key=String(process.env.MEDIA_IMAGE_API_KEY||'').trim();

    if(base&&key){
      const url=base.replace(/\/$/,'')+(base.endsWith('/v1')?'/images/generations':'/v1/images/generations');
      const upstream=await fetch(url,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model,prompt,size:width+'x'+height,n:1})
      });
      const data=await upstream.json().catch(()=>({}));
      if(!upstream.ok)return Response.json({error:data?.error?.message||data?.error||'Provider de imagem indisponível.'},{status:502});
      const first=data?.data?.[0]||{};
      const remoteUrl=first.url||null;
      const dataUrl=first.b64_json?'data:image/png;base64,'+first.b64_json:null;
      if(!remoteUrl&&!dataUrl)throw new Error('Provider não retornou imagem.');
      return Response.json({url:remoteUrl||dataUrl,provider:'configured',model,width,height,seed});
    }

    return Response.json({
      url:publicUrl(prompt,width,height,seed,model),
      provider:'pollinations',
      model,
      width,
      height,
      seed
    });
  }catch(error:any){
    return Response.json({error:error?.message||'Falha ao gerar imagem.'},{status:500});
  }
}
