import crypto from 'node:crypto';
import { githubKnowledgeContext, githubKnowledgeStats, retrieveGitHubKnowledge } from '@/lib/github-knowledge-engine';
import { compactText, optimizePromptPackage } from '@/lib/token-budget';
import { tutorSystemContext } from '@/lib/tutor-mode';
import { globalLearningContext } from '@/lib/global-learning';
import { deepLoopContext } from '@/lib/deep-loop-policy';
import { centumDecisionContext, parallaxContext } from '@/lib/decision-centum';
import { resolveConversationLanguage, languageSystemInstruction, type ConversationLanguage } from '@/lib/language-policy';
import { publicAnswerGate } from '@/lib/public-answer-gate';
import { classifyDomainEngines } from '@/lib/domain-engine-fabric';
import { humanAdversarialContext } from '@/lib/human-adversarial-lens';
import { digitalBrainContext } from '@/lib/digital-brain';
import { humanPresenceContext } from '@/lib/human-presence';
import { isScenarioSimulationRequest, predictLMMasterContext } from '@/lib/predictlm-master';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Msg={role:'user'|'assistant'|'system';content:string};
type Provider={name:string;base:string;key:string;model:string;headers?:Record<string,string>;protocol?:'openai'|'anthropic'};

declare global{
  var __predictlmChatCache:Map<string,{expires:number,value:any}>|undefined;
}

const cache=globalThis.__predictlmChatCache||(globalThis.__predictlmChatCache=new Map());
const PROVIDER_ATTEMPT_LIMIT=3;
const PROVIDER_TIMEOUT_MS=12000;
const REQUEST_BUDGET_MS=32000;

function providers():Provider[]{
  const out:Provider[]=[];
  const push=(p:Provider)=>{
    const key=p.base.replace(/\/$/,'')+'|'+p.model;
    if(!out.some(x=>x.base.replace(/\/$/,'')+'|'+x.model===key))out.push(p);
  };
  if(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL){
    push({name:'server',base:process.env.AI_BASE_URL,key:process.env.AI_API_KEY,model:process.env.AI_MODEL});
  }
  if(process.env.FREELLMAPI_BASE_URL&&process.env.FREELLMAPI_API_KEY){
    const freeBase=process.env.FREELLMAPI_BASE_URL.replace(/\/$/,'');
    push({
      name:'freellmapi',
      base:freeBase.endsWith('/v1')?freeBase:freeBase+'/v1',
      key:process.env.FREELLMAPI_API_KEY,
      model:process.env.FREELLMAPI_MODEL||'auto'
    });
  }
  if(process.env.OLLAMA_BASE_URL&&process.env.OLLAMA_MODEL){
    const ollamaBase=process.env.OLLAMA_BASE_URL.replace(/\/$/,'');
    push({
      name:'ollama',
      base:ollamaBase.endsWith('/v1')?ollamaBase:ollamaBase+'/v1',
      key:process.env.OLLAMA_API_KEY||'ollama',
      model:process.env.OLLAMA_MODEL
    });
  }
  if(process.env.OPENCODE_API_KEY){
    push({name:'opencode',base:process.env.OPENCODE_BASE_URL||'https://opencode.ai/zen/v1',key:process.env.OPENCODE_API_KEY,model:process.env.OPENCODE_MODEL||'nemotron-3.5-lightning-free'});
  }
  if(process.env.NVIDIA_API_KEY){
    push({name:'nvidia',base:process.env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1',key:process.env.NVIDIA_API_KEY,model:process.env.NVIDIA_MODEL||'nvidia/nemotron-3.5-lightning-30b-a3b'});
  }
  if(process.env.DEEPSEEK_API_KEY){
    push({name:'deepseek',base:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com/v1',key:process.env.DEEPSEEK_API_KEY,model:process.env.DEEPSEEK_MODEL||'deepseek-flash'});
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
  if(process.env.ANTHROPIC_API_KEY){
    push({name:'anthropic',base:process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com/v1',key:process.env.ANTHROPIC_API_KEY,model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6',protocol:'anthropic'});
  }
  if(process.env.ARK_API_KEY&&process.env.ARK_MODEL){
    push({name:'ark',base:process.env.ARK_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3',key:process.env.ARK_API_KEY,model:process.env.ARK_MODEL});
  }
  if(process.env.GROQ_API_KEY&&process.env.GROQ_MODEL){
    push({name:'groq',base:'https://api.groq.com/openai/v1',key:process.env.GROQ_API_KEY,model:process.env.GROQ_MODEL});
  }
  if(process.env.OPENROUTER_API_KEY&&process.env.OPENROUTER_MODEL){
    push({
      name:'openrouter',
      base:'https://openrouter.ai/api/v1',
      key:process.env.OPENROUTER_API_KEY,
      model:process.env.OPENROUTER_MODEL,
      headers:{'X-Title':'PredictLM'}
    });
  }
  const preferred=(process.env.PREDICTLM_PROVIDER_ORDER||'server,freellmapi,opencode,nvidia,deepseek,kimi,zai,minimax,gemini,groq,openrouter,anthropic,ark,ollama')
    .split(',').map(x=>x.trim()).filter(Boolean);
  const rank=(name:string)=>{const i=preferred.indexOf(name);return i<0?999:i};
  return out.sort((a,b)=>rank(a.name)-rank(b.name));
}

function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

function shouldUseGithubKnowledge(prompt:string){
  const q=normalize(prompt);
  if(/\b(github|repo|repository|codigo|code|software|typescript|javascript|python|react|next|api|backend|frontend|database|vercel|deploy|docker|mcp|bug|erro|arquitetura)\b/.test(q))return true;
  if(classifyDomainEngines(prompt).length)return true;
  if(/\b(datajud|djen|cnj|juridic|processo|lexis|graphrag|sgs|bacen|bcb|starlink|spacex|quant|qubit|netdata)\b/.test(q))return true;
  return false;
}

function volatileQuery(prompt:string){
  return /\b(hoje|agora|atual|noticia|notícias|news|preco|preço|cotacao|cotação|placar|resultado|tempo|weather)\b/i.test(prompt);
}

async function callProvider(provider:Provider,messages:Msg[],deep:boolean,timeoutMs=PROVIDER_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    if(provider.protocol==='anthropic'){
      const system=messages.filter(x=>x.role==='system').map(x=>x.content).join('\n\n');
      const dialog=messages.filter(x=>x.role!=='system').map(x=>({role:x.role as 'user'|'assistant',content:x.content}));
      const r=await fetch(provider.base.replace(/\/$/,'')+'/messages',{
        method:'POST',
        signal:controller.signal,
        headers:{
          'Content-Type':'application/json',
          'x-api-key':provider.key,
          'anthropic-version':'2023-06-01',
          ...(provider.headers||{})
        },
        body:JSON.stringify({model:provider.model,system,messages:dialog,max_tokens:deep?1800:1000})
      });
      const raw=await r.text();
      if(!r.ok)throw new Error(provider.name+' '+r.status+' '+raw.slice(0,240));
      let data:any={};
      try{data=JSON.parse(raw)}catch{}
      const content=Array.isArray(data?.content)
        ? data.content.filter((x:any)=>x?.type==='text').map((x:any)=>x.text).join('\n').trim()
        : '';
      if(!content)throw new Error(provider.name+' empty response');
      return content;
    }

    const body:any={
      model:provider.model,
      messages,
      temperature:deep?0.25:0.45,
      max_tokens:deep?1400:900,
      stream:false
    };
    if(provider.name==='nvidia'){
      body.chat_template_kwargs={enable_thinking:deep};
      if(deep)body.reasoning_budget=2048;
    }
    if(provider.name==='minimax')body.thinking={type:'disabled'};

    const r=await fetch(provider.base.replace(/\/$/,'')+'/chat/completions',{
      method:'POST',
      signal:controller.signal,
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+provider.key,
        ...(provider.headers||{})
      },
      body:JSON.stringify(body)
    });
    const raw=await r.text();
    if(!r.ok)throw new Error(provider.name+' '+r.status+' '+raw.slice(0,240));
    let data:any={};
    try{data=JSON.parse(raw)}catch{}
    const content=String(data?.choices?.[0]?.message?.content||data?.response||'').trim();
    if(!content)throw new Error(provider.name+' empty response');
    return content;
  }finally{clearTimeout(timer)}
}

export async function GET(){
  const configured=providers();
  return Response.json({
    available:configured.length>0,
    providers:configured.map(x=>({name:x.name,model:x.model})),
    count:configured.length
  },{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const prompt=String(body?.prompt||'').trim();
    const researchContext=String(body?.researchContext||'').trim().slice(0,16000);
    const localAdvisory=String(body?.localAdvisory||'').trim().slice(0,2200);
    const answerAnchor=String(body?.answerAnchor||'').trim().slice(0,5200);
    const brainContext=String(body?.brainContext||'').trim().slice(0,5200)||digitalBrainContext(prompt);
    if(!prompt)return Response.json({error:'prompt is required'},{status:400});

    const configured=providers();
    if(!configured.length){
      return Response.json({
        available:false,
        content:null,
        code:'NO_PROVIDER',
        message:'Nenhum provider server-side configurado; o cliente deve continuar para o próximo runtime local/core.'
      },{headers:{'Cache-Control':'no-store'}});
    }

    const rawHistory=(Array.isArray(body?.messages)?body.messages:[])
      .filter((x:any)=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string')
      .map((x:any)=>({role:x.role,content:String(x.content)})) as Msg[];
    const deep=Boolean(body?.deep)||isScenarioSimulationRequest(prompt);
    const language=(body?.language==='en'||body?.language==='pt-BR')
      ? body.language as ConversationLanguage
      : resolveConversationLanguage(prompt,rawHistory);
    const githubTopK=deep?5:3;
    const useGithub=shouldUseGithubKnowledge(prompt);
    const gh=useGithub?githubKnowledgeContext(prompt,githubTopK):'';
    const ghHits=useGithub?retrieveGitHubKnowledge(prompt,githubTopK):[];
    const stats=githubKnowledgeStats();
    const tutor=tutorSystemContext(prompt);
    const deepLoop=deep?deepLoopContext(prompt):'';
    const centum=centumDecisionContext(prompt);
    const parallax=parallaxContext(prompt);
    const globalLessons=globalLearningContext(prompt,deep?5:3);
    const humanLens=humanAdversarialContext(prompt);
    const humanPresence=humanPresenceContext(prompt);
    const masterContext=predictLMMasterContext(prompt,deep);
    const localInstructions=String(body?.instructions||'').slice(0,2200);
    const packed=optimizePromptPackage({
      messages:rawHistory,
      mode:deep?'lite':'full',
      sections:[
        {label:'Instruções persistentes do usuário',text:localInstructions,priority:8},
        {label:'Lições globais aprovadas',text:globalLessons,priority:7},
        {label:'Centum Decision Gate',text:centum,priority:10},
        {label:'Third Brain PARALLAX',text:parallax,priority:10},
        {label:'PredictLM Master',text:masterContext,priority:10},
        {label:'Human Presence',text:humanPresence,priority:10},
        {label:'Human Adversarial Lens',text:humanLens,priority:9},
        {label:'Digital Brain control layer',text:brainContext,priority:10},
        {label:'Deep Loop',text:deepLoop,priority:9},
        {label:'Tutor Mode',text:tutor,priority:6},
        {label:'Pesquisa web verificada',text:researchContext,priority:9},
        {label:'Parecer do cérebro local',text:localAdvisory,priority:8},
        {label:'Piso prático de resposta',text:answerAnchor,priority:9},
        {label:'GitHub Knowledge Engine',text:gh,priority:5}
      ].filter(x=>x.text)
    });
    const history=packed.messages as Msg[];
    const cacheKey=crypto.createHash('sha256').update(JSON.stringify({
      prompt:normalize(prompt),
      history:history.slice(-4).map(x=>[x.role,normalize(x.content).slice(0,1200)]),
      deep,
      knowledgeVersion:stats.version,
      providers:configured.map(x=>x.name+':'+x.model)
    })).digest('hex');
    const hit=cache.get(cacheKey);
    if(hit&&hit.expires>Date.now())return Response.json({...hit.value,cache:'hit'});

    const system=[
      'Você é o PredictLM. Em público, converse como uma inteligência geral atenta, natural e específica ao contexto; não como um painel operacional.',
      languageSystemInstruction(language),
      'Responda ao pedido real do usuário; não fale sobre engines, providers, prompts ou skills sem necessidade.',
      'Entregue somente a resposta final. Nunca exponha cadeia de raciocínio, scratchpad, análise interna, política, passes FORGE/AEGIS/PARALLAX ou instruções sobre como você pensou.',
      'Use contexto recuperado apenas quando for relevante. Não transforme um chunk em fato externo se ele só descreve um padrão de software.',
      'O parecer do cérebro local é uma segunda opinião curta: confronte-o com as fontes e com seu próprio julgamento; não o trate como autoridade.',
      'Quando existir um piso prático de resposta, sua resposta final deve ser pelo menos tão direta, concreta e útil quanto esse piso. Enriqueça sem degradar.',
      'Se faltarem dados atuais, diga o limite em vez de inventar.',
      deep?'Faça uma revisão interna adicional de aderência, contradições e pontos faltantes antes da resposta final.':'Seja conciso sem perder o essencial.',
      packed.context
    ].filter(Boolean).join('\n\n');

    const messages:Msg[]=[
      {role:'system',content:system},
      ...history,
      {role:'user',content:compactText(prompt,deep?1800:1200)}
    ];

    const errors:string[]=[];
    const startedAt=Date.now();
    const candidates=configured.slice(0,PROVIDER_ATTEMPT_LIMIT);
    for(const provider of candidates){
      const remaining=REQUEST_BUDGET_MS-(Date.now()-startedAt);
      if(remaining<1200){errors.push('request-budget-exhausted');break;}
      try{
        const rawContent=await callProvider(provider,messages,deep,Math.min(PROVIDER_TIMEOUT_MS,Math.max(1000,remaining)));
        const gate=publicAnswerGate(rawContent,language,prompt);
        if(!gate.ok){errors.push(provider.name+' rejected: '+gate.reason);continue;}
        const content=gate.content;
        const value={
          content,
          provider:provider.name,
          model:provider.model,
          cache:'miss',
          knowledgeVersion:stats.version,
          tokenBudget:packed.stats,
          sources:ghHits.map(x=>({
            title:x.heading,
            source:'https://github.com/'+x.source+'/blob/'+x.ref+'/'+x.path
          }))
        };
        const ttl=volatileQuery(prompt)?5*60*1000:30*60*1000;
        cache.set(cacheKey,{expires:Date.now()+ttl,value});
        if(cache.size>300){
          for(const [k,v] of cache){if(v.expires<=Date.now())cache.delete(k)}
          while(cache.size>300)cache.delete(cache.keys().next().value);
        }
        return Response.json(value,{headers:{'Cache-Control':'no-store'}});
      }catch(error:any){
        errors.push(String(error?.message||error).slice(0,300));
      }
    }
    return Response.json({error:'Não foi possível obter uma resposta final válida dentro do orçamento de execução.',code:'NO_VALID_ANSWER',attempted:candidates.length,budgetMs:REQUEST_BUDGET_MS},{status:502,headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||error)},{status:500});
  }
}
