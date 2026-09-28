export type ProviderBudgetSurface='chat'|'stream'|'research'|'media'|'background';

type BudgetState={day:string;count:number};

declare global{
  var __predictlmProviderBudget:Map<string,BudgetState>|undefined;
}
const budget=globalThis.__predictlmProviderBudget||(globalThis.__predictlmProviderBudget=new Map());

function intEnv(name:string,fallback:number,min:number,max:number){
  const raw=Number(process.env[name]);
  return Number.isFinite(raw)?Math.max(min,Math.min(max,Math.floor(raw))):fallback;
}

export function apiSaverMode(){
  const raw=String(process.env.PREDICTLM_API_SAVER_MODE||'strict').trim().toLowerCase();
  return raw==='off'||raw==='balanced'||raw==='strict'?raw:'strict';
}

export function providerAttemptLimit(surface:ProviderBudgetSurface,deep=false){
  const explicit=surface==='stream'
    ? process.env.PREDICTLM_STREAM_PROVIDER_MAX_ATTEMPTS
    : process.env.PREDICTLM_PROVIDER_MAX_ATTEMPTS;
  const parsed=Number(explicit);
  if(Number.isFinite(parsed))return Math.max(1,Math.min(6,Math.floor(parsed)));
  const mode=apiSaverMode();
  if(mode==='strict')return 1;
  if(mode==='balanced')return deep?2:1;
  return deep?3:2;
}

export function providerDailyCap(){
  return intEnv('PREDICTLM_PROVIDER_DAILY_REQUEST_CAP',apiSaverMode()==='strict'?120:300,1,100000);
}

function utcDay(now:number){
  return new Date(now).toISOString().slice(0,10);
}

export function reserveProviderCall(provider:{name:string;base:string;model:string},surface:ProviderBudgetSurface,now=Date.now()){
  if(process.env.NODE_ENV==='test')return {allowed:true,remaining:999999,reason:''};
  const day=utcDay(now);
  let host='';
  try{host=new URL(provider.base).host.toLowerCase()}catch{host=provider.base.toLowerCase()}
  const key=[surface,provider.name,host,provider.model].join('|');
  const prev=budget.get(key);
  const state=!prev||prev.day!==day?{day,count:0}:{...prev};
  const cap=providerDailyCap();
  if(state.count>=cap){
    budget.set(key,state);
    return {allowed:false,remaining:0,reason:'daily-cap'};
  }
  state.count+=1;
  budget.set(key,state);
  return {allowed:true,remaining:Math.max(0,cap-state.count),reason:''};
}

export function providerBudgetSnapshot(now=Date.now()){
  const day=utcDay(now);
  return [...budget.entries()]
    .filter(([,state])=>state.day===day)
    .map(([key,state])=>({key,count:state.count,cap:providerDailyCap(),remaining:Math.max(0,providerDailyCap()-state.count)}));
}

export function resetProviderBudgetForTests(){
  budget.clear();
}


const LOCAL_OR_FREE=/^(?:localcodecli|puter-pool|freellmapi|ollama|gptoss-proxy|.*-free|groq|opencode)$/;

export function providerSaverBonus(name:string){
  const mode=apiSaverMode();
  if(mode==='off')return 0;
  const n=String(name||'').toLowerCase();
  if(/^(?:localcodecli|puter-pool|freellmapi|ollama)$/.test(n))return mode==='strict'?120:60;
  if(LOCAL_OR_FREE.test(n))return mode==='strict'?80:35;
  return 0;
}

export function providerLooksSaverFriendly(name:string){
  return LOCAL_OR_FREE.test(String(name||'').toLowerCase());
}
