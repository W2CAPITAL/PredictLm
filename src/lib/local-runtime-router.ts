import { adaptiveContext, adaptiveInstructionContext } from './adaptive-memory';
import { knowledgeContext } from './assistant-knowledge';
import { compileSystemPrompt } from './prompt-os/compiler';
import { languageSystemInstruction, type ConversationLanguage } from './language-policy';
import { publicAnswerGate } from './public-answer-gate';
import { classifyDomainEngines } from './domain-engine-fabric';
import { trainingContext } from './training/context';
import { githubKnowledgeContext, retrieveGitHubKnowledge } from './github-knowledge-engine';\nimport { continuousLearningContext } from './continuous-learning';
import { optimizePromptPackage, type TokenBudgetStats } from './token-budget';
import { tutorSystemContext } from './tutor-mode';
import { globalLearningContext } from './global-learning';
import { deepLoopContext } from './deep-loop-policy';
import { centumDecisionContext, parallaxContext } from './decision-centum';
import { humanAdversarialContext } from './human-adversarial-lens';
import { digitalBrainContext, readBrowserDigitalBrain } from './digital-brain';
import { humanPresenceContext } from './human-presence';
import { isScenarioSimulationRequest, predictLMMasterContext } from './predictlm-master';

function useGithubKnowledge(input:string){
  const q=String(input||'').toLowerCase();
  return /\b(github|repo|codigo|code|software|typescript|javascript|python|react|next|api|backend|frontend|database|vercel|docker|mcp|bug|erro|arquitetura|datajud|djen|lexis|graphrag|sgs|bacen|starlink|spacex|quant|qubit|netdata)\b/.test(q)||classifyDomainEngines(input).length>0;
}

export type LocalRuntimeKind='ollama'|'openai'|'lowram';
export type LocalRuntimeId='freellmapi'|'ollama'|'local-4891'|'local-8080'|'geniex'|'lowram';

export interface LocalRuntimeCandidate{
  id:LocalRuntimeId;
  label:string;
  baseUrl:string;
  kind:LocalRuntimeKind;
  source:string;
  priority:number;
}

export interface LocalRuntimeStatus extends LocalRuntimeCandidate{
  available:boolean;
  model?:string;
  detail?:string;
  latencyMs?:number;
}

export interface LocalRuntimeReply{
  content:string;
  runtime:LocalRuntimeId;
  label:string;
  model:string;
  tokenStats:TokenBudgetStats;
  sources:{title:string;source:string}[];
}

const CREDENTIAL_KEY='predictlm-local-runtime-credentials-v1';

function readCredentials():Partial<Record<LocalRuntimeId,string>>{
  if(typeof window==='undefined')return {};
  try{return JSON.parse(localStorage.getItem(CREDENTIAL_KEY)||'{}')||{}}catch{return {}}
}

export function setLocalRuntimeCredential(id:LocalRuntimeId,key:string){
  if(typeof window==='undefined')return;
  const next={...readCredentials()};
  const clean=String(key||'').trim();
  if(clean)next[id]=clean; else delete next[id];
  localStorage.setItem(CREDENTIAL_KEY,JSON.stringify(next));
}

export function hasLocalRuntimeCredential(id:LocalRuntimeId){return !!readCredentials()[id]}

function runtimeAuth(candidate:LocalRuntimeCandidate){
  return readCredentials()[candidate.id]||'local';
}

export const LOCAL_RUNTIME_CANDIDATES:LocalRuntimeCandidate[]=[
  {id:'freellmapi',label:'FreeLLMAPI · 3001',baseUrl:'http://127.0.0.1:3001',kind:'openai',source:'tashfeenahmed/freellmapi',priority:110},
  {id:'ollama',label:'Ollama',baseUrl:'http://127.0.0.1:11434',kind:'ollama',source:'Ollama / llamdrop patterns',priority:100},
  {id:'local-4891',label:'Local OpenAI · 4891',baseUrl:'http://127.0.0.1:4891',kind:'openai',source:'Local OpenAI-compatible runtime pattern',priority:92},
  {id:'local-8080',label:'Local OpenAI · 8080',baseUrl:'http://127.0.0.1:8080',kind:'openai',source:'llamafile / NanoMind runtime pattern',priority:90},
  {id:'geniex',label:'GenieX · 18181',baseUrl:'http://127.0.0.1:18181',kind:'openai',source:'Qualcomm GenieX',priority:88},
  {id:'lowram',label:'LowRAM · 8766',baseUrl:'http://127.0.0.1:8766',kind:'lowram',source:'LowRAM AI Compiler',priority:60}
];

function localOnly(url:string){
  try{
    const u=new URL(url);
    return ['127.0.0.1','localhost','::1','[::1]'].includes(u.hostname);
  }catch{return false}
}

async function timedFetch(url:string,init:RequestInit={},timeoutMs=1800,parentSignal?:AbortSignal){
  if(!localOnly(url))throw new Error('Local Runtime Router only accepts loopback endpoints.');
  const controller=new AbortController();
  const onAbort=()=>controller.abort();
  if(parentSignal){
    if(parentSignal.aborted)controller.abort();
    else parentSignal.addEventListener('abort',onAbort,{once:true});
  }
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const started=Date.now();
  try{
    const response=await fetch(url,{...init,signal:controller.signal,cache:'no-store'});
    return {response,latencyMs:Date.now()-started};
  }finally{
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort',onAbort);
  }
}

async function probeOllama(candidate:LocalRuntimeCandidate):Promise<LocalRuntimeStatus>{
  try{
    const {response,latencyMs}=await timedFetch(candidate.baseUrl+'/api/tags',{},1600);
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json().catch(()=>({}));
    const model=String(data?.models?.[0]?.name||data?.models?.[0]?.model||'').trim();
    return {...candidate,available:true,model:model||undefined,latencyMs};
  }catch(error:any){
    return {...candidate,available:false,detail:String(error?.message||'unavailable')};
  }
}

async function probeOpenAI(candidate:LocalRuntimeCandidate):Promise<LocalRuntimeStatus>{
  try{
    if(candidate.id==='freellmapi'&&!hasLocalRuntimeCredential('freellmapi')){
      return {...candidate,available:false,detail:'unified key required'};
    }
    const {response,latencyMs}=await timedFetch(candidate.baseUrl+'/v1/models',{
      headers:{'Authorization':'Bearer '+runtimeAuth(candidate)}
    },1600);
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json().catch(()=>({}));
    const model=String(data?.data?.[0]?.id||data?.models?.[0]?.id||data?.models?.[0]?.name||'local').trim();
    return {...candidate,available:true,model:model||'local',latencyMs};
  }catch(error:any){
    return {...candidate,available:false,detail:String(error?.message||'unavailable')};
  }
}

async function probeLowRam(candidate:LocalRuntimeCandidate):Promise<LocalRuntimeStatus>{
  try{
    const {response,latencyMs}=await timedFetch(candidate.baseUrl+'/health',{},1600);
    if(!response.ok)throw new Error('HTTP '+response.status);
    let model='lowram';
    try{
      const info=await timedFetch(candidate.baseUrl+'/v1/model',{},1200);
      if(info.response.ok){
        const data=await info.response.json().catch(()=>({}));
        model=String(data?.model||data?.name||data?.architecture||model);
      }
    }catch{}
    return {...candidate,available:true,model,latencyMs};
  }catch(error:any){
    return {...candidate,available:false,detail:String(error?.message||'unavailable')};
  }
}

export async function probeLocalRuntimes(options?:{aggressive?:boolean}){
  const candidates=options?.aggressive
    ? LOCAL_RUNTIME_CANDIDATES
    : LOCAL_RUNTIME_CANDIDATES.filter(candidate=>candidate.id==='freellmapi'&&hasLocalRuntimeCredential('freellmapi'));
  if(!candidates.length)return [] as LocalRuntimeStatus[];
  const results=await Promise.all(candidates.map(candidate=>{
    if(candidate.kind==='ollama')return probeOllama(candidate);
    if(candidate.kind==='lowram')return probeLowRam(candidate);
    return probeOpenAI(candidate);
  }));
  return results.sort((a,b)=>Number(b.available)-Number(a.available)||b.priority-a.priority||(a.latencyMs||9999)-(b.latencyMs||9999));
}

function sanitizeMessages(messages:{role:string;content:string}[]){
  return messages
    .filter(x=>x&&(x.role==='user'||x.role==='assistant')&&String(x.content||'').trim())
    .map(x=>({role:x.role,content:String(x.content)}));
}

async function generateOllama(
  runtime:LocalRuntimeStatus,
  messages:{role:string;content:string}[],
  deep:boolean,
  signal?:AbortSignal
){
  const model=runtime.model||'';
  if(!model)throw new Error('Ollama respondeu, mas nenhum modelo carregado/instalado foi encontrado.');
  const {response}=await timedFetch(runtime.baseUrl+'/api/chat',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model,
      messages,
      stream:false,
      options:{temperature:deep?0.28:0.45,num_predict:deep?650:420}
    })
  },30000,signal);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data?.error||'Ollama '+response.status));
  const content=String(data?.message?.content||data?.response||'').trim();
  if(!content)throw new Error('Ollama retornou resposta vazia.');
  return {content,model:String(data?.model||response.headers.get('x-routed-model')||model)};
}

async function generateOpenAI(
  runtime:LocalRuntimeStatus,
  messages:{role:string;content:string}[],
  deep:boolean,
  signal?:AbortSignal
){
  const model=runtime.id==='freellmapi'?'auto':(runtime.model||'local');
  const {response}=await timedFetch(runtime.baseUrl+'/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+runtimeAuth(runtime)},
    body:JSON.stringify({
      model,
      messages,
      stream:false,
      temperature:deep ? .28 : .45,
      max_tokens:deep?650:420
    })
  },30000,signal);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data?.error?.message||data?.error||runtime.label+' '+response.status));
  const content=String(data?.choices?.[0]?.message?.content||data?.response||'').trim();
  if(!content)throw new Error(runtime.label+' retornou resposta vazia.');
  return {content,model:String(data?.model||response.headers.get('x-routed-model')||model)};
}

async function generateLowRam(
  runtime:LocalRuntimeStatus,
  messages:{role:string;content:string}[],
  deep:boolean,
  signal?:AbortSignal
){
  const flat=messages.map(x=>x.role.toUpperCase()+': '+x.content).join('\n\n');
  const {response}=await timedFetch(runtime.baseUrl+'/v1/generate',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      prompt:flat,
      max_new_tokens:deep?520:320,
      temperature:deep?0.25:0.4,
      top_k:40,
      top_p:.9,
      repetition_penalty:1.05
    })
  },30000,signal);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data?.error||runtime.label+' '+response.status));
  const content=String(data?.text||data?.response||data?.generated_text||'').trim();
  if(!content)throw new Error(runtime.label+' retornou resposta vazia.');
  return {content,model:runtime.model||'lowram'};
}

export async function answerViaLocalRuntime(
  prompt:string,
  history:{role:string;content:string}[],
  options?:{deep?:boolean;preferred?:LocalRuntimeId|'auto';language?:ConversationLanguage;researchContext?:string;signal?:AbortSignal;advisoryOnly?:boolean}
):Promise<LocalRuntimeReply>{
  if(typeof window==='undefined')throw new Error('Local Runtime Router requires the browser/desktop client.');
  const statuses=await probeLocalRuntimes();
  const available=statuses.filter(x=>x.available);
  if(!available.length){
    throw new Error('Nenhum runtime local previamente configurado está acessível. O modo Auto não varre portas localhost para evitar travamentos e ruído no navegador.');
  }
  const preferred=options?.preferred&&options.preferred!=='auto'
    ? available.find(x=>x.id===options.preferred)
    : null;
  const runtime=preferred||available[0];

  const deepMode=Boolean(options?.deep)||isScenarioSimulationRequest(prompt);

  if(options?.advisoryOnly){
    const advisoryMessages=[
      {
        role:'system',
        content:[
          'Você é apenas um crítico local auxiliar do PredictLM.',
          'Não responda ao usuário final e não execute agents, skills, RAG ou ferramentas.',
          'Em até 5 linhas, indique fatos essenciais, possíveis erros ou lacunas que a API principal deve considerar.',
          languageSystemInstruction(options?.language||'pt-BR')
        ].join('\n')
      },
      ...sanitizeMessages(history).slice(-4),
      {role:'user',content:prompt}
    ];
    let generated:{content:string;model:string};
    if(runtime.kind==='ollama')generated=await generateOllama(runtime,advisoryMessages,false,options?.signal);
    else if(runtime.kind==='lowram')generated=await generateLowRam(runtime,advisoryMessages,false,options?.signal);
    else generated=await generateOpenAI(runtime,advisoryMessages,false,options?.signal);
    return {
      content:generated.content.slice(0,1800),
      runtime:runtime.id,
      label:runtime.label,
      model:generated.model,
      tokenStats:{mode:'ultra',before:0,after:0,saved:0,savedPct:0,droppedMessages:0,dedupedBlocks:0} as TokenBudgetStats,
      sources:[]
    };
  }

  const topK=runtime.kind==='lowram'?2:(deepMode?5:3);
  const githubEnabled=useGithubKnowledge(prompt);
  const knowledge=knowledgeContext(prompt,runtime.kind==='lowram'?3:4);
  const trained=trainingContext(prompt,runtime.kind==='lowram'?3:4);
  const github=githubEnabled?githubKnowledgeContext(prompt,topK):'';
  const learned=adaptiveContext(prompt,runtime.kind==='lowram'?2:3);
  const instructions=adaptiveInstructionContext(runtime.kind==='lowram'?2:4);
  const globalLessons=globalLearningContext(prompt,runtime.kind==='lowram'?2:3);
  const humanLens=humanAdversarialContext(prompt);
  const humanPresence=humanPresenceContext(prompt);
  const masterContext=predictLMMasterContext(prompt,deepMode);
  const brainContext=digitalBrainContext(prompt,readBrowserDigitalBrain());
  const tutor=tutorSystemContext(prompt);
  const deepLoop=deepMode?deepLoopContext(prompt):'';
  const centum=centumDecisionContext(prompt);
  const parallax=parallaxContext(prompt);
  const packed=optimizePromptPackage({
    messages:sanitizeMessages(history),
    mode:runtime.kind==='lowram'?'ultra':(deepMode?'lite':'full'),
    sections:[
      {label:'Pesquisa web verificada',text:String(options?.researchContext||'').slice(0,12000),priority:9},
      {label:'GitHub Knowledge',text:github,priority:5},\n      {label:'Aprendizado contínuo verificado',text:continuous,priority:7},
      {label:'Knowledge',text:knowledge,priority:5},
      {label:'Memória adaptativa',text:learned,priority:4},
      {label:'Instruções persistentes do usuário',text:instructions,priority:8},
      {label:'Lições globais aprovadas',text:globalLessons,priority:7},
      {label:'PredictLM Master',text:masterContext,priority:10},
      {label:'Human Presence',text:humanPresence,priority:10},
      {label:'Human Adversarial Lens',text:humanLens,priority:9},
      {label:'Digital Brain control layer',text:brainContext,priority:10},
      {label:'Centum Decision Gate',text:centum,priority:10},
      {label:'Third Brain PARALLAX',text:parallax,priority:10},
      {label:'Deep Loop',text:deepLoop,priority:9},
      {label:'Tutor Mode',text:tutor,priority:6},
      {label:'Padrões aprendidos',text:trained,priority:3}
    ].filter(x=>x.text)
  });
  const compiled=compileSystemPrompt({
    userText:prompt,
    deep:deepMode,
    extra:[languageSystemInstruction(options?.language||'pt-BR'),packed.context].filter(Boolean)
  });
  const messages=[
    {role:'system',content:compiled.system},
    ...packed.messages,
    {role:'user',content:prompt}
  ];

  let generated:{content:string;model:string};
  if(runtime.kind==='ollama')generated=await generateOllama(runtime,messages,deepMode,options?.signal);
  else if(runtime.kind==='lowram')generated=await generateLowRam(runtime,messages,deepMode,options?.signal);
  else generated=await generateOpenAI(runtime,messages,deepMode,options?.signal);

  const gate=publicAnswerGate(generated.content,options?.language||'pt-BR',prompt);
  if(!gate.ok)throw new Error('Resposta local rejeitada pelo gate público: '+gate.reason);

  const sources=(githubEnabled?retrieveGitHubKnowledge(prompt,topK):[]).map(x=>({
    title:x.heading,
    source:'https://github.com/'+x.source+'/blob/'+x.ref+'/'+x.path
  }));

  return {
    content:gate.content,
    runtime:runtime.id,
    label:runtime.label,
    model:generated.model,
    tokenStats:packed.stats,
    sources
  };
}
