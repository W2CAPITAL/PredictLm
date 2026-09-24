import { compactText } from '@/lib/token-budget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,Math.round(value||0)));
}

function providerImageSize(width:number,height:number,nano:boolean){
  if(!nano)return width+'x'+height;
  const ratio=width/Math.max(1,height);
  if(ratio>1.3)return '1792x1024';
  if(ratio<0.77)return '1024x1792';
  return '1024x1024';
}

function localRenderUrl(prompt:string,width:number,height:number,seed:number,model:string){
  const q=new URLSearchParams({
    prompt,
    width:String(width),
    height:String(height),
    seed:String(seed),
    model:model||'flux'
  });
  return '/api/media/render?'+q.toString();
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const rawPrompt=String(body?.prompt||'').trim();
    if(!rawPrompt)return Response.json({error:'Descreva a imagem.'},{status:400});
    const prompt=compactText(rawPrompt,600);

    const width=clamp(Number(body?.width)||1024,256,2048);
    const height=clamp(Number(body?.height)||1024,256,2048);
    const seed=Math.max(1,Math.min(2147483646,Math.floor(Number(body?.seed)||1)));
    const mediaBase=String(process.env.MEDIA_IMAGE_BASE_URL||'').trim();
    const mediaKey=String(process.env.MEDIA_IMAGE_API_KEY||'').trim();
    const nanoKey=String(process.env.NANO_BANANA_API_KEY||'').trim();
    const nanoBase=String(process.env.NANO_BANANA_BASE_URL||'https://nanobanana.aikit.club').trim();
    const requestedModel=String(body?.model||process.env.MEDIA_IMAGE_MODEL||'flux').trim();
    const nanoModel=String(process.env.NANO_BANANA_MODEL||'nano-banana').trim();
    const order=String(process.env.PREDICTLM_IMAGE_PROVIDER_ORDER||'nano,configured')
      .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    const providers=[
      ...(order.includes('nano')&&nanoKey?[{id:'nano-banana',base:nanoBase,key:nanoKey,model:nanoModel,nano:true}]:[]),
      ...(order.includes('configured')&&mediaBase?[{id:'configured-image',base:mediaBase,key:mediaKey,model:requestedModel,nano:false}]:[])
    ];

    for(const provider of providers){
      try{
        const url=provider.base.replace(/\/$/,'')+(provider.base.endsWith('/v1')?'/images/generations':'/v1/images/generations');
        const upstream=await fetch(url,{
          method:'POST',
          headers:{'Content-Type':'application/json',...(provider.key?{'Authorization':'Bearer '+provider.key}:{})},
          body:JSON.stringify({
            model:provider.model,
            prompt,
            size:providerImageSize(width,height,provider.nano),
            n:1,
            quality:'high'
          }),
          signal:AbortSignal.timeout(90000)
        });
        const data=await upstream.json().catch(()=>({}));
        if(!upstream.ok)continue;
        const first=data?.data?.[0]||{};
        const remoteUrl=first.url||data?.url||null;
        const b64=first.b64_json||data?.b64_json||null;
        const dataUrl=b64?'data:image/png;base64,'+b64:null;
        if(remoteUrl||dataUrl){
          return Response.json({url:remoteUrl||dataUrl,provider:provider.id,model:provider.model,width,height,seed});
        }
      }catch{
        // Continue to the next configured provider; public fallback remains available.
      }
    }

    // O navegador nunca recebe a URL externa diretamente. O proxy same-origin
    // evita CORS/canvas tainted e permite que a mesma imagem vire vídeo local.
    return Response.json({
      url:localRenderUrl(prompt,width,height,seed,model),
      provider:'pollinations-proxy',
      model,
      width,
      height,
      seed
    });
  }catch(error:any){
    return Response.json({error:error?.message||'Falha ao gerar imagem.'},{status:500});
  }
}
