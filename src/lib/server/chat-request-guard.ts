interface ChatTrafficState{
  windowStart:number;
  count:number;
  inFlight:number;
  touchedAt:number;
}

declare global{
  var __predictlmChatTraffic:Map<string,ChatTrafficState>|undefined;
}

const traffic=globalThis.__predictlmChatTraffic||(globalThis.__predictlmChatTraffic=new Map());
const WINDOW_MS=60_000;
function intEnv(name:string,fallback:number,min:number,max:number){
  const raw=Number(process.env[name]);
  return Number.isFinite(raw)?Math.max(min,Math.min(max,Math.floor(raw))):fallback;
}
const MAX_REQUESTS_PER_WINDOW=intEnv('PREDICTLM_CHAT_REQUESTS_PER_MINUTE',10,1,120);
const MAX_IN_FLIGHT=intEnv('PREDICTLM_CHAT_MAX_IN_FLIGHT',1,1,8);

function clientKey(req:Request,sessionScope=''){
  if(sessionScope)return'session:'+sessionScope;
  const forwarded=String(req.headers.get('x-forwarded-for')||'').split(',')[0]?.trim();
  const real=String(req.headers.get('x-real-ip')||'').trim();
  const ip=(forwarded||real||'anonymous').replace(/[^a-zA-Z0-9:._-]/g,'').slice(0,96);
  return'client:'+ip;
}

function cleanup(now:number){
  if(traffic.size<500)return;
  for(const [key,state] of traffic){
    if(now-state.touchedAt>5*WINDOW_MS)traffic.delete(key);
  }
}

export function acquireChatRequest(req:Request,sessionScope='',now=Date.now()){
  if(process.env.NODE_ENV==='test'){
    return{allowed:true,retryAfterMs:0,release:()=>{}};
  }
  cleanup(now);
  const key=clientKey(req,sessionScope);
  const previous=traffic.get(key);
  const state:ChatTrafficState=!previous||now-previous.windowStart>=WINDOW_MS
    ?{windowStart:now,count:0,inFlight:0,touchedAt:now}
    :{...previous,touchedAt:now};

  if(state.count>=MAX_REQUESTS_PER_WINDOW){
    const retryAfterMs=Math.max(1000,WINDOW_MS-(now-state.windowStart));
    traffic.set(key,state);
    return{allowed:false,retryAfterMs,release:()=>{}};
  }
  if(state.inFlight>=MAX_IN_FLIGHT){
    traffic.set(key,state);
    return{allowed:false,retryAfterMs:1500,release:()=>{}};
  }

  state.count+=1;
  state.inFlight+=1;
  traffic.set(key,state);
  let released=false;
  return{
    allowed:true,
    retryAfterMs:0,
    release:()=>{
      if(released)return;
      released=true;
      const current=traffic.get(key);
      if(!current)return;
      traffic.set(key,{...current,inFlight:Math.max(0,current.inFlight-1),touchedAt:Date.now()});
    }
  };
}

export function resetChatTrafficForTests(){
  traffic.clear();
}
