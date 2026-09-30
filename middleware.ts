import {NextRequest,NextResponse} from 'next/server';

const ACCESS_COOKIE='predictlm_access';
const localTraffic=new Map<string,{windowStart:number;count:number}>();

function bytes(input:string){
  return new TextEncoder().encode(input);
}

function b64url(input:ArrayBuffer){
  const chars=String.fromCharCode(...new Uint8Array(input));
  return btoa(chars).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function sha256(input:string){
  return new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(input)));
}

async function safeEqual(a:string,b:string){
  const [da,db]=await Promise.all([sha256(a),sha256(b)]);
  if(da.length!==db.length)return false;
  let diff=0;
  for(let i=0;i<da.length;i++)diff|=da[i]^db[i];
  return diff===0;
}

async function hmac(input:string,secret:string){
  const key=await crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64url(await crypto.subtle.sign('HMAC',key,bytes(input)));
}

async function validSession(raw:string,accessToken:string){
  const [expRaw,sig,...extra]=String(raw||'').split('.');
  if(extra.length||!expRaw||!sig)return false;
  const exp=Number(expRaw);
  if(!Number.isInteger(exp)||exp<Math.floor(Date.now()/1000))return false;
  const secret=String(process.env.PREDICTLM_SESSION_SECRET||accessToken).trim();
  if(!secret)return false;
  const expected=await hmac('predictlm-access:'+expRaw,secret);
  return safeEqual(sig,expected);
}

function bearer(req:NextRequest){
  const header=String(req.headers.get('authorization')||'');
  return header.toLowerCase().startsWith('bearer ')?header.slice(7).trim():'';
}

function apiKeys(){
  const single=String(process.env.PREDICTLM_API_KEY||'').trim();
  const many=String(process.env.PREDICTLM_API_KEYS||'').split(/[\n,]+/).map(value=>value.trim()).filter(Boolean);
  return [...new Set([single,...many].filter(Boolean))];
}

async function matchesAny(candidate:string,values:string[]){
  if(!candidate)return false;
  for(const value of values)if(value&&await safeEqual(candidate,value))return true;
  return false;
}

function clientIp(req:NextRequest){
  const vercel=String(req.headers.get('x-vercel-forwarded-for')||'').split(',')[0]?.trim();
  if(process.env.VERCEL&&vercel)return vercel;
  return String(req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,120);
}

function ratePolicy(pathname:string){
  if(/^\/api\/(?:chat|agent|media|research|report-dossier|web\/inspect|documents\/parse|social|legal\/dossier)/.test(pathname))return {bucket:'expensive',limit:30,windowSeconds:60};
  return {bucket:'standard',limit:120,windowSeconds:60};
}

async function identityHash(req:NextRequest,subject:string){
  const secret=String(process.env.PREDICTLM_RATE_LIMIT_SECRET||process.env.PREDICTLM_SESSION_SECRET||process.env.PREDICTLM_ACCESS_TOKEN||process.env.PREDICTLM_API_KEY||'predictlm').trim();
  return b64url(await crypto.subtle.digest('SHA-256',bytes(secret+'|'+clientIp(req)+'|'+subject)));
}

function localTake(key:string,limit:number,windowSeconds:number){
  const now=Date.now(),windowMs=windowSeconds*1000;
  const prev=localTraffic.get(key);
  const state=!prev||now-prev.windowStart>=windowMs?{windowStart:now,count:1}:{...prev,count:prev.count+1};
  localTraffic.set(key,state);
  if(localTraffic.size>1500){
    for(const [k,v] of localTraffic)if(now-v.windowStart>windowMs*3)localTraffic.delete(k);
  }
  return {allowed:state.count<=limit,remaining:Math.max(0,limit-state.count),retryAfterSeconds:Math.max(1,Math.ceil((state.windowStart+windowMs-now)/1000)),mode:'local'};
}

async function takeRateLimit(key:string,bucket:string,limit:number,windowSeconds:number){
  const base=String(process.env.PREDICT_SUPABASE_URL||process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const service=String(process.env.PREDICT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
  if(base&&service){
    try{
      const r=await fetch(base+'/rest/v1/rpc/predict_take_rate_limit',{
        method:'POST',
        headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},
        body:JSON.stringify({p_key_hash:key,p_bucket:bucket,p_limit:limit,p_window_seconds:windowSeconds}),
        cache:'no-store',
        signal:AbortSignal.timeout(1800)
      });
      const data=await r.json().catch(()=>null);
      const row=Array.isArray(data)?data[0]:data;
      if(r.ok&&row&&typeof row.allowed==='boolean'){
        return {allowed:Boolean(row.allowed),remaining:Number(row.remaining)||0,retryAfterSeconds:Math.max(1,Number(row.retry_after_seconds)||1),mode:'distributed'};
      }
    }catch{}
  }
  return localTake(bucket+':'+key,limit,windowSeconds);
}

function exempt(pathname:string){
  return pathname==='/access'||pathname==='/api/auth/session'||pathname.startsWith('/_next/')||pathname==='/favicon.ico'||pathname==='/robots.txt'||/\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|css|js|map)$/i.test(pathname);
}

export async function middleware(req:NextRequest){
  const pathname=req.nextUrl.pathname;
  if(exempt(pathname))return NextResponse.next();

  const accessToken=String(process.env.PREDICTLM_ACCESS_TOKEN||'').trim();
  const dedicatedApiKeys=apiKeys();
  const apiConfigured=!!accessToken||dedicatedApiKeys.length>0;
  if(!apiConfigured){
    if(process.env.NODE_ENV!=='production')return NextResponse.next();
    const publicApi=pathname==='/api/health'||pathname==='/api/legal/health';
    if(pathname.startsWith('/api/')&&!publicApi){
      return NextResponse.json({
        error:'Recursos remotos protegidos não estão habilitados neste deployment.',
        code:'ACCESS_CONTROL_NOT_CONFIGURED'
      },{status:503,headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.next();
  }

  // API-only deployments may expose the static shell without enabling browser sessions.
  if(!accessToken&&!pathname.startsWith('/api/'))return NextResponse.next();

  const direct=bearer(req);
  const cookie=req.cookies.get(ACCESS_COOKIE)?.value||'';
  const directOk=direct?await matchesAny(direct,[accessToken,...dedicatedApiKeys]):false;
  const sessionOk=!directOk&&accessToken&&cookie?await validSession(cookie,accessToken):false;
  if(!directOk&&!sessionOk){
    if(pathname.startsWith('/api/'))return NextResponse.json({error:'Não autorizado.',code:'UNAUTHORIZED'},{status:401,headers:{'Cache-Control':'no-store'}});
    const login=req.nextUrl.clone();login.pathname='/access';login.searchParams.set('returnTo',pathname+req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if(pathname.startsWith('/api/')&&sessionOk&&!['GET','HEAD','OPTIONS'].includes(req.method)){
    const origin=String(req.headers.get('origin')||'');
    if(!origin||origin!==req.nextUrl.origin){
      return NextResponse.json({error:'Origem inválida.',code:'CSRF_ORIGIN_REJECTED'},{status:403,headers:{'Cache-Control':'no-store'}});
    }
  }

  if(pathname.startsWith('/api/')){
    const policy=ratePolicy(pathname);
    const subject=directOk?'bearer':'session';
    const key=await identityHash(req,subject);
    const rate=await takeRateLimit(key,policy.bucket,policy.limit,policy.windowSeconds);
    if(!rate.allowed){
      return NextResponse.json({error:'Limite temporário de requisições atingido.',code:'RATE_LIMITED'},{status:429,headers:{'Retry-After':String(rate.retryAfterSeconds),'Cache-Control':'no-store'}});
    }
    const res=NextResponse.next();
    res.headers.set('X-RateLimit-Remaining',String(rate.remaining));
    res.headers.set('X-RateLimit-Mode',rate.mode);
    return res;
  }

  return NextResponse.next();
}

export const config={
  matcher:['/((?!_next/static|_next/image).*)']
};
