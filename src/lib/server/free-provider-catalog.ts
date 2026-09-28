export interface FreeProviderEnvSpec{
  name:string;
  keyEnv:string;
  baseEnv:string;
  modelEnv:string;
  defaultBase:string;
  defaultModel:string;
  optionalKey?:boolean;
  source:string;
}

export const FREE_PROVIDER_ENV_SPECS:FreeProviderEnvSpec[]=[
  {name:'mistral-free',keyEnv:'MISTRAL_API_KEY',baseEnv:'MISTRAL_BASE_URL',modelEnv:'MISTRAL_MODEL',defaultBase:'https://api.mistral.ai/v1',defaultModel:'mistral-small-latest',source:'nejib1/Free-LLM'},
  {name:'cerebras-free',keyEnv:'CEREBRAS_API_KEY',baseEnv:'CEREBRAS_BASE_URL',modelEnv:'CEREBRAS_MODEL',defaultBase:'https://api.cerebras.ai/v1',defaultModel:'llama-3.3-70b',source:'nejib1/Free-LLM'},
  {name:'sambanova-free',keyEnv:'SAMBANOVA_API_KEY',baseEnv:'SAMBANOVA_BASE_URL',modelEnv:'SAMBANOVA_MODEL',defaultBase:'https://api.sambanova.ai/v1',defaultModel:'Meta-Llama-3.3-70B-Instruct',source:'nejib1/Free-LLM'},
  {name:'deepinfra-free',keyEnv:'DEEPINFRA_API_KEY',baseEnv:'DEEPINFRA_BASE_URL',modelEnv:'DEEPINFRA_MODEL',defaultBase:'https://api.deepinfra.com/v1/openai',defaultModel:'meta-llama/Llama-3.3-70B-Instruct',source:'nejib1/Free-LLM'},
  {name:'siliconflow-free',keyEnv:'SILICONFLOW_API_KEY',baseEnv:'SILICONFLOW_BASE_URL',modelEnv:'SILICONFLOW_MODEL',defaultBase:'https://api.siliconflow.com/v1',defaultModel:'Qwen/Qwen2.5-7B-Instruct',source:'nejib1/Free-LLM'},
  {name:'requesty-free',keyEnv:'REQUESTY_API_KEY',baseEnv:'REQUESTY_BASE_URL',modelEnv:'REQUESTY_MODEL',defaultBase:'https://router.requesty.ai/v1',defaultModel:'openrouter/auto',source:'nejib1/Free-LLM'},
  {name:'venice-free',keyEnv:'VENICE_API_KEY',baseEnv:'VENICE_BASE_URL',modelEnv:'VENICE_MODEL',defaultBase:'https://api.venice.ai/api/v1',defaultModel:'llama-3.3-70b',source:'nejib1/Free-LLM'},
  {name:'nous-free',keyEnv:'NOUS_API_KEY',baseEnv:'NOUS_BASE_URL',modelEnv:'NOUS_MODEL',defaultBase:'https://inference-api.nousresearch.com/v1',defaultModel:'Hermes-4-70B',source:'nejib1/Free-LLM'},
  {name:'hetzner-free',keyEnv:'HETZNER_API_KEY',baseEnv:'HETZNER_BASE_URL',modelEnv:'HETZNER_MODEL',defaultBase:'https://inference.hetzner.com/api/v1',defaultModel:'Qwen/Qwen3-32B',source:'nejib1/Free-LLM'},
  {name:'inference-net-free',keyEnv:'INFERENCE_NET_API_KEY',baseEnv:'INFERENCE_NET_BASE_URL',modelEnv:'INFERENCE_NET_MODEL',defaultBase:'https://api.inference.net/v1',defaultModel:'meta-llama/Llama-3.1-70B-Instruct',source:'nejib1/Free-LLM'},
  {name:'modelscope-free',keyEnv:'MODELSCOPE_API_KEY',baseEnv:'MODELSCOPE_BASE_URL',modelEnv:'MODELSCOPE_MODEL',defaultBase:'https://api-inference.modelscope.cn/v1',defaultModel:'Qwen/Qwen2.5-72B-Instruct',source:'nejib1/Free-LLM'},
  {name:'llm7-free',keyEnv:'LLM7_API_KEY',baseEnv:'LLM7_BASE_URL',modelEnv:'LLM7_MODEL',defaultBase:'https://api.llm7.io/v1',defaultModel:'deepseek-r1',optionalKey:true,source:'nejib1/Free-LLM'}
];

export function configuredFreeProviders(env:NodeJS.ProcessEnv=process.env){
  return FREE_PROVIDER_ENV_SPECS.flatMap(spec=>{
    const enabled=spec.optionalKey
      ? /^(?:1|true|yes|on)$/i.test(String(env.LLM7_ENABLED||''))||Boolean(env[spec.keyEnv])
      : Boolean(env[spec.keyEnv]);
    if(!enabled)return[];
    return [{
      name:spec.name,
      base:String(env[spec.baseEnv]||spec.defaultBase).replace(/\/$/,''),
      key:String(env[spec.keyEnv]||'free'),
      model:String(env[spec.modelEnv]||spec.defaultModel),
      source:spec.source
    }];
  });
}

export function configuredBridgeProviders(env:NodeJS.ProcessEnv=process.env){
  const out:Array<{name:string;base:string;key:string;model:string;source:string}>=[];
  const add=(name:string,base:string|undefined,key:string|undefined,model:string|undefined,source:string,defaultModel:string)=>{
    if(!base||!model)return;
    out.push({name,base:base.replace(/\/$/,'').replace(/\/v1$/,'')+'/v1',key:key||'local',model:model||defaultModel,source});
  };
  add('localcodecli',env.LOCALCODECLI_BASE_URL,env.LOCALCODECLI_API_KEY,env.LOCALCODECLI_MODEL,'Corporationakht/LocalCodeCli','auto');
  add('puter-pool',env.PUTER_POOL_BASE_URL,env.PUTER_POOL_API_KEY,env.PUTER_POOL_MODEL,'Parithosh-Varma/puter-pool','gpt-4o-mini');
  add('gptoss-proxy',env.GPTOSS_PROXY_BASE_URL,env.GPTOSS_PROXY_API_KEY,env.GPTOSS_PROXY_MODEL,'junioralive/gptoss-proxy','gpt-oss-20b');
  return out;
}
