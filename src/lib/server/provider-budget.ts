export type BudgetProvider={
  name:string;
  model?:string;
  base?:string;
};

export type ProviderBudgetMode='conservative'|'balanced'|'quality'|'unlimited';

type LedgerRow={
  day:string;
  calls:number;
  estimatedTokens:number;
};

declare global{
  var __predictlmProviderBudgetLedger:Map<string,LedgerRow>|undefined;
}

const ledger=globalThis.__predictlmProviderBudgetLedger
  ||(globalThis.__predictlmProviderBudgetLedger=new Map<string,LedgerRow>());

function intEnv(name:string,fallback:number,min=0,max=1_000_000){
  const raw=Number(process.env[name]);
  if(!Number.isFinite(raw))return fallback;
  return Math.max(min,Math.min(max,Math.floor(raw)));
}

function boolEnv(name:string,fallback=false){
  const raw=String(process.env[name]||'').trim();
  if(!raw)return fallback;
  return /^(?:1|true|yes|on)$/i.test(raw);
}

function utcDay(now=Date.now()){
  return new Date(now).toISOString().slice(0,10);
}

export function providerBudgetMode():ProviderBudgetMode{
  const raw=String(process.env.PREDICTLM_API_BUDGET_MODE||'conservative').trim().toLowerCase();
  return raw==='balanced'||raw==='quality'||raw==='unlimited'?raw:'conservative';
}

export function providerCostClass(provider:BudgetProvider){
  const name=String(provider.name||'').toLowerCase();
  const model=String(provider.model||'').toLowerCase();
  if(['ollama','freellmapi','localcode','gptoss','puterpool'].includes(name))return'local-or-free';
  if(/(?:^|[\/:._-])(free|local|lite)(?:$|[\/:._-])/.test(model))return'free-tier';
  if(['groq','opencode'].includes(name))return'free-tier';
  return'metered';
}

function modeDefaults(mode:ProviderBudgetMode){
  if(mode==='unlimited')return{total:99,metered:99,providerDaily:0,sessionDaily:0,review:true,repair:true};
  if(mode==='quality')return{total:4,metered:3,providerDaily:120,sessionDaily:180,review:true,repair:true};
  if(mode==='balanced')return{total:3,metered:2,providerDaily:80,sessionDaily:120,review:false,repair:true};
  return{total:2,metered:1,providerDaily:50,sessionDaily:80,review:false,repair:false};
}

function ledgerRow(key:string,now=Date.now()){
  const day=utcDay(now);
  const current=ledger.get(key);
  if(!current||current.day!==day){
    const fresh={day,calls:0,estimatedTokens:0};
    ledger.set(key,fresh);
    return fresh;
  }
  return current;
}

function providerKey(provider:BudgetProvider){
  return [String(provider.name||'unknown'),String(provider.model||'unknown')].join('|');
}

export function estimateProviderTokens(messages:Array<{content?:string}>|undefined,maxOutputTokens=1000){
  const chars=(messages||[]).reduce((sum,row)=>sum+String(row?.content||'').length,0);
  return Math.max(1,Math.ceil(chars/4)+Math.max(1,Math.floor(maxOutputTokens||0)));
}

export type ProviderTurnBudget={
  scope:string;
  mode:ProviderBudgetMode;
  maxTotalCalls:number;
  maxMeteredCalls:number;
  usedTotalCalls:number;
  usedMeteredCalls:number;
  reserve:(provider:BudgetProvider,estimatedTokens?:number,purpose?:string)=>{ok:true}|{ok:false;reason:string};
  snapshot:()=>Record<string,unknown>;
};

export function createProviderTurnBudget(scope='anonymous'):ProviderTurnBudget{
  const mode=providerBudgetMode();
  const defaults=modeDefaults(mode);
  const maxTotalCalls=intEnv('PREDICTLM_MAX_REMOTE_CALLS_PER_TURN',defaults.total,1,20);
  const maxMeteredCalls=intEnv('PREDICTLM_MAX_METERED_CALLS_PER_TURN',defaults.metered,0,20);
  const providerDailyCap=intEnv('PREDICTLM_PROVIDER_SOFT_DAILY_CALL_CAP',defaults.providerDaily,0,10000);
  const sessionDailyCap=intEnv('PREDICTLM_SESSION_DAILY_REMOTE_CALL_CAP',defaults.sessionDaily,0,10000);
  let usedTotalCalls=0;
  let usedMeteredCalls=0;
  const perTurn=new Map<string,number>();

  const api:ProviderTurnBudget={
    scope:String(scope||'anonymous').slice(0,120),
    mode,
    maxTotalCalls,
    maxMeteredCalls,
    get usedTotalCalls(){return usedTotalCalls},
    get usedMeteredCalls(){return usedMeteredCalls},
    reserve(provider,estimatedTokens=0,purpose='answer'){
      if(mode==='unlimited'){
        usedTotalCalls++;
        if(providerCostClass(provider)==='metered')usedMeteredCalls++;
        return{ok:true};
      }
      if(usedTotalCalls>=maxTotalCalls)return{ok:false,reason:'turn-total-call-budget'};
      const costClass=providerCostClass(provider);
      if(costClass==='metered'&&usedMeteredCalls>=maxMeteredCalls)return{ok:false,reason:'turn-metered-call-budget'};

      const pKey=providerKey(provider);
      const providerRow=ledgerRow('provider|'+pKey);
      if(providerDailyCap>0&&providerRow.calls>=providerDailyCap)return{ok:false,reason:'provider-soft-daily-call-cap'};

      const sessionRow=ledgerRow('session|'+api.scope);
      if(sessionDailyCap>0&&sessionRow.calls>=sessionDailyCap)return{ok:false,reason:'session-soft-daily-call-cap'};

      usedTotalCalls++;
      if(costClass==='metered')usedMeteredCalls++;
      perTurn.set(pKey,(perTurn.get(pKey)||0)+1);
      providerRow.calls++;
      providerRow.estimatedTokens+=Math.max(0,Math.floor(estimatedTokens||0));
      sessionRow.calls++;
      sessionRow.estimatedTokens+=Math.max(0,Math.floor(estimatedTokens||0));
      return{ok:true};
    },
    snapshot(){
      return{
        mode,
        maxTotalCalls,
        maxMeteredCalls,
        usedTotalCalls,
        usedMeteredCalls,
        agenticReview:agenticReviewEnabled(),
        repairCalls:repairCallsEnabled(),
        providers:[...perTurn.entries()].map(([provider,calls])=>({provider,calls}))
      };
    }
  };
  return api;
}

export function agenticReviewEnabled(){
  const mode=providerBudgetMode();
  const defaults=modeDefaults(mode);
  return boolEnv('PREDICTLM_ENABLE_AGENTIC_REVIEW',defaults.review);
}

export function repairCallsEnabled(){
  const mode=providerBudgetMode();
  const defaults=modeDefaults(mode);
  return boolEnv('PREDICTLM_ENABLE_REPAIR_CALLS',defaults.repair);
}

export function providerBudgetSnapshot(){
  const day=utcDay();
  return [...ledger.entries()]
    .filter(([,row])=>row.day===day)
    .map(([key,row])=>({key,...row}));
}

export function resetProviderBudgetForTests(){
  ledger.clear();
}
