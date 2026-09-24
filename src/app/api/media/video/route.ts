import { NextResponse } from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='gru1';
export const maxDuration=60;

type RemoteProvider='gemini'|'veo'|'sora'|'seedance';
type Provider='auto'|RemoteProvider;

function config(){
  const mountseaKey=String(process.env.MOUNTSEA_API_KEY||process.env.MEDIA_VIDEO_API_KEY||'').trim();
  const seedanceKey=String(process.env.SEEDANCE_API_KEY||process.env.MEDIA_VIDEO_API_KEY||'').trim();
  const geminiKey=String(process.env.GEMINI_API_KEY||'').trim();
  return {
    gemini:{enabled:!!geminiKey,key:geminiKey,base:String(process.env.GEMINI_VIDEO_BASE_URL||'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/,''),model:String(process.env.GEMINI_VIDEO_MODEL||'veo-3.1-generate-preview').trim()},
    veo:{enabled:!!mountseaKey,key:mountseaKey,base:String(process.env.MOUNTSEA_BASE_URL||'https://api.mountsea.ai').replace(/\/$/,'')},
    sora:{enabled:!!mountseaKey,key:mountseaKey,base:String(process.env.MOUNTSEA_BASE_URL||'https://api.mountsea.ai').replace(/\/$/,'')},
    seedance:{enabled:!!seedanceKey,key:seedanceKey,base:String(process.env.SEEDANCE_BASE_URL||'https://seegen.ai/api/v1').replace(/\/$/,'')}
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

function geminiDuration(value:any){
  const n=Math.round(Number(value)||6);
  return [4,6,8].sort((a,b)=>Math.abs(a-n)-Math.abs(b-n))[0];
}
function geminiAspect(value:any){
  return String(value||'16:9')==='9:16'?'9:16':'16:9';
}

function safeProvider(value:any):Provider|null{
  const p=String(value||'').toLowerCase();
  return p==='auto'||p==='gemini'||p==='veo'||p==='sora'||p==='seedance'?p:null;
}

function remoteOrder(cfg:ReturnType<typeof config>):RemoteProvider[]{
  const requested=String(process.env.PREDICTLM_VIDEO_PROVIDER_ORDER||'gemini,veo,seedance,sora')
    .split(',').map(x=>x.trim().toLowerCase())
    .filter((x):x is RemoteProvider=>x==='gemini'||x==='veo'||x==='sora'||x==='seedance');
  const unique:Array<RemoteProvider>=[];
  for(const id of requested)if(!unique.includes(id))unique.push(id);
  for(const id of ['gemini','veo','seedance','sora'] as RemoteProvider[])if(!unique.includes(id))unique.push(id);
  return unique.filter(id=>cfg[id].enabled);
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
        auto:{enabled:!!recommended,label:recommended?'Auto · IA generativa':'Auto · configure uma API de vídeo',requiresExternalCredits:true},
        gemini:{enabled:cfg.gemini.enabled,label:'Gemini Veo 3.1',requiresExternalCredits:true},
        local:{enabled:true,label:'Motion local · fallback'},
        veo:{enabled:cfg.veo.enabled,label:'Veo 3',requiresExternalCredits:true},
        sora:{enabled:cfg.sora.enabled,label:'Sora 2',requiresExternalCredits:true},
        seedance:{enabled:cfg.seedance.enabled,label:'Seedance 2',requiresExternalCredits:true}
      }
    });
  }

  const resolvedProvider:RemoteProvider=provider==='auto'?(recommended||'gemini'):provider;
  const entry=cfg[resolvedProvider];
  if(!entry.enabled)return NextResponse.json({error:'Provider não configurado no servidor.'},{status:503});

  try{
    if(resolvedProvider==='gemini'){
      const opUrl=taskId.startsWith('http')?taskId:entry.base+'/'+taskId.replace(/^\/+/, '');
      const statusRes=await fetch(opUrl,{cache:'no-store',headers:{'x-goog-api-key':entry.key,Accept:'application/json'}});
      const data=await statusRes.json().catch(()=>({}));
      if(!statusRes.ok)return NextResponse.json({error:data?.error?.message||data?.error||('Gemini HTTP '+statusRes.status)},{status:502});
      const failed=!!data?.error;
      const done=!!data?.done;
      const videoUri=
        data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
        data?.response?.generatedVideos?.[0]?.video?.uri ||
        null;
      if(url.searchParams.get('download')==='1'){
        if(!done||failed||!videoUri)return NextResponse.json({error:failed?(data?.error?.message||'Gemini video failed'):'Vídeo ainda não está pronto.'},{status:failed?502:409});
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
        error:failed?(data?.error?.message||'Gemini video failed'):null,
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
    if(!r.ok)return NextResponse.json({error:data?.error||data?.message||('Provider HTTP '+r.status)},{status:502});

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
      error:data?.error||null,
      rawStatus:data?.status||null
    });
  }catch(error:any){
    return NextResponse.json({error:String(error?.message||'Falha ao consultar provider de vídeo.')},{status:502});
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
        ? 'Nenhum provider generativo de vídeo está configurado. GEMINI_API_KEY, MOUNTSEA_API_KEY ou SEEDANCE_API_KEY pode habilitar vídeo real.'
        : 'Provider '+resolvedProvider+' não está configurado no servidor.'
    },{status:503});
  }

  const duration=resolvedProvider==='gemini'
    ? geminiDuration(body?.duration)
    : clampDuration(body?.duration,resolvedProvider==='veo'||resolvedProvider==='sora'?3:4,resolvedProvider==='veo'?8:15);
  const imageUrl=body?.imageUrl?new URL(String(body.imageUrl),req.url).toString():undefined;

  try{
    let endpoint='';
    let payload:any={};

    if(resolvedProvider==='gemini'){
      endpoint=entry.base+'/models/'+encodeURIComponent(entry.model)+':predictLongRunning';
      payload={
        instances:[{prompt}],
        parameters:{
          numberOfVideos:1,
          durationSeconds:duration,
          resolution:String(body?.resolution||'720p'),
          aspectRatio:geminiAspect(body?.aspectRatio)
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

    const r=await fetch(endpoint,{
      method:'POST',
      headers:resolvedProvider==='gemini'
        ? {'x-goog-api-key':entry.key,'Content-Type':'application/json',Accept:'application/json'}
        : {Authorization:'Bearer '+entry.key,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify(payload)
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return NextResponse.json({error:data?.error||data?.message||('Provider HTTP '+r.status)},{status:502});

    const taskId=String(resolvedProvider==='gemini'?(data?.name||''):(data?.taskId||data?.id||data?.data?.taskId||''));
    const direct=data?.videoUrl||data?.url||data?.output?.[0]?.url||null;
    if(!taskId&&!direct)return NextResponse.json({error:'Provider não retornou taskId nem vídeo.'},{status:502});

    return NextResponse.json({
      provider:resolvedProvider,
      requestedProvider:provider,
      taskId:taskId||null,
      status:direct?'completed':'queued',
      videoUrl:direct
    });
  }catch(error:any){
    return NextResponse.json({error:String(error?.message||'Falha ao iniciar geração de vídeo.')},{status:502});
  }
}
