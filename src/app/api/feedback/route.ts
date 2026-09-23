import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const COOKIE='predictlm_workspace';
const SECRET_COOKIE='predictlm_workspace_secret';
const DEFAULT_SUPABASE_URL='https://yzfnfoowbcwrwhhvnypc.supabase.co';
const DEFAULT_PUBLISHABLE_KEY='sb_publishable_56kl1LgPEEv8wKpjO-mfcg_Qv94Mv2c';
function cfg(){
  const url=String(process.env.PREDICT_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL).replace(/\/$/,'');
  const service=String(process.env.PREDICT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  const publishable=String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||DEFAULT_PUBLISHABLE_KEY);
  const key=service||publishable;
  return {url,key,service:!!service,enabled:!!url&&!!key};
}
function workspace(req:Request){
  const raw=req.headers.get('cookie')||'';
  const idCookie=raw.match(/(?:^|;\s*)predictlm_workspace=([0-9a-f-]{36})/i)?.[1];
  const secretCookie=raw.match(/(?:^|;\s*)predictlm_workspace_secret=([^;]+)/i)?.[1];
  const id=idCookie||randomUUID();
  const secret=secretCookie||randomUUID()+randomUUID();
  return {id,secret,secretHash:createHash('sha256').update(secret).digest('hex'),freshId:!idCookie,freshSecret:!secretCookie};
}
function withCookie(res:NextResponse,w:ReturnType<typeof workspace>){
  const opts={httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*365};
  if(w.freshId)res.cookies.set(COOKIE,w.id,opts);
  if(w.freshSecret)res.cookies.set(SECRET_COOKIE,w.secret,opts);
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
    workspace_secret_hash:w.secretHash,
    surface,
    kind,
    message_fingerprint:message?createHash('sha256').update(message).digest('hex').slice(0,24):null,
    message_excerpt:message?message.slice(0,600):null,
    metadata:body?.metadata&&typeof body.metadata==='object'?body.metadata:{}
  };
  try{
    const r=await fetch(url+'/rest/v1/predict_feedback_events',{
      method:'POST',
      headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json','x-predict-workspace':w.secretHash,Prefer:'return=minimal'},
      body:JSON.stringify(row)
    });
    if(!r.ok)throw new Error('Supabase '+r.status);

    // Retention pruning is only attempted with a service key; anon is insert-only by design.
    if(service){
      const cutoff=new Date(Date.now()-90*24*60*60*1000).toISOString();
      const q=new URLSearchParams({workspace_id:'eq.'+w.id,created_at:'lt.'+cutoff});
      fetch(url+'/rest/v1/predict_feedback_events?'+q.toString(),{
        method:'DELETE',
        headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'return=minimal'}
      }).catch(()=>null);
    }

    return withCookie(NextResponse.json({saved:true}),w);
  }catch{
    return withCookie(NextResponse.json({saved:false}),w);
  }
}
