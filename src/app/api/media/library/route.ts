import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { buildDisplayTitle, buildSafeCaptionPtBr, normalizeMediaLibraryItem } from '@/lib/media/media-fidelity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE='predictlm_workspace';
const SECRET_COOKIE='predictlm_workspace_secret';
const DEFAULT_SUPABASE_URL='https://yzfnfoowbcwrwhhvnypc.supabase.co';
const DEFAULT_PUBLISHABLE_KEY='sb_publishable_56kl1LgPEEv8wKpjO-mfcg_Qv94Mv2c';

function cfg(){
  const url=String(
    process.env.PREDICT_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).replace(/\/$/,'');
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
  const secretHash=createHash('sha256').update(secret).digest('hex');
  return {id,secret,secretHash,freshId:!idCookie,freshSecret:!secretCookie};
}

function applyCookies(res:NextResponse,w:ReturnType<typeof workspace>){
  const opts={httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*365};
  if(w.freshId)res.cookies.set(COOKIE,w.id,opts);
  if(w.freshSecret)res.cookies.set(SECRET_COOKIE,w.secret,opts);
  return res;
}

function finish<T>(req:Request,payload:T,init?:ResponseInit){
  const w=workspace(req);
  return {res:applyCookies(NextResponse.json(payload,init),w),w};
}

function headers(key:string,w:ReturnType<typeof workspace>,extra:Record<string,string>={}){
  return {
    apikey:key,
    Authorization:'Bearer '+key,
    'Content-Type':'application/json',
    'x-predict-workspace':w.secretHash,
    ...extra
  };
}

export async function GET(req:Request){
  const {url,key,enabled}=cfg();
  const {res,w}=finish(req,{items:[],persisted:false});
  if(!enabled)return res;

  try{
    const q=new URLSearchParams({
      select:'id,kind,status,provider,model,prompt,enhanced_prompt,style,aspect_ratio,width,height,seed,remote_url,thumbnail_url,storage_path,pinned,meta,created_at',
      workspace_id:'eq.'+w.id,
      order:'created_at.desc',
      limit:'60'
    });
    const r=await fetch(url+'/rest/v1/predict_media_generations?'+q.toString(),{
      cache:'no-store',
      headers:headers(key,w)
    });
    if(!r.ok)throw new Error('Supabase '+r.status);
    const rawItems=await r.json();
    const items=Array.isArray(rawItems)?rawItems.map((item:any)=>normalizeMediaLibraryItem(item)):[];
    const out=NextResponse.json({items,persisted:true});
    return applyCookies(out,w);
  }catch{
    return res;
  }
}

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const {url,key,enabled}=cfg();
  const {res,w}=finish(req,{item:null,persisted:false});
  if(!enabled)return res;

  const prompt=String(body?.prompt||'').trim();
  if(!prompt)return finish(req,{error:'Prompt vazio.',persisted:false},{status:400}).res;

  const row={
    workspace_id:w.id,
    workspace_secret_hash:w.secretHash,
    kind:['image','video','storyboard'].includes(body?.kind)?body.kind:'image',
    status:['queued','generating','ready','error'].includes(body?.status)?body.status:'ready',
    provider:String(body?.provider||'pollinations').slice(0,80),
    model:body?.model?String(body.model).slice(0,120):null,
    prompt:prompt.slice(0,12000),
    enhanced_prompt:body?.enhancedPrompt?String(body.enhancedPrompt).slice(0,16000):null,
    style:body?.style?String(body.style).slice(0,80):null,
    aspect_ratio:body?.aspectRatio?String(body.aspectRatio).slice(0,24):null,
    width:Number.isFinite(Number(body?.width))?Number(body.width):null,
    height:Number.isFinite(Number(body?.height))?Number(body.height):null,
    seed:Number.isFinite(Number(body?.seed))?Math.floor(Number(body.seed)):null,
    remote_url:body?.url&&!String(body.url).startsWith('data:')?String(body.url).slice(0,4000):null,
    thumbnail_url:body?.thumbnailUrl?String(body.thumbnailUrl).slice(0,4000):null,
    pinned:!!body?.pinned,
    meta:(()=>{
      const incoming=body?.meta&&typeof body.meta==='object'?body.meta:{};
      const promptOriginal=String(incoming?.promptOriginal||incoming?.originalPrompt||prompt).trim();
      return {
        ...incoming,
        promptOriginal,
        displayTitle:buildDisplayTitle(promptOriginal),
        caption:buildSafeCaptionPtBr(promptOriginal,String(incoming?.caption||''))
      };
    })()
  };

  try{
    const r=await fetch(url+'/rest/v1/predict_media_generations',{
      method:'POST',
      headers:headers(key,w,{Prefer:'return=representation'}),
      body:JSON.stringify(row)
    });
    if(!r.ok)throw new Error('Supabase '+r.status);
    const createdRaw=(await r.json())?.[0]||null;
    const created=createdRaw?normalizeMediaLibraryItem(createdRaw):null;

    // Metadata-only rows are tiny. Unpinned history older than 30 days is pruned
    // opportunistically; binary Storage is never written by this endpoint.
    const cutoff=new Date(Date.now()-30*24*60*60*1000).toISOString();
    const prune=new URLSearchParams({
      workspace_id:'eq.'+w.id,
      pinned:'eq.false',
      created_at:'lt.'+cutoff
    });
    await fetch(url+'/rest/v1/predict_media_generations?'+prune.toString(),{
      method:'DELETE',
      headers:headers(key,w,{Prefer:'return=minimal'})
    }).catch(()=>null);

    const out=NextResponse.json({item:created,persisted:true});
    return applyCookies(out,w);
  }catch{
    return res;
  }
}

export async function DELETE(req:Request){
  const {url,key,enabled}=cfg();
  const {res,w}=finish(req,{deleted:false,persisted:false});
  if(!enabled)return res;
  const id=new URL(req.url).searchParams.get('id')||'';
  if(!/^[0-9a-f-]{36}$/i.test(id))return finish(req,{error:'ID inválido.'},{status:400}).res;

  try{
    const lookup=new URLSearchParams({
      select:'id,storage_path',
      id:'eq.'+id,
      workspace_id:'eq.'+w.id,
      limit:'1'
    });
    const lr=await fetch(url+'/rest/v1/predict_media_generations?'+lookup.toString(),{headers:headers(key,w),cache:'no-store'});
    const item=lr.ok?(await lr.json())?.[0]:null;

    if(item?.storage_path){
      const encoded=String(item.storage_path).split('/').map(encodeURIComponent).join('/');
      await fetch(url+'/storage/v1/object/predict-media/'+encoded,{method:'DELETE',headers:headers(key,w)}).catch(()=>null);
    }

    const q=new URLSearchParams({id:'eq.'+id,workspace_id:'eq.'+w.id});
    const d=await fetch(url+'/rest/v1/predict_media_generations?'+q.toString(),{
      method:'DELETE',
      headers:headers(key,w,{Prefer:'return=minimal'})
    });
    if(!d.ok)throw new Error('Supabase '+d.status);
    const out=NextResponse.json({deleted:true,persisted:true});
    return applyCookies(out,w);
  }catch{
    return res;
  }
}
