import { NextResponse } from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='gru1';
export const maxDuration=60;

type Provider='veo'|'sora'|'seedance';

function config(){
  const mountseaKey=String(process.env.MOUNTSEA_API_KEY||process.env.MEDIA_VIDEO_API_KEY||'').trim();
  const seedanceKey=String(process.env.SEEDANCE_API_KEY||process.env.MEDIA_VIDEO_API_KEY||'').trim();
  return {
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

function safeProvider(value:any):Provider|null{
  const p=String(value||'').toLowerCase();
  return p==='veo'||p==='sora'||p==='seedance'?p:null;
}

export async function GET(req:Request){
  const url=new URL(req.url);
  const provider=safeProvider(url.searchParams.get('provider'));
  const taskId=String(url.searchParams.get('taskId')||'').trim();
  const cfg=config();

  if(!provider||!taskId){
    return NextResponse.json({
      providers:{
        local:{enabled:true,label:'Local storyboard'},
        veo:{enabled:cfg.veo.enabled,label:'Veo 3',requiresExternalCredits:true},
        sora:{enabled:cfg.sora.enabled,label:'Sora 2',requiresExternalCredits:true},
        seedance:{enabled:cfg.seedance.enabled,label:'Seedance 2',requiresExternalCredits:true}
      }
    });
  }

  const entry=cfg[provider];
  if(!entry.enabled)return NextResponse.json({error:'Provider não configurado no servidor.'},{status:503});

  try{
    let endpoint='';
    if(provider==='veo')endpoint=entry.base+'/veo/task?'+new URLSearchParams({taskId});
    if(provider==='sora')endpoint=entry.base+'/sora/task?'+new URLSearchParams({taskId});
    if(provider==='seedance')endpoint=entry.base+'/jobs/queryTask?'+new URLSearchParams({taskId});

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
      provider,
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

  const entry=cfg[provider];
  if(!entry.enabled)return NextResponse.json({error:'Provider '+provider+' não está configurado no servidor.'},{status:503});

  const duration=clampDuration(body?.duration,provider==='veo'||provider==='sora'?3:4,provider==='veo'?8:15);
  const imageUrl=body?.imageUrl?new URL(String(body.imageUrl),req.url).toString():undefined;

  try{
    let endpoint='';
    let payload:any={};

    if(provider==='veo'){
      endpoint=entry.base+'/veo/generate';
      payload={
        prompt,
        model:String(body?.model||'veo-3-fast'),
        duration,
        resolution:String(body?.resolution||'1080p'),
        ...(imageUrl?{imageUrl}:{})
      };
    }else if(provider==='sora'){
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
      headers:{
        Authorization:'Bearer '+entry.key,
        'Content-Type':'application/json',
        Accept:'application/json'
      },
      body:JSON.stringify(payload)
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return NextResponse.json({error:data?.error||data?.message||('Provider HTTP '+r.status)},{status:502});

    const taskId=String(data?.taskId||data?.id||data?.data?.taskId||'');
    const direct=data?.videoUrl||data?.url||data?.output?.[0]?.url||null;
    if(!taskId&&!direct)return NextResponse.json({error:'Provider não retornou taskId nem vídeo.'},{status:502});

    return NextResponse.json({
      provider,
      taskId:taskId||null,
      status:direct?'completed':'queued',
      videoUrl:direct
    });
  }catch(error:any){
    return NextResponse.json({error:String(error?.message||'Falha ao iniciar geração de vídeo.')},{status:502});
  }
}
