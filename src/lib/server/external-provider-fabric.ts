import {providerEndpointAllowed} from '@/lib/chat-trust-boundary';

export type ExternalProviderProtocol='openai'|'anthropic'|'responses';

export interface ExternalProviderSpec{
  name:string;
  base:string;
  key:string;
  model:string;
  protocol?:ExternalProviderProtocol;
  headers?:Record<string,string>;
  source:string;
  costHint:'local'|'free-tier'|'metered'|'unknown';
}

function truthy(value:string|undefined){
  return /^(?:1|true|yes|on)$/i.test(String(value||'').trim());
}

function normalizeBase(raw:string,appendV1=true){
  const value=String(raw||'').trim().replace(/\/$/,'');
  if(!value)return'';
  if(!appendV1)return value;
  return /\/v1$/i.test(value)?value:value+'/v1';
}

function reachable(base:string){
  if(!base)return false;
  if(!providerEndpointAllowed(base,Boolean(process.env.VERCEL)))return false;
  try{
    const host=new URL(base).hostname.toLowerCase();
    if(process.env.VERCEL&&(host==='localhost'||host==='127.0.0.1'||host==='0.0.0.0'||host==='::1'))return false;
    return true;
  }catch{return false}
}

function add(out:ExternalProviderSpec[],provider:ExternalProviderSpec){
  if(!provider.base||!provider.model||!reachable(provider.base))return;
  const identity=provider.base.replace(/\/$/,'')+'|'+provider.model+'|'+String(provider.protocol||'openai');
  if(out.some(x=>x.base.replace(/\/$/,'')+'|'+x.model+'|'+String(x.protocol||'openai')===identity))return;
  out.push(provider);
}

function fromJson(raw:string){
  if(!raw.trim())return[] as ExternalProviderSpec[];
  let rows:any[]=[];
  try{
    const parsed=JSON.parse(raw);
    rows=Array.isArray(parsed)?parsed:[];
  }catch{return[]}
  return rows.slice(0,30).flatMap((row:any)=>{
    const name=String(row?.name||'').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(0,48);
    const base=normalizeBase(String(row?.base||''),row?.appendV1!==false);
    const model=String(row?.model||'').trim().slice(0,160);
    const keyEnv=String(row?.keyEnv||'').trim();
    const directKey=truthy(process.env.PREDICTLM_ALLOW_INLINE_EXTRA_PROVIDER_KEYS)?String(row?.key||'').trim():'';
    const key=keyEnv?String(process.env[keyEnv]||'').trim():directKey;
    const protocol:ExternalProviderProtocol=row?.protocol==='anthropic'||row?.protocol==='responses'?row.protocol:'openai';
    if(!name||!base||!model||!key)return[];
    return [{
      name,
      base,
      key,
      model,
      protocol,
      source:'PREDICTLM_EXTRA_PROVIDERS_JSON',
      costHint:row?.costHint==='local'||row?.costHint==='free-tier'||row?.costHint==='metered'?row.costHint:'unknown',
      headers:row?.headers&&typeof row.headers==='object'
        ? Object.fromEntries(Object.entries(row.headers).slice(0,12).map(([k,v])=>[String(k),String(v)]))
        : undefined
    } satisfies ExternalProviderSpec];
  });
}

export function externalProviderSpecs(){
  const out:ExternalProviderSpec[]=[];

  // LocalCodeCli exposes OpenAI Responses and Anthropic Messages. PredictLM
  // uses the Responses path because it maps cleanly to host-neutral messages.
  if(process.env.LOCALCODE_BASE_URL&&process.env.LOCALCODE_MODEL){
    add(out,{
      name:'localcode',
      base:normalizeBase(process.env.LOCALCODE_BASE_URL),
      key:String(process.env.LOCALCODE_API_KEY||'localcode').trim(),
      model:process.env.LOCALCODE_MODEL,
      protocol:'responses',
      source:'Corporationakht/LocalCodeCli',
      costHint:'local'
    });
  }

  // GPTOSS proxy is opt-in only. Point this at a Worker you control. PredictLM
  // never auto-uses the public upstream discovered in the repository source.
  if(process.env.GPTOSS_PROXY_BASE_URL){
    add(out,{
      name:'gptoss',
      base:normalizeBase(process.env.GPTOSS_PROXY_BASE_URL),
      key:String(process.env.GPTOSS_PROXY_API_KEY||'gptoss-local').trim(),
      model:String(process.env.GPTOSS_PROXY_MODEL||'gpt-oss-20b').trim(),
      protocol:'openai',
      source:'junioralive/gptoss-proxy',
      costHint:'free-tier'
    });
  }

  // Puter Pool is accepted only as an already-running endpoint owned/administered
  // by the user. PredictLM does not create accounts, scrape tokens or manage pool rotation.
  if(process.env.PUTER_POOL_BASE_URL&&process.env.PUTER_POOL_MODEL){
    add(out,{
      name:'puterpool',
      base:normalizeBase(process.env.PUTER_POOL_BASE_URL),
      key:String(process.env.PUTER_POOL_API_KEY||'puter-local').trim(),
      model:process.env.PUTER_POOL_MODEL,
      protocol:'openai',
      source:'Parithosh-Varma/puter-pool',
      costHint:'local'
    });
  }

  for(const row of fromJson(String(process.env.PREDICTLM_EXTRA_PROVIDERS_JSON||'')))add(out,row);
  return out;
}

export const FREE_LLM_ENV_PRESETS=[
  {name:'mistral',base:'https://api.mistral.ai/v1',keyEnv:'MISTRAL_API_KEY',modelEnv:'MISTRAL_MODEL'},
  {name:'huggingface',base:'https://router.huggingface.co/v1',keyEnv:'HUGGINGFACE_API_KEY',modelEnv:'HUGGINGFACE_MODEL'},
  {name:'together',base:'https://api.together.xyz/v1',keyEnv:'TOGETHER_API_KEY',modelEnv:'TOGETHER_MODEL'},
  {name:'fireworks',base:'https://api.fireworks.ai/inference/v1',keyEnv:'FIREWORKS_API_KEY',modelEnv:'FIREWORKS_MODEL'},
  {name:'sambanova',base:'https://api.sambanova.ai/v1',keyEnv:'SAMBANOVA_API_KEY',modelEnv:'SAMBANOVA_MODEL'},
  {name:'cerebras',base:'https://api.cerebras.ai/v1',keyEnv:'CEREBRAS_API_KEY',modelEnv:'CEREBRAS_MODEL'},
  {name:'deepinfra',base:'https://api.deepinfra.com/v1/openai',keyEnv:'DEEPINFRA_API_KEY',modelEnv:'DEEPINFRA_MODEL'},
  {name:'requesty',base:'https://router.requesty.ai/v1',keyEnv:'REQUESTY_API_KEY',modelEnv:'REQUESTY_MODEL'},
  {name:'modelscope',base:'https://api-inference.modelscope.cn/v1',keyEnv:'MODELSCOPE_API_KEY',modelEnv:'MODELSCOPE_MODEL'},
  {name:'siliconflow',base:'https://api.siliconflow.com/v1',keyEnv:'SILICONFLOW_API_KEY',modelEnv:'SILICONFLOW_MODEL'},
  {name:'nebius',base:'https://api.tokenfactory.nebius.com/v1',keyEnv:'NEBIUS_API_KEY',modelEnv:'NEBIUS_MODEL'},
  {name:'novita',base:'https://api.novita.ai/v3/openai',keyEnv:'NOVITA_API_KEY',modelEnv:'NOVITA_MODEL'},
  {name:'scaleway',base:'https://api.scaleway.ai/v1',keyEnv:'SCALEWAY_API_KEY',modelEnv:'SCALEWAY_MODEL'},
  {name:'venice',base:'https://api.venice.ai/api/v1',keyEnv:'VENICE_API_KEY',modelEnv:'VENICE_MODEL'},
  {name:'friendli',base:'https://inference.friendli.ai/v1',keyEnv:'FRIENDLI_API_KEY',modelEnv:'FRIENDLI_MODEL'},
  {name:'inference-net',base:'https://api.inference.net/v1',keyEnv:'INFERENCE_NET_API_KEY',modelEnv:'INFERENCE_NET_MODEL'},
  {name:'llm7',base:'https://api.llm7.io/v1',keyEnv:'LLM7_API_KEY',modelEnv:'LLM7_MODEL'},
  {name:'hetzner',base:'https://inference.hetzner.com/api/v1',keyEnv:'HETZNER_API_KEY',modelEnv:'HETZNER_MODEL'},
  {name:'nous',base:'https://inference-api.nousresearch.com/v1',keyEnv:'NOUS_API_KEY',modelEnv:'NOUS_MODEL'},
  {name:'ollama-cloud',base:'https://ollama.com/v1',keyEnv:'OLLAMA_CLOUD_API_KEY',modelEnv:'OLLAMA_CLOUD_MODEL'}
] as const;

export function freeLlmPresetProviders(){
  const out:ExternalProviderSpec[]=[];
  for(const preset of FREE_LLM_ENV_PRESETS){
    const key=String(process.env[preset.keyEnv]||'').trim();
    const model=String(process.env[preset.modelEnv]||'').trim();
    if(!key||!model)continue;
    add(out,{
      name:preset.name,
      base:preset.base,
      key,
      model,
      protocol:'openai',
      source:'nejib1/Free-LLM',
      costHint:'free-tier'
    });
  }
  return out;
}

export function allExternalProviderSpecs(){
  return [...externalProviderSpecs(),...freeLlmPresetProviders()];
}

export const PUBLIC_API_DISCOVERY_SOURCE={
  repo:'spinov001-art/free-apis-list',
  purpose:'Discovery catalog for no-key public data APIs. Entries are not auto-executed merely because they appear in the list.',
  categories:['research','weather','finance','government','books','development','geo','science','social','security']
};
