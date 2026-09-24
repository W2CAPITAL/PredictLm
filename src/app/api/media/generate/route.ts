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
    const useNano=!mediaBase&&!!nanoKey;
    const base=mediaBase||(useNano?nanoBase:'');
    const key=mediaBase?mediaKey:nanoKey;
    const model=useNano
      ? String(process.env.NANO_BANANA_MODEL||'nano-banana').trim()
      : String(body?.model||process.env.MEDIA_IMAGE_MODEL||'flux').trim();

    if(base){
      try{
        const url=base.replace(/\/$/,'')+(base.endsWith('/v1')?'/images/generations':'/v1/images/generations');
        const upstream=await fetch(url,{
          method:'POST',
          headers:{'Content-Type':'application/json',...(key?{'Authorization':'Bearer '+key}:{})},
          body:JSON.stringify({model,prompt,size:providerImageSize(width,height,useNano),n:1})
        });
        const data=await upstream.json().catch(()=>({}));
        if(upstream.ok){
          const first=data?.data?.[0]||{};
          const remoteUrl=first.url||null;
          const dataUrl=first.b64_json?'data:image/png;base64,'+first.b64_json:null;
          if(remoteUrl||dataUrl){
            return Response.json({url:remoteUrl||dataUrl,provider:useNano?'nano-banana':'configured-image',model,width,height,seed});
          }
        }
      }catch{
        // Provider externo falhou: preserve a geração local/proxy em vez de quebrar o Imagine.
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
