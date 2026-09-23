import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const COOKIE='predictlm_workspace';
function cfg(){
  const url=String(process.env.PREDICT_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(process.env.PREDICT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  return {url,key,enabled:!!url&&!!key};
}
function workspace(req:Request){
  const raw=req.headers.get('cookie')||'';
  const found=raw.match(/(?:^|;\s*)predictlm_workspace=([0-9a-f-]{36})/i)?.[1];
  return {id:found||randomUUID(),fresh:!found};
}
function withCookie(res:NextResponse,w:{id:string;fresh:boolean}){
  if(w.fresh)res.cookies.set(COOKIE,w.id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*365});
  return res;
}
export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const kind=String(body?.kind||'').toLowerCase();
  if(!['positive','negative','error','suggestion'].includes(kind))return NextResponse.json({error:'Feedback inválido.'},{status:400});
  const message=String(body?.message||'').trim();
  const surface=String(body?.surface||'chat').slice(0,50);
  const w=workspace(req);
  const {url,key,enabled}=cfg();
  if(!enabled)return withCookie(NextResponse.json({saved:false,localOnly:true}),w);

  const row={
    workspace_id:w.id,
    surface,
    kind,
    message_fingerprint:message?createHash('sha256').update(message).digest('hex').slice(0,24):null,
    message_excerpt:message?message.slice(0,600):null,
    metadata:body?.metadata&&typeof body.metadata==='object'?body.metadata:{}
  };
  try{
    const r=await fetch(url+'/rest/v1/predict_feedback_events',{
      method:'POST',
      headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify(row)
    });
    if(!r.ok)throw new Error('Supabase '+r.status);

    const cutoff=new Date(Date.now()-90*24*60*60*1000).toISOString();
    const q=new URLSearchParams({workspace_id:'eq.'+w.id,created_at:'lt.'+cutoff});
    fetch(url+'/rest/v1/predict_feedback_events?'+q.toString(),{
      method:'DELETE',
      headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'return=minimal'}
    }).catch(()=>null);

    return withCookie(NextResponse.json({saved:true}),w);
  }catch{
    return withCookie(NextResponse.json({saved:false}),w);
  }
}
