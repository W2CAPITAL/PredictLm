import {NextResponse} from 'next/server';
import {ACCESS_COOKIE,accessControlConfigured,accessCookieOptions,createAccessSession,verifyAccessToken} from '@/lib/server/access-control';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function safeReturnTo(value:unknown){
  const raw=String(value||'/').trim();
  if(!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\\'))return '/';
  return raw.slice(0,500);
}

async function payload(req:Request){
  const type=String(req.headers.get('content-type')||'').toLowerCase();
  if(type.includes('application/json'))return {data:await req.json().catch(()=>({})),json:true};
  const form=await req.formData().catch(()=>null);
  return {
    data:form?Object.fromEntries(Array.from(form.entries()).map(([k,v])=>[k,String(v)])):{},
    json:false
  };
}

export async function POST(req:Request){
  if(!accessControlConfigured()){
    return NextResponse.json({ok:false,code:'ACCESS_CONTROL_NOT_CONFIGURED',error:'Acesso seguro não configurado no servidor.'},{status:503});
  }
  const {data,json}=await payload(req);
  const token=String((data as any)?.token||'');
  const returnTo=safeReturnTo((data as any)?.returnTo);
  if(!verifyAccessToken(token)){
    if(json)return NextResponse.json({ok:false,error:'Credencial inválida.'},{status:401});
    return NextResponse.redirect(new URL('/access?error=1&returnTo='+encodeURIComponent(returnTo),req.url),303);
  }
  const session=createAccessSession();
  if(json){
    const res=NextResponse.json({ok:true});
    res.cookies.set(ACCESS_COOKIE,session,accessCookieOptions());
    return res;
  }
  const res=NextResponse.redirect(new URL(returnTo,req.url),303);
  res.cookies.set(ACCESS_COOKIE,session,accessCookieOptions());
  return res;
}

export async function DELETE(){
  const res=NextResponse.json({ok:true});
  res.cookies.set(ACCESS_COOKIE,'',{...accessCookieOptions(),maxAge:0});
  return res;
}
