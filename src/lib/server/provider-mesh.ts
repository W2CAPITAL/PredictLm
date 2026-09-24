import { rankHealthyProviders, recordProviderFailure, recordProviderSuccess } from '@/lib/server/provider-health';

export type ProviderProtocol='openai'|'anthropic';
export interface ProviderSpec{
  name:string;
  base:string;
  key:string;
  model:string;
  headers?:Record<string,string>;
  protocol?:ProviderProtocol;
}
export interface ProviderMessage{role:'system'|'user'|'assistant';content:string}

function loopbackBase(base:string){
  try{
    const host=new URL(base).hostname.toLowerCase();
    return host==='127.0.0.1'||host==='localhost'||host==='0.0.0.0'||host==='::1';
  }catch{return false}
}
function serverCanReach(base:string){
  return !(process.env.VERCEL&&loopbackBase(base));
}

export function isAuxiliaryLocalProvider(provider:ProviderSpec){
  return provider.name==='ollama'||provider.name==='freellmapi'||loopbackBase(provider.base);
}

export function configuredProviders(){
  const out:ProviderSpec[]=[];
  const push=(p:ProviderSpec)=>{
    if(!p.base||!p.key||!p.model)return;
    const identity=p.base.replace(/\/$/,'')+'|'+p.model;
    if(!out.some(x=>x.base.replace(/\/$/,'')+'|'+x.model===identity))out.push(p);
  };

  if(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL){
    push({name:'server',base:process.env.AI_BASE_URL,key:process.env.AI_API_KEY,model:process.env.AI_MODEL});
  }
  if(process.env.OPENCODE_API_KEY){
    push({name:'opencode',base:process.env.OPENCODE_BASE_URL||'https://opencode.ai/zen/v1',key:process.env.OPENCODE_API_KEY,model:process.env.OPENCODE_MODEL||'nemotron-3.5-lightning-free'});
  }
  if(process.env.NVIDIA_API_KEY){
    push({name:'nvidia',base:process.env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1',key:process.env.NVIDIA_API_KEY,model:process.env.NVIDIA_MODEL||'nvidia/nemotron-3.5-lightning-30b-a3b'});
  }
  if(process.env.DEEPSEEK_API_KEY){
    push({name:'deepseek',base:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com/v1',key:process.env.DEEPSEEK_API_KEY,model:process.env.DEEPSEEK_MODEL||'deepseek-chat'});
  }
  if(process.env.KIMI_API_KEY){
    push({name:'kimi',base:process.env.KIMI_BASE_URL||'https://api.moonshot.ai/v1',key:process.env.KIMI_API_KEY,model:process.env.KIMI_MODEL||'kimi-k2.5'});
  }
  if(process.env.ZAI_API_KEY){
    push({name:'zai',base:process.env.ZAI_BASE_URL||'https://api.z.ai/api/paas/v4',key:process.env.ZAI_API_KEY,model:process.env.ZAI_MODEL||'glm-4.6'});
  }
  if(process.env.MINIMAX_API_KEY){
    push({name:'minimax',base:process.env.MINIMAX_BASE_URL||'https://api.minimax.io/v1',key:process.env.MINIMAX_API_KEY,model:process.env.MINIMAX_MODEL||'MiniMax-M3'});
  }
  if(process.env.GEMINI_API_KEY){
    push({name:'gemini',base:process.env.GEMINI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta/openai',key:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL||'gemini-3.8-flash'});
  }
  if(process.env.GROQ_API_KEY&&process.env.GROQ_MODEL){
    push({name:'groq',base:'https://api.groq.com/openai/v1',key:process.env.GROQ_API_KEY,model:process.env.GROQ_MODEL});
  }
  if(process.env.OPENROUTER_API_KEY&&process.env.OPENROUTER_MODEL){
    push({name:'openrouter',base:'https://openrouter.ai/api/v1',key:process.env.OPENROUTER_API_KEY,model:process.env.OPENROUTER_MODEL,headers:{'X-Title':'PredictLM'}});
  }
  if(process.env.ANTHROPIC_API_KEY){
    push({name:'anthropic',base:process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com/v1',key:process.env.ANTHROPIC_API_KEY,model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6',protocol:'anthropic'});
  }
  if(process.env.ARK_API_KEY&&process.env.ARK_MODEL){
    push({name:'ark',base:process.env.ARK_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3',key:process.env.ARK_API_KEY,model:process.env.ARK_MODEL});
  }
  if(process.env.FREELLMAPI_BASE_URL&&process.env.FREELLMAPI_API_KEY){
    const raw=process.env.FREELLMAPI_BASE_URL.replace(/\/$/,'');
    const base=raw.endsWith('/v1')?raw:raw+'/v1';
    if(serverCanReach(base))push({name:'freellmapi',base,key:process.env.FREELLMAPI_API_KEY,model:process.env.FREELLMAPI_MODEL||'auto'});
  }
  if(process.env.OLLAMA_BASE_URL&&process.env.OLLAMA_MODEL){
    const raw=process.env.OLLAMA_BASE_URL.replace(/\/$/,'');
    const base=raw.endsWith('/v1')?raw:raw+'/v1';
    if(serverCanReach(base))push({name:'ollama',base,key:process.env.OLLAMA_API_KEY||'ollama',model:process.env.OLLAMA_MODEL});
  }

  const preferred=(process.env.PREDICTLM_PROVIDER_ORDER||'server,anthropic,gemini,deepseek,kimi,zai,nvidia,groq,openrouter,opencode,minimax,ark,freellmapi,ollama')
    .split(',').map(x=>x.trim()).filter(Boolean);
  const rank=(name:string)=>{const idx=preferred.indexOf(name);return idx<0?999:idx};
  return out.sort((a,b)=>rank(a.name)-rank(b.name));
}

type TaskClass='code'|'creative'|'research'|'reasoning'|'general';
function taskClass(prompt:string,deep=false):TaskClass{
  const q=String(prompt||'').toLowerCase();
  if(/\b(code|codigo|código|typescript|javascript|python|react|next|bug|erro|refator|arquitet|build|api|database|banco)\b/.test(q))return 'code';
  if(/\b(imagem|image|video|vídeo|design|personagem|character|cinema|storyboard|visual)\b/.test(q))return 'creative';
  if(/\b(pesquis|research|fontes|sources|atual|recent|documenta[cç][aã]o)\b/.test(q))return 'research';
  if(deep||/\b(analise|análise|estrateg|decis|compare|risco|reason)\b/.test(q))return 'reasoning';
  return 'general';
}

function modelBonus(model:string,task:TaskClass){
  const m=model.toLowerCase();
  let score=0;
  if(/claude|opus|sonnet/.test(m))score+=task==='code'||task==='reasoning'||task==='creative'?16:10;
  if(/gemini/.test(m))score+=task==='research'||task==='creative'||task==='general'?14:9;
  if(/deepseek/.test(m))score+=task==='code'||task==='reasoning'?14:8;
  if(/grok/.test(m))score+=task==='general'||task==='research'||task==='creative'?12:8;
  if(/nemotron/.test(m))score+=task==='code'||task==='reasoning'?10:6;
  if(/kimi/.test(m))score+=task==='research'||task==='general'?9:6;
  if(/glm/.test(m))score+=7;
  if(/mini|lite|free/.test(m))score-=3;
  return score;
}

export function rankProviders(prompt:string,deep=false){
  const providers=rankHealthyProviders(configuredProviders().filter(provider=>!isAuxiliaryLocalProvider(provider)));
  const task=taskClass(prompt,deep);
  return providers
    .map((provider,index)=>({provider,index,score:modelBonus(provider.model,task)-index*0.15}))
    .sort((a,b)=>b.score-a.score)
    .map(x=>x.provider);
}

export async function callProviderText(
  provider:ProviderSpec,
  messages:ProviderMessage[],
  options:{deep?:boolean;timeoutMs?:number;maxTokens?:number;temperature?:number}={}
){
  const deep=Boolean(options.deep);
  const controller=new AbortController();
  const timeoutMs=Math.max(1000,options.timeoutMs||16000);
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    if(provider.protocol==='anthropic'){
      const system=messages.filter(x=>x.role==='system').map(x=>x.content).join('\n\n');
      const dialog=messages.filter(x=>x.role!=='system').map(x=>({role:x.role as 'user'|'assistant',content:x.content}));
      const response=await fetch(provider.base.replace(/\/$/,'')+'/messages',{
        method:'POST',
        signal:controller.signal,
        headers:{
          'Content-Type':'application/json',
          'x-api-key':provider.key,
          'anthropic-version':'2023-06-01',
          ...(provider.headers||{})
        },
        body:JSON.stringify({
          model:provider.model,
          system,
          messages:dialog,
          max_tokens:options.maxTokens||(deep?2200:1400),
          temperature:options.temperature??(deep?0.2:0.35)
        })
      });
      const raw=await response.text();
      if(!response.ok)throw new Error(provider.name+' '+response.status+' '+raw.slice(0,260));
      let data:any={};try{data=JSON.parse(raw)}catch{}
      const text=Array.isArray(data?.content)
        ? data.content.filter((x:any)=>x?.type==='text').map((x:any)=>x.text).join('\n').trim()
        : '';
      if(!text)throw new Error(provider.name+' empty response');
      recordProviderSuccess(provider);
      return text;
    }

    const response=await fetch(provider.base.replace(/\/$/,'')+'/chat/completions',{
      method:'POST',
      signal:controller.signal,
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+provider.key,
        ...(provider.headers||{})
      },
      body:JSON.stringify({
        model:provider.model,
        messages,
        temperature:options.temperature??(deep?0.2:0.35),
        max_tokens:options.maxTokens||(deep?2200:1400),
        stream:false
      })
    });
    const raw=await response.text();
    if(!response.ok)throw new Error(provider.name+' '+response.status+' '+raw.slice(0,260));
    let data:any={};try{data=JSON.parse(raw)}catch{}
    const text=String(data?.choices?.[0]?.message?.content||data?.response||'').trim();
    if(!text)throw new Error(provider.name+' empty response');
    recordProviderSuccess(provider);
    return text;
  }catch(error){
    recordProviderFailure(provider,error);
    throw error;
  }finally{clearTimeout(timer)}
}

export function parseJsonObject<T=any>(raw:string):T|null{
  const fenced=String(raw||'').match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/i)?.[1];
  const candidate=fenced||String(raw||'').match(/\{[\s\S]*\}/)?.[0]||'';
  if(!candidate)return null;
  try{return JSON.parse(candidate) as T}catch{return null}
}
