export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function clampScale(value:number){
  const n=Math.round(Number(value)||2);
  return Math.max(1,Math.min(4,n));
}

function localOrHttp(source:string){
  return /^(https?:|data:image\/|\/)/i.test(source);
}

async function sourceBlob(source:string,req:Request){
  const target=source.startsWith('/')?new URL(source,req.url).toString():source;
  const r=await fetch(target,{cache:'no-store'});
  if(!r.ok)throw new Error('Não foi possível carregar a imagem para upscale.');
  const type=String(r.headers.get('content-type')||'image/png');
  if(!type.startsWith('image/'))throw new Error('A origem do upscale não é uma imagem válida.');
  return {blob:await r.blob(),type};
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const sourceUrl=String(body?.sourceUrl||'').trim();
    if(!sourceUrl||!localOrHttp(sourceUrl))return Response.json({error:'Imagem de origem inválida.'},{status:400});

    const base=String(process.env.MEDIA_UPSCALE_BASE_URL||'').trim();
    const key=String(process.env.MEDIA_UPSCALE_API_KEY||'').trim();
    const model=String(body?.model||process.env.MEDIA_UPSCALE_MODEL||'realesrgan-x4plus').trim();
    const mode=String(process.env.MEDIA_UPSCALE_MODE||'json').trim().toLowerCase();
    const scale=clampScale(Number(body?.scale)||2);
    const faceEnhance=Boolean(body?.faceEnhance);

    if(!base){
      return Response.json({
        url:sourceUrl,
        upscaled:false,
        provider:'none',
        reason:'MEDIA_UPSCALE_BASE_URL não configurado'
      });
    }

    let upstream:Response;
    const headers:Record<string,string>={};
    if(key)headers.Authorization='Bearer '+key;

    if(mode==='multipart'){
      const source=await sourceBlob(sourceUrl,req);
      const form=new FormData();
      form.append('image',source.blob,'predictlm-input.'+(source.type.includes('jpeg')?'jpg':'png'));
      form.append('scale',String(scale));
      form.append('model',model);
      form.append('face_enhance',faceEnhance?'true':'false');
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),55000);
      try{upstream=await fetch(base,{method:'POST',headers,body:form,signal:controller.signal})}
      finally{clearTimeout(timer)}
    }else{
      headers['Content-Type']='application/json';
      upstream=await fetch(base,{
        method:'POST',
        headers,
        body:JSON.stringify({image:sourceUrl,sourceUrl,scale,model,faceEnhance,face_enhance:faceEnhance}),
        signal:AbortSignal.timeout(55000)
      });
    }

    const type=String(upstream.headers.get('content-type')||'');
    if(upstream.ok&&type.startsWith('image/')){
      const bytes=Buffer.from(await upstream.arrayBuffer()).toString('base64');
      return Response.json({
        url:'data:'+type+';base64,'+bytes,
        upscaled:true,
        provider:'configured-upscaler',
        model,
        scale,
        faceEnhance
      });
    }

    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok)throw new Error(String(data?.error?.message||data?.error||'Upscaler HTTP '+upstream.status));
    const first=data?.data?.[0]||{};
    const url=String(data?.url||data?.image||first?.url||(first?.b64_json?'data:image/png;base64,'+first.b64_json:'')).trim();
    if(!url)throw new Error('Upscaler não retornou imagem.');
    return Response.json({url,upscaled:true,provider:'configured-upscaler',model,scale,faceEnhance});
  }catch(error:any){
    return Response.json({error:String(error?.message||'Falha no upscale.')},{status:502});
  }
}
