import { compactText } from '@/lib/token-budget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,Math.round(value||0)));
}

function geminiAspectRatio(width:number,height:number){
  const ratio=width/Math.max(1,height);
  if(ratio>1.45)return '16:9';
  if(ratio<0.72)return '9:16';
  if(ratio>1.18)return '4:3';
  if(ratio<0.86)return '3:4';
  return '1:1';
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

function allowedReferenceHost(host:string){
  const h=host.toLowerCase();
  return h==='encrypted-tbn0.gstatic.com'||h.endsWith('.gstatic.com')||h.endsWith('.googleusercontent.com')||h==='i.pinimg.com'||h.endsWith('.pinimg.com');
}

async function fetchReferenceInline(value:string){
  try{
    const url=new URL(value);
    if(url.protocol!=='https:'||!allowedReferenceHost(url.hostname))return null;
    const response=await fetch(url,{signal:AbortSignal.timeout(6500),cache:'no-store'});
    if(!response.ok)return null;
    const mime=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!/^image\/(?:png|jpe?g|webp)$/.test(mime))return null;
    const declared=Number(response.headers.get('content-length')||0);
    if(declared>2_000_000)return null;
    const bytes=Buffer.from(await response.arrayBuffer());
    if(!bytes.length||bytes.length>2_000_000)return null;
    return {inlineData:{mimeType:mime,data:bytes.toString('base64')}};
  }catch{return null}
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const rawPrompt=String(body?.prompt||'').trim();
    if(!rawPrompt)return Response.json({error:'Descreva a imagem.'},{status:400});
    const prompt=compactText(rawPrompt,1800);
    const referenceImages=(Array.isArray(body?.referenceImages)?body.referenceImages:[]).map(String).slice(0,4);

    const width=clamp(Number(body?.width)||1024,256,2048);
    const height=clamp(Number(body?.height)||1024,256,2048);
    const seed=Math.max(1,Math.min(2147483646,Math.floor(Number(body?.seed)||1)));
    const mediaBase=String(process.env.MEDIA_IMAGE_BASE_URL||'').trim();
    const mediaKey=String(process.env.MEDIA_IMAGE_API_KEY||'').trim();
    const geminiKey=String(process.env.GEMINI_API_KEY||'').trim();
    const geminiBase=String(process.env.GEMINI_IMAGE_BASE_URL||'https://generativelanguage.googleapis.com/v1').trim().replace(/\/$/,'');
    const geminiModel=String(process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image').trim();
    const nanoKey=String(process.env.NANO_BANANA_API_KEY||'').trim();
    const nanoBase=String(process.env.NANO_BANANA_BASE_URL||'https://nanobanana.aikit.club').trim();
    const requestedModel=String(body?.model||process.env.MEDIA_IMAGE_MODEL||'flux').trim();
    const nanoModel=String(process.env.NANO_BANANA_MODEL||'nano-banana').trim();
    const order=String(process.env.PREDICTLM_IMAGE_PROVIDER_ORDER||'gemini,nano,configured')
      .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(geminiKey&&!order.includes('gemini'))order.unshift('gemini');
    const providers=[
      ...(order.includes('gemini')&&geminiKey?[{id:'gemini-nano-banana-2',base:geminiBase,key:geminiKey,model:geminiModel,nano:false,gemini:true}]:[]),
      ...(order.includes('nano')&&nanoKey?[{id:'nano-banana',base:nanoBase,key:nanoKey,model:nanoModel,nano:true,gemini:false}]:[]),
      ...(order.includes('configured')&&mediaBase?[{id:'configured-image',base:mediaBase,key:mediaKey,model:requestedModel,nano:false,gemini:false}]:[])
    ];

    for(const provider of providers){
      try{
        const url=provider.gemini
          ? provider.base+'/models/'+encodeURIComponent(provider.model)+':generateContent'
          : provider.base.replace(/\/$/,'')+(provider.base.endsWith('/v1')?'/images/generations':'/v1/images/generations');
        const referenceParts=provider.gemini
          ? (await Promise.all(referenceImages.map(fetchReferenceInline))).filter(Boolean)
          : [];
        const upstream=await fetch(url,{
          method:'POST',
          headers:provider.gemini
            ? {'Content-Type':'application/json','x-goog-api-key':provider.key}
            : {'Content-Type':'application/json',...(provider.key?{'Authorization':'Bearer '+provider.key}:{})},
          body:JSON.stringify(provider.gemini?{
            contents:[{parts:[...referenceParts,{text:prompt}]}],
            generationConfig:{responseFormat:{image:{aspectRatio:geminiAspectRatio(width,height),imageSize:'2K'}}}
          }:{
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
        const parts=Array.isArray(data?.candidates?.[0]?.content?.parts)?data.candidates[0].content.parts:[];
        const inline=parts.find((x:any)=>x?.inlineData?.data||x?.inline_data?.data);
        const remoteUrl=first.url||data?.url||null;
        const b64=inline?.inlineData?.data||inline?.inline_data?.data||first.b64_json||data?.b64_json||null;
        const mime=inline?.inlineData?.mimeType||inline?.inline_data?.mime_type||'image/png';
        const dataUrl=b64?'data:'+mime+';base64,'+b64:null;
        if(remoteUrl||dataUrl){
          return Response.json({url:remoteUrl||dataUrl,provider:provider.id,model:provider.model,width,height,seed,referenceCount:referenceParts.length});
        }
      }catch{
        // Continue to the next configured provider; public fallback remains available.
      }
    }

    // O navegador nunca recebe a URL externa diretamente. O proxy same-origin
    // evita CORS/canvas tainted e permite que a mesma imagem vire vídeo local.
    return Response.json({
      url:localRenderUrl(prompt,width,height,seed,requestedModel),
      provider:'pollinations-proxy',
      model:requestedModel,
      width,
      height,
      seed
    });
  }catch(error:any){
    return Response.json({error:error?.message||'Falha ao gerar imagem.'},{status:500});
  }
}
