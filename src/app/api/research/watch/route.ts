import {NextResponse} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

function config(){
  let base=String(process.env.CHANGEDETECTION_BASE_URL||'').trim().replace(/\/$/,'');
  if(base&&!/\/api\/v1$/i.test(base))base+='/api/v1';
  return {
    base,
    key:String(process.env.CHANGEDETECTION_API_KEY||'').trim()
  };
}

function headers(key:string){
  return {
    'Accept':'application/json',
    'Content-Type':'application/json',
    ...(key?{'x-api-key':key}:{})
  };
}

export async function GET(req:Request){
  const cfg=config();
  if(!cfg.base)return NextResponse.json({configured:false,watches:[],required:['CHANGEDETECTION_BASE_URL']});
  try{
    const url=new URL(req.url);
    const id=String(url.searchParams.get('id')||'').trim();
    const path=id?'/watch/'+encodeURIComponent(id):'/watch';
    const r=await fetch(cfg.base+path,{headers:headers(cfg.key),cache:'no-store',signal:AbortSignal.timeout(15000)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return NextResponse.json({configured:true,error:'ChangeDetection HTTP '+r.status,detail:data},{status:502});
    return NextResponse.json({configured:true,data},{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return NextResponse.json({configured:true,error:String(error?.message||'Falha no ChangeDetection.')},{status:500});
  }
}

export async function POST(req:Request){
  const cfg=config();
  if(!cfg.base)return NextResponse.json({error:'ChangeDetection não configurado.',code:'CHANGEDETECTION_NOT_CONFIGURED'},{status:503});
  try{
    const body=await req.json().catch(()=>({}));
    const url=String(body?.url||'').trim();
    if(!/^https?:\/\//i.test(url))return NextResponse.json({error:'url pública http/https é obrigatória'},{status:400});
    const payload={
      url,
      title:String(body?.title||'').slice(0,180),
      paused:Boolean(body?.paused),
      check_interval:body?.check_interval||undefined,
      include_filters:Array.isArray(body?.include_filters)?body.include_filters.slice(0,20):undefined,
      ignore_text:Array.isArray(body?.ignore_text)?body.ignore_text.slice(0,20):undefined,
      notification_urls:Array.isArray(body?.notification_urls)?body.notification_urls.slice(0,12):undefined
    };
    const r=await fetch(cfg.base+'/watch',{
      method:'POST',
      headers:headers(cfg.key),
      body:JSON.stringify(payload),
      cache:'no-store',
      signal:AbortSignal.timeout(15000)
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return NextResponse.json({error:'ChangeDetection HTTP '+r.status,detail:data},{status:502});
    return NextResponse.json({created:true,data},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return NextResponse.json({error:String(error?.message||'Falha ao criar monitor.')},{status:500});
  }
}

export async function DELETE(req:Request){
  const cfg=config();
  if(!cfg.base)return NextResponse.json({error:'ChangeDetection não configurado.'},{status:503});
  const url=new URL(req.url);
  const id=String(url.searchParams.get('id')||'').trim();
  if(!id)return NextResponse.json({error:'id is required'},{status:400});
  try{
    const r=await fetch(cfg.base+'/watch/'+encodeURIComponent(id),{
      method:'DELETE',
      headers:headers(cfg.key),
      cache:'no-store',
      signal:AbortSignal.timeout(15000)
    });
    if(!r.ok&&r.status!==204){
      const data=await r.json().catch(()=>({}));
      return NextResponse.json({error:'ChangeDetection HTTP '+r.status,detail:data},{status:502});
    }
    return NextResponse.json({deleted:true,id});
  }catch(error:any){
    return NextResponse.json({error:String(error?.message||'Falha ao remover monitor.')},{status:500});
  }
}
