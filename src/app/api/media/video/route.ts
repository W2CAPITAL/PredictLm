import { NextResponse } from 'next/server';
import { mediaErrorText } from '@/lib/media/media-errors';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='gru1';
export const maxDuration=60;

type RemoteProvider='gemini'|'veo'|'sora'|'seedance'|'comfyui';
type Provider='auto'|RemoteProvider;

type InlineImage={mimeType:string;data:string};

function loopbackBase(base:string){
  try{
    const host=new URL(base).hostname.toLowerCase();
    return host==='127.0.0.1'||host==='localhost'||host==='0.0.0.0'||host==='::1';
  }catch{return false}
}

function serverCanReach(base:string){
  return !(process.env.VERCEL&&loopbackBase(base));
}

function config(){
  const mountseaKey=String(process.env.MOUNTSEA_API_KEY||process.env.MEDIA_VIDEO_API_KEY||'').trim();
  const seedanceKey=String(process.env.SEEDANCE_API_KEY||process.env.MEDIA_VIDEO_API_KEY||'').trim();
  const geminiKey=String(process.env.GEMINI_API_KEY||'').trim();
  const comfyBase=String(process.env.COMFYUI_VIDEO_BASE_URL||'').trim().replace(/\/$/,'');
  const comfyWorkflow=String(process.env.COMFYUI_VIDEO_WORKFLOW_JSON||'').trim();
  return {
    gemini:{
      enabled:!!geminiKey,
      key:geminiKey,
      base:String(process.env.GEMINI_VIDEO_BASE_URL||'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/,''),
      model:String(process.env.GEMINI_VIDEO_MODEL||'veo-3.1-generate-preview').trim()
    },
    veo:{enabled:!!mountseaKey,key:mountseaKey,base:String(process.env.MOUNTSEA_BASE_URL||'https://api.mountsea.ai').replace(/\/$/,'')},
    sora:{enabled:!!mountseaKey,key:mountseaKey,base:String(process.env.MOUNTSEA_BASE_URL||'https://api.mountsea.ai').replace(/\/$/,'')},
    seedance:{enabled:!!seedanceKey,key:seedanceKey,base:String(process.env.SEEDANCE_BASE_URL||'https://seegen.ai/api/v1').replace(/\/$/,'')},
    comfyui:{
      enabled:!!comfyBase&&!!comfyWorkflow&&serverCanReach(comfyBase),
      key:'',
      base:comfyBase,
      workflow:comfyWorkflow
    }
  };
}

function normalizedStatus(raw:any){
  const s=String(raw||'').toLowerCase();
  if(/complete|success|succeed|done/.test(s))return 'completed';
  if(/fail|error|cancel/.test(s))return 'failed';
  if(/process|running|generat/.test(s))return 'processing';
  return 'queued';
}

function clampDuration(value:any,min=3,max=15){
  return Math.max(min,Math.min(max,Math.round(Number(value)||5)));
}

function geminiDuration(value:any,hasReferences=false,resolution='720p'){
  const n=Math.round(Number(value)||6);
  if(hasReferences||resolution==='1080p'||resolution==='4k')return 8;
  return [4,6,8].sort((a,b)=>Math.abs(a-n)-Math.abs(b-n))[0];
}

function geminiAspect(value:any){
  return String(value||'16:9')==='9:16'?'9:16':'16:9';
}

function safeResolution(value:any){
  const v=String(value||'720p').toLowerCase();
  return v==='1080p'||v==='4k'?v:'720p';
}

function safeProvider(value:any):Provider|null{
  const p=String(value||'').toLowerCase();
  return p==='auto'||p==='gemini'||p==='veo'||p==='sora'||p==='seedance'||p==='comfyui'?p:null;
}

function remoteOrder(cfg:ReturnType<typeof config>):RemoteProvider[]{
  const requested=String(process.env.PREDICTLM_VIDEO_PROVIDER_ORDER||'gemini,comfyui,veo,seedance,sora')
    .split(',').map(x=>x.trim().toLowerCase())
    .filter((x):x is RemoteProvider=>x==='gemini'||x==='veo'||x==='sora'||x==='seedance'||x==='comfyui');
  const unique:Array<RemoteProvider>=[];
  for(const id of requested)if(!unique.includes(id))unique.push(id);
  for(const id of ['gemini','comfyui','veo','seedance','sora'] as RemoteProvider[])if(!unique.includes(id))unique.push(id);
  return unique.filter(id=>cfg[id].enabled);
}

function dataUrlImage(input:string):InlineImage|null{
  const m=String(input||'').match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if(!m||m[2].length>10_000_000)return null;
  return {mimeType:m[1].toLowerCase(),data:m[2]};
}

function privateHost(host:string){
  const h=host.toLowerCase();
  if(h==='localhost'||h==='0.0.0.0'||h==='::1'||h.endsWith('.local'))return true;
  if(/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h))return true;
  const m=h.match(/^172\.(\d+)\./);
  return !!(m&&Number(m[1])>=16&&Number(m[1])<=31);
}

async function imageToInline(input:string,requestUrl:string):Promise<InlineImage|null>{
  const embedded=dataUrlImage(input);
  if(embedded)return embedded;
  try{
    const resolved=new URL(input,requestUrl);
    const own=new URL(requestUrl);
    if(!['http:','https:'].includes(resolved.protocol))return null;
    if(resolved.origin!==own.origin&&privateHost(resolved.hostname))return null;
    const r=await fetch(resolved,{cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(12000)});
    if(!r.ok)return null;
    const mime=String(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
    if(!['image/png','image/jpeg','image/webp'].includes(mime))return null;
    const len=Number(r.headers.get('content-length')||0);
    if(len>7_000_000)return null;
    const bytes=new Uint8Array(await r.arrayBuffer());
    if(bytes.byteLength>7_000_000)return null;
    return {mimeType:mime,data:Buffer.from(bytes).toString('base64')};
  }catch{return null}
}

function workflowReplace(value:any,tokens:Record<string,string|number>):any{
  if(Array.isArray(value))return value.map(x=>workflowReplace(x,tokens));
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,workflowReplace(v,tokens)]));
  }
  if(typeof value!=='string')return value;
  for(const [token,replacement] of Object.entries(tokens)){
    if(value===token)return replacement;
  }
  let out=value;
  for(const [token,replacement] of Object.entries(tokens))out=out.split(token).join(String(replacement));
  return out;
}

async function uploadComfyImage(base:string,image:InlineImage|null){
  if(!image)return '';
  try{
    const bytes=Buffer.from(image.data,'base64');
    const ext=image.mimeType==='image/jpeg'?'jpg':image.mimeType.split('/')[1]||'png';
    const form=new FormData();
    form.append('image',new Blob([bytes],{type:image.mimeType}),'predictlm-input.'+ext);
    form.append('overwrite','true');
    const r=await fetch(base+'/upload/image',{method:'POST',body:form,signal:AbortSignal.timeout(20000)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return '';
    return String(data?.name||data?.filename||'');
  }catch{return ''}
}

function comfyOutput(data:any,taskId:string){
  const root=data?.[taskId]||data?.[Object.keys(data||{})[0]]||null;
  if(!root)return {root:null,file:null};
  const outputs=Object.values(root?.outputs||{}) as any[];
  const buckets=['videos','gifs','images'];
  for(const bucket of buckets){
    for(const output of outputs){
      const files=Array.isArray(output?.[bucket])?output[bucket]:[];
      for(const file of files){
        const name=String(file?.filename||file?.name||'');
        if(!name)continue;
        if(bucket==='images'&&!/\.(mp4|webm|mov|gif|webp)$/i.test(name))continue;
        return {root,file:{filename:name,subfolder:String(file?.subfolder||''),type:String(file?.type||'output')}};
      }
    }
  }
  return {root,file:null};
}

async function comfyDownload(base:string,taskId:string){
  const history=await fetch(base+'/history/'+encodeURIComponent(taskId),{cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await history.json().catch(()=>({}));
  if(!history.ok)throw new Error('ComfyUI history HTTP '+history.status);
  const found=comfyOutput(data,taskId);
  if(!found.file)throw new Error('ComfyUI concluiu sem arquivo de vídeo reconhecido.');
  const params=new URLSearchParams(found.file);
  const media=await fetch(base+'/view?'+params.toString(),{cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!media.ok)throw new Error('ComfyUI view HTTP '+media.status);
  return new NextResponse(media.body,{status:200,headers:{
    'Content-Type':media.headers.get('content-type')||'video/mp4',
    'Cache-Control':'private, max-age=300',
    'Content-Disposition':'inline; filename="'+found.file.filename.replace(/"/g,'')+'"'
  }});
}

export async function GET(req:Request){
  const url=new URL(req.url);
  const provider=safeProvider(url.searchParams.get('provider'));
  const taskId=String(url.searchParams.get('taskId')||'').trim();
  const cfg=config();
  const available=remoteOrder(cfg);
  const recommended=available[0]||null;

  if(!provider||!taskId){
    return NextResponse.json({
      recommended,
      providers:{
        auto:{enabled:!!recommended,label:recommended?'Auto · IA generativa':'Auto · configure um motor de vídeo real',requiresExternalCredits:recommended!=='comfyui'},
        gemini:{enabled:cfg.gemini.enabled,label:'Gemini Veo 3.1',model:cfg.gemini.model,requiresExternalCredits:true,supportsImageToVideo:true,supportsReferenceImages:/veo-3\.1/i.test(cfg.gemini.model),durations:[4,6,8]},
        comfyui:{enabled:cfg.comfyui.enabled,label:'ComfyUI · LTX/Custom',requiresExternalCredits:false,supportsImageToVideo:true,supportsReferenceImages:true,durations:[4,5,6,8]},
        local:{enabled:true,label:'Motion local · fallback',generative:false},
        veo:{enabled:cfg.veo.enabled,label:'Veo 3',requiresExternalCredits:true,generative:true},
        sora:{enabled:cfg.sora.enabled,label:'Sora 2',requiresExternalCredits:true,generative:true},
        seedance:{enabled:cfg.seedance.enabled,label:'Seedance 2',requiresExternalCredits:true,generative:true}
      }
    });
  }

  const resolvedProvider:RemoteProvider=provider==='auto'?(recommended||'gemini'):provider;
  const entry=cfg[resolvedProvider];
  if(!entry.enabled)return NextResponse.json({error:'Provider não configurado no servidor.'},{status:503});

  try{
    if(resolvedProvider==='comfyui'){
      if(url.searchParams.get('download')==='1')return comfyDownload(cfg.comfyui.base,taskId);
      const r=await fetch(cfg.comfyui.base+'/history/'+encodeURIComponent(taskId),{
        cache:'no-store',signal:AbortSignal.timeout(12000)
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok)return NextResponse.json({error:'ComfyUI HTTP '+r.status},{status:502});
      const found=comfyOutput(data,taskId);
      const statusRaw=found.root?.status?.status_str||found.root?.status?.status||'';
      const failed=/error|fail/i.test(String(statusRaw))||Boolean(found.root?.status?.completed&&found.root?.status?.status_str==='error');
      const completed=!!found.file;
      return NextResponse.json({
        provider:'comfyui',requestedProvider:provider,taskId,
        status:failed?'failed':completed?'completed':'processing',
        videoUrl:completed?('/api/media/video?provider=comfyui&taskId='+encodeURIComponent(taskId)+'&download=1'):null,
        error:failed?'O workflow ComfyUI falhou. Verifique os nós/modelos instalados.':null,
        rawStatus:statusRaw||null
      });
    }

    if(resolvedProvider==='gemini'){
      const opUrl=taskId.startsWith('http')?taskId:entry.base+'/'+taskId.replace(/^\/+/, '');
      const statusRes=await fetch(opUrl,{cache:'no-store',headers:{'x-goog-api-key':entry.key,Accept:'application/json'}});
      const data=await statusRes.json().catch(()=>({}));
      if(!statusRes.ok)return NextResponse.json({error:mediaErrorText(data?.error,'Gemini HTTP '+statusRes.status)},{status:502});
      const failed=!!data?.error;
      const done=!!data?.done;
      const videoUri=
        data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
        data?.response?.generatedVideos?.[0]?.video?.uri ||
        null;
      if(url.searchParams.get('download')==='1'){
        if(!done||failed||!videoUri)return NextResponse.json({error:failed?mediaErrorText(data?.error,'Gemini video failed'):'Vídeo ainda não está pronto.'},{status:failed?502:409});
        const media=await fetch(String(videoUri),{headers:{'x-goog-api-key':entry.key},redirect:'follow'});
        if(!media.ok)return NextResponse.json({error:'Gemini download HTTP '+media.status},{status:502});
        return new NextResponse(media.body,{status:200,headers:{
          'Content-Type':media.headers.get('content-type')||'video/mp4',
          'Cache-Control':'private, max-age=300',
          'Content-Disposition':'inline; filename="predict-veo.mp4"'
        }});
      }
      return NextResponse.json({
        provider:'gemini',requestedProvider:provider,taskId,
        status:failed?'failed':done&&videoUri?'completed':'processing',
        videoUrl:done&&videoUri?('/api/media/video?provider=gemini&taskId='+encodeURIComponent(taskId)+'&download=1'):null,
        error:failed?mediaErrorText(data?.error,'Gemini video failed'):null,
        rawStatus:done?'done':'running'
      });
    }

    let endpoint='';
    if(resolvedProvider==='veo')endpoint=entry.base+'/veo/task?'+new URLSearchParams({taskId});
    if(resolvedProvider==='sora')endpoint=entry.base+'/sora/task?'+new URLSearchParams({taskId});
    if(resolvedProvider==='seedance')endpoint=entry.base+'/jobs/queryTask?'+new URLSearchParams({taskId});

    const r=await fetch(endpoint,{
      cache:'no-store',
      headers:{Authorization:'Bearer '+entry.key,Accept:'application/json'}
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return NextResponse.json({error:mediaErrorText(data?.error||data?.message,'Provider HTTP '+r.status)},{status:502});

    const status=normalizedStatus(data?.status);
    const videoUrl=
      data?.videoUrl ||
      data?.url ||
      data?.output?.[0]?.url ||
      data?.data?.videoUrl ||
      null;

    return NextResponse.json({
      provider:resolvedProvider,
      requestedProvider:provider,
      taskId,
      status,
      videoUrl,
      error:data?.error?mediaErrorText(data.error):null,
      rawStatus:data?.status||null
    });
  }catch(error:any){
    return NextResponse.json({error:mediaErrorText(error,'Falha ao consultar provider de vídeo.')},{status:502});
  }
}

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const provider=safeProvider(body?.provider);
  const prompt=String(body?.prompt||'').trim();
  const cfg=config();

  if(!provider)return NextResponse.json({error:'Provider de vídeo inválido.'},{status:400});
  if(!prompt)return NextResponse.json({error:'Descreva o vídeo.'},{status:400});

  const available=remoteOrder(cfg);
  const resolvedProvider:RemoteProvider=provider==='auto'?(available[0]||'gemini'):provider;
  const entry=cfg[resolvedProvider];
  if(!entry.enabled){
    return NextResponse.json({
      error:provider==='auto'
        ? 'Nenhum motor generativo real está configurado. Configure GEMINI_API_KEY, COMFYUI_VIDEO_BASE_URL + COMFYUI_VIDEO_WORKFLOW_JSON, MOUNTSEA_API_KEY ou SEEDANCE_API_KEY.'
        : 'Provider '+resolvedProvider+' não está configurado no servidor.'
    },{status:503});
  }

  const requestedResolution=safeResolution(body?.resolution);
  const referenceUrls:string[]=(Array.isArray(body?.referenceImages)?body.referenceImages:[])
    .map((x:any)=>String(x||'').trim()).filter((x:string)=>Boolean(x)).slice(0,3);
  const hasVisualInput=!!body?.imageUrl||referenceUrls.length>0;
  const duration=resolvedProvider==='gemini'
    ? geminiDuration(body?.duration,hasVisualInput,requestedResolution)
    : clampDuration(body?.duration,resolvedProvider==='veo'||resolvedProvider==='sora'?3:4,resolvedProvider==='veo'?8:15);
  const imageUrl=body?.imageUrl?String(body.imageUrl):'';
  const seed=Math.max(1,Math.min(2147483646,Math.floor(Number(body?.seed)||Date.now()%2147483646)));

  try{
    if(resolvedProvider==='comfyui'){
      const parsed=JSON.parse(cfg.comfyui.workflow);
      const startImage=imageUrl?await imageToInline(imageUrl,req.url):null;
      const imageFilename=await uploadComfyImage(cfg.comfyui.base,startImage);
      const width=geminiAspect(body?.aspectRatio)==='9:16'?720:1280;
      const height=geminiAspect(body?.aspectRatio)==='9:16'?1280:720;
      const workflow=workflowReplace(parsed,{
        '{{PROMPT}}':prompt,
        '{{NEGATIVE_PROMPT}}':String(body?.negativePrompt||'low quality, flicker, temporal inconsistency, deformed anatomy, watermark'),
        '{{WIDTH}}':width,
        '{{HEIGHT}}':height,
        '{{DURATION}}':duration,
        '{{FPS}}':24,
        '{{SEED}}':seed,
        '{{IMAGE_URL}}':imageUrl,
        '{{IMAGE_BASE64}}':startImage?.data||'',
        '{{IMAGE_FILENAME}}':imageFilename
      });
      const r=await fetch(cfg.comfyui.base+'/prompt',{
        method:'POST',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({prompt:workflow,client_id:'predictlm-'+seed}),
        signal:AbortSignal.timeout(20000)
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok)return NextResponse.json({error:mediaErrorText(data?.error||data,'ComfyUI HTTP '+r.status)},{status:502});
      const taskId=String(data?.prompt_id||data?.promptId||'');
      if(!taskId)return NextResponse.json({error:'ComfyUI não retornou prompt_id.'},{status:502});
      return NextResponse.json({provider:'comfyui',requestedProvider:provider,taskId,status:'queued',videoUrl:null});
    }

    let endpoint='';
    let payload:any={};
    let compatibilityWarning='';
    let visualInputDowngraded=false;

    if(resolvedProvider==='gemini'){
      endpoint=cfg.gemini.base+'/models/'+encodeURIComponent(cfg.gemini.model)+':predictLongRunning';
      const startImage=imageUrl?await imageToInline(imageUrl,req.url):null;
      const referenceImages=(await Promise.all(referenceUrls.map((url:string)=>imageToInline(url,req.url)))).filter(Boolean) as InlineImage[];
      const supportsReferenceImages=/veo-3\.1/i.test(cfg.gemini.model);
      const instance:any={prompt};
      if(startImage)instance.image={inlineData:{mimeType:startImage.mimeType,data:startImage.data}};
      if(referenceImages.length&&supportsReferenceImages){
        instance.referenceImages=referenceImages.map(ref=>({
          image:{inlineData:{mimeType:ref.mimeType,data:ref.data}},
          referenceType:'asset'
        }));
      }else if(referenceImages.length&&!supportsReferenceImages){
        compatibilityWarning='O modelo Gemini/Veo configurado não aceita referenceImages; as referências extras foram omitidas.';
      }
      payload={
        instances:[instance],
        parameters:{
          numberOfVideos:1,
          durationSeconds:String(duration),
          resolution:requestedResolution,
          aspectRatio:geminiAspect(body?.aspectRatio),
          personGeneration:hasVisualInput?'allow_adult':'allow_all',
          seed
        }
      };
    }else if(resolvedProvider==='veo'){
      endpoint=entry.base+'/veo/generate';
      payload={
        prompt,
        model:String(body?.model||'veo-3-fast'),
        duration,
        resolution:String(body?.resolution||'1080p'),
        ...(imageUrl?{imageUrl}:{})
      };
    }else if(resolvedProvider==='sora'){
      endpoint=entry.base+'/sora/generate';
      payload={
        prompt,
        duration,
        resolution:String(body?.resolution||'1080p'),
        ...(imageUrl?{imageUrl}:{})
      };
    }else{
      endpoint=entry.base+'/jobs/createTask';
      payload={
        model:String(body?.model||'sd2-fast'),
        inputs:{
          prompt,
          duration:duration+'s',
          resolution:String(body?.resolution||'1280x720'),
          ...(imageUrl?{urls:[imageUrl]}:{})
        }
      };
    }

    const requestHeaders=resolvedProvider==='gemini'
      ? {'x-goog-api-key':entry.key,'Content-Type':'application/json',Accept:'application/json'}
      : {Authorization:'Bearer '+entry.key,'Content-Type':'application/json',Accept:'application/json'};

    let r=await fetch(endpoint,{
      method:'POST',
      headers:requestHeaders,
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(30000)
    });
    let data=await r.json().catch(()=>({}));

    // Some Gemini/Veo deployments or model aliases reject visual inlineData even
    // though Veo 3.1 supports it. Do not turn that compatibility mismatch into a
    // hard 502: retry once as text-to-video and surface the downgrade to the UI.
    if(!r.ok&&resolvedProvider==='gemini'){
      const firstError=mediaErrorText(data?.error||data?.message||data,'Gemini HTTP '+r.status);
      if(/inlineData|inline data|referenceImages|reference images/i.test(firstError)){
        visualInputDowngraded=true;
        compatibilityWarning='O modelo Gemini configurado rejeitou a imagem/referências inline; o PredictLM repetiu a geração como texto→vídeo em vez de falhar.';
        const textOnlyPayload={
          instances:[{prompt}],
          parameters:{
            numberOfVideos:1,
            durationSeconds:String(duration),
            resolution:requestedResolution,
            aspectRatio:geminiAspect(body?.aspectRatio),
            personGeneration:'allow_all',
            seed
          }
        };
        r=await fetch(endpoint,{
          method:'POST',
          headers:requestHeaders,
          body:JSON.stringify(textOnlyPayload),
          signal:AbortSignal.timeout(30000)
        });
        data=await r.json().catch(()=>({}));
      }
    }

    if(!r.ok)return NextResponse.json({
      error:mediaErrorText(data?.error||data?.message||data,'Provider HTTP '+r.status),
      provider:resolvedProvider,
      compatibilityWarning:compatibilityWarning||null
    },{status:502});

    const taskId=String(resolvedProvider==='gemini'?(data?.name||''):(data?.taskId||data?.id||data?.data?.taskId||''));
    const direct=data?.videoUrl||data?.url||data?.output?.[0]?.url||null;
    if(!taskId&&!direct)return NextResponse.json({error:'Provider não retornou taskId nem vídeo.'},{status:502});

    return NextResponse.json({
      provider:resolvedProvider,
      requestedProvider:provider,
      taskId:taskId||null,
      status:direct?'completed':'queued',
      videoUrl:direct,
      effectiveDuration:duration,
      resolution:requestedResolution,
      visualInputDowngraded,
      compatibilityWarning:compatibilityWarning||null
    });
  }catch(error:any){
    return NextResponse.json({error:mediaErrorText(error,'Falha ao iniciar geração de vídeo.')},{status:502});
  }
}
