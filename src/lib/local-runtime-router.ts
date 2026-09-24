import { adaptiveContext } from './adaptive-memory';
import { knowledgeContext } from './assistant-knowledge';
import { compileSystemPrompt } from './prompt-os/compiler';
import { trainingContext } from './training/context';
import { githubKnowledgeContext, retrieveGitHubKnowledge } from './github-knowledge-engine';
import { optimizePromptPackage, type TokenBudgetStats } from './token-budget';

export type LocalRuntimeKind='ollama'|'openai'|'lowram';
export type LocalRuntimeId='ollama'|'local-4891'|'local-8080'|'geniex'|'lowram';

export interface LocalRuntimeCandidate{
  id:LocalRuntimeId;
  label:string;
  baseUrl:string;
  kind:LocalRuntimeKind;
  source:string;
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

export const LOCAL_RUNTIME_CANDIDATES:LocalRuntimeCandidate[]=[
  {id:'ollama',label:'Ollama',baseUrl:'http://127.0.0.1:11434',kind:'ollama',source:'Ollama / llamdrop patterns'},
  {id:'local-4891',label:'Local OpenAI · 4891',baseUrl:'http://127.0.0.1:4891',kind:'openai',source:'Uncensored Local AI runtime pattern'},
  {id:'local-8080',label:'Local OpenAI · 8080',baseUrl:'http://127.0.0.1:8080',kind:'openai',source:'llamafile / NanoMind runtime pattern'},
  {id:'geniex',label:'GenieX · 18181',baseUrl:'http://127.0.0.1:18181',kind:'openai',source:'Qualcomm GenieX'},
  {id:'lowram',label:'LowRAM · 8766',baseUrl:'http://127.0.0.1:8766',kind:'lowram',source:'LowRAM AI Compiler'}
];

function localOnly(url:string){
  try{
    const u=new URL(url);
    return ['127.0.0.1','localhost','::1','[::1]'].includes(u.hostname);
  }catch{return false}
}

async function timedFetch(url:string,init:RequestInit={},timeoutMs=1800){
  if(!localOnly(url))throw new Error('Local Runtime Router only accepts loopback endpoints.');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const started=Date.now();
  try{
    const response=await fetch(url,{...init,signal:controller.signal,cache:'no-store'});
    return {response,latencyMs:Date.now()-started};
  }finally{clearTimeout(timer)}
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
    const {response,latencyMs}=await timedFetch(candidate.baseUrl+'/v1/models',{},1600);
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

export async function probeLocalRuntimes(){
  const results=await Promise.all(LOCAL_RUNTIME_CANDIDATES.map(candidate=>{
    if(candidate.kind==='ollama')return probeOllama(candidate);
    if(candidate.kind==='lowram')return probeLowRam(candidate);
    return probeOpenAI(candidate);
  }));
  return results.sort((a,b)=>Number(b.available)-Number(a.available)||(a.latencyMs||9999)-(b.latencyMs||9999));
}

function sanitizeMessages(messages:{role:string;content:string}[]){
  return messages
    .filter(x=>x&&(x.role==='user'||x.role==='assistant')&&String(x.content||'').trim())
    .map(x=>({role:x.role,content:String(x.content)}));
}

async function generateOllama(
  runtime:LocalRuntimeStatus,
  messages:{role:string;content:string}[],
  deep:boolean
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
      options:{temperature:deep?0.28:0.45,num_predict:deep?1000:700}
    })
  },90000);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data?.error||'Ollama '+response.status));
  const content=String(data?.message?.content||data?.response||'').trim();
  if(!content)throw new Error('Ollama retornou resposta vazia.');
  return {content,model};
}

async function generateOpenAI(
  runtime:LocalRuntimeStatus,
  messages:{role:string;content:string}[],
  deep:boolean
){
  const model=runtime.model||'local';
  const {response}=await timedFetch(runtime.baseUrl+'/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer local'},
    body:JSON.stringify({
      model,
      messages,
      stream:false,
      temperature:deep?.28:.45,
      max_tokens:deep?1000:700
    })
  },90000);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data?.error?.message||data?.error||runtime.label+' '+response.status));
  const content=String(data?.choices?.[0]?.message?.content||data?.response||'').trim();
  if(!content)throw new Error(runtime.label+' retornou resposta vazia.');
  return {content,model};
}

async function generateLowRam(
  runtime:LocalRuntimeStatus,
  messages:{role:string;content:string}[],
  deep:boolean
){
  const flat=messages.map(x=>x.role.toUpperCase()+': '+x.content).join('\n\n');
  const {response}=await timedFetch(runtime.baseUrl+'/v1/generate',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      prompt:flat,
      max_new_tokens:deep?700:420,
      temperature:deep?0.25:0.4,
      top_k:40,
      top_p:.9,
      repetition_penalty:1.05
    })
  },90000);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data?.error||runtime.label+' '+response.status));
  const content=String(data?.text||data?.response||data?.generated_text||'').trim();
  if(!content)throw new Error(runtime.label+' retornou resposta vazia.');
  return {content,model:runtime.model||'lowram'};
}

export async function answerViaLocalRuntime(
  prompt:string,
  history:{role:string;content:string}[],
  options?:{deep?:boolean;preferred?:LocalRuntimeId|'auto'}
):Promise<LocalRuntimeReply>{
  if(typeof window==='undefined')throw new Error('Local Runtime Router requires the browser/desktop client.');
  const statuses=await probeLocalRuntimes();
  const available=statuses.filter(x=>x.available);
  if(!available.length){
    throw new Error('Nenhum runtime local acessível. Inicie Ollama, llamafile/NanoMind, GenieX ou LowRAM e verifique CORS/porta local.');
  }
  const preferred=options?.preferred&&options.preferred!=='auto'
    ? available.find(x=>x.id===options.preferred)
    : null;
  const runtime=preferred||available[0];

  const knowledge=knowledgeContext(prompt,4);
  const trained=trainingContext(prompt,4);
  const github=githubKnowledgeContext(prompt,3);
  const learned=adaptiveContext(prompt,3);
  const packed=optimizePromptPackage({
    messages:sanitizeMessages(history),
    mode:options?.deep?'lite':'full',
    sections:[
      {label:'GitHub Knowledge',text:github,priority:5},
      {label:'Knowledge',text:knowledge,priority:5},
      {label:'Memória adaptativa',text:learned,priority:4},
      {label:'Padrões aprendidos',text:trained,priority:3}
    ].filter(x=>x.text)
  });
  const compiled=compileSystemPrompt({
    userText:prompt,
    extra:[packed.context].filter(Boolean)
  });
  const messages=[
    {role:'system',content:compiled.system},
    ...packed.messages,
    {role:'user',content:prompt}
  ];

  let generated:{content:string;model:string};
  if(runtime.kind==='ollama')generated=await generateOllama(runtime,messages,!!options?.deep);
  else if(runtime.kind==='lowram')generated=await generateLowRam(runtime,messages,!!options?.deep);
  else generated=await generateOpenAI(runtime,messages,!!options?.deep);

  const sources=retrieveGitHubKnowledge(prompt,3).map(x=>({
    title:x.heading,
    source:'https://github.com/'+x.source+'/blob/'+x.ref+'/'+x.path
  }));

  return {
    content:generated.content,
    runtime:runtime.id,
    label:runtime.label,
    model:generated.model,
    tokenStats:packed.stats,
    sources
  };
}
