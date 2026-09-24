export interface ProviderHealthIdentity{
  name:string;
  base:string;
  model:string;
}

export interface ProviderHealthState{
  failures:number;
  cooldownUntil:number;
  lastFailureAt:number;
  lastSuccessAt:number;
  lastStatus:number|null;
}

declare global{
  var __predictlmProviderHealth:Map<string,ProviderHealthState>|undefined;
}

const health=globalThis.__predictlmProviderHealth||(globalThis.__predictlmProviderHealth=new Map());

function keyOf(provider:ProviderHealthIdentity){
  let host='';
  try{host=new URL(provider.base).host.toLowerCase()}catch{host=provider.base.toLowerCase()}
  return provider.name+'|'+host+'|'+provider.model;
}

function statusFrom(error:unknown){
  const text=String((error as any)?.message||error||'');
  const match=text.match(/\b(400|401|403|404|408|409|425|429|5\d\d)\b/);
  return match?Number(match[1]):null;
}

function cooldownMs(status:number|null,failures:number,error:unknown){
  const text=String((error as any)?.message||error||'').toLowerCase();
  if(status===401||status===403)return 5*60_000;
  if(status===429)return Math.min(5*60_000,30_000*Math.max(1,failures));
  if(status===408||status===409||status===425||(status!==null&&status>=500)){
    return Math.min(2*60_000,12_000*Math.max(1,failures));
  }
  if(/abort|timeout|timed out|econnreset|fetch failed|network/.test(text)){
    return Math.min(2*60_000,15_000*Math.max(1,failures));
  }
  if(status!==null&&status>=400)return 60_000;
  return Math.min(60_000,8_000*Math.max(1,failures));
}

export function recordProviderSuccess(provider:ProviderHealthIdentity,now=Date.now()){
  const key=keyOf(provider);
  const previous=health.get(key);
  health.set(key,{
    failures:0,
    cooldownUntil:0,
    lastFailureAt:previous?.lastFailureAt||0,
    lastSuccessAt:now,
    lastStatus:null
  });
}

export function recordProviderFailure(provider:ProviderHealthIdentity,error:unknown,now=Date.now()){
  const key=keyOf(provider);
  const previous=health.get(key);
  const failures=Math.min(12,(previous?.failures||0)+1);
  const status=statusFrom(error);
  health.set(key,{
    failures,
    cooldownUntil:now+cooldownMs(status,failures,error),
    lastFailureAt:now,
    lastSuccessAt:previous?.lastSuccessAt||0,
    lastStatus:status
  });
}

export function providerHealthState(provider:ProviderHealthIdentity,now=Date.now()){
  const state=health.get(keyOf(provider))||{
    failures:0,cooldownUntil:0,lastFailureAt:0,lastSuccessAt:0,lastStatus:null
  };
  return {
    ...state,
    cooling:state.cooldownUntil>now,
    retryInMs:Math.max(0,state.cooldownUntil-now)
  };
}

export function rankHealthyProviders<T extends ProviderHealthIdentity>(providers:T[],now=Date.now()){
  if(providers.length<=1)return [...providers];
  const scored=providers.map((provider,index)=>{
    const state=providerHealthState(provider,now);
    return {provider,index,state};
  });
  const ready=scored.filter(x=>!x.state.cooling);
  const pool=ready.length?ready:scored;
  return pool
    .sort((a,b)=>{
      if(a.state.cooling!==b.state.cooling)return a.state.cooling?1:-1;
      if(a.state.cooldownUntil!==b.state.cooldownUntil)return a.state.cooldownUntil-b.state.cooldownUntil;
      if(a.state.failures!==b.state.failures)return a.state.failures-b.state.failures;
      return a.index-b.index;
    })
    .map(x=>x.provider);
}

export function providerHealthSnapshot<T extends ProviderHealthIdentity>(providers:T[],now=Date.now()){
  return providers.map(provider=>({
    name:provider.name,
    model:provider.model,
    ...providerHealthState(provider,now)
  }));
}

export function resetProviderHealthForTests(){
  health.clear();
}
