import type { WorkspaceFile } from './types';
import { knowledgeContext, retrieveKnowledge } from './assistant-knowledge';
import { compileSystemPrompt } from './prompt-os/compiler';
import { cleanUserFacingAnswer } from './prompt-os/response-contract';
import { adaptiveContext, adaptiveRecall, captureAdaptiveExperience } from './adaptive-memory';
import { trainingContext } from './training/context';

export type NeuralTier='lite'|'smart';
export type BrainEngine='native'|'neural-lite'|'neural-smart'|'conversation'|'research'|'knowledge'|'knowledge-fallback';

export interface BrainReply {
  content:string;
  engine:BrainEngine;
  sources?:{title:string;source:string}[];
  fallbackReason?:string;
}

declare global {
  interface Window {
    ai?:any;
    LanguageModel?:any;
  }
  interface Navigator {
    deviceMemory?:number;
  }
}

let worker:Worker|null=null;
let loadedTier:NeuralTier|null=null;
let loadedBackend:'webgpu'|'wasm'|null=null;
let lastNeuralError='';
let seq=0;
const pending=new Map<number,{resolve:(v:string)=>void;reject:(e:Error)=>void}>();

function parseMath(input:string){
  const raw=input.replace(/,/g,'.').replace(/\s+/g,'');
  if(!/^[0-9+\-*/().%^]+$/.test(raw)||!/\d/.test(raw))return null;
  const tokens=raw.match(/\d+(?:\.\d+)?|[()+\-*/%^]/g);
  if(!tokens)return null;
  let i=0;
  const primary=():number=>{
    const t=tokens[i++];
    if(t==='('){const v=expr();if(tokens[i]===')')i++;return v;}
    if(t==='-')return -primary();
    const n=Number(t);if(!Number.isFinite(n))throw new Error('number');return n;
  };
  const power=()=>{let v=primary();while(tokens[i]==='^'){i++;v=Math.pow(v,power())}return v};
  const term=()=>{let v=power();while(['*','/','%'].includes(tokens[i])){const op=tokens[i++];const r=power();v=op==='*'?v*r:op==='/'?v/r:v%r;}return v};
  const expr=()=>{let v=term();while(['+','-'].includes(tokens[i])){const op=tokens[i++];const r=term();v=op==='+'?v+r:v-r;}return v};
  try{const v=expr();return i===tokens.length&&Number.isFinite(v)?v:null}catch{return null}
}

export function browserCapabilities(){
  const native=!!(typeof window!=='undefined'&&(window.LanguageModel||window.ai?.languageModel));
  const webgpu=typeof navigator!=='undefined'&&!!(navigator as any).gpu;
  const memory=typeof navigator!=='undefined'?navigator.deviceMemory||0:0;
  const cores=typeof navigator!=='undefined'?navigator.hardwareConcurrency||0:0;
  const recommended:NeuralTier=(webgpu&&(memory>=8||cores>=8))?'smart':'lite';
  return {native,webgpu,memory,cores,recommended};
}

async function nativeGenerate(system:string,prompt:string){
  const api=window.LanguageModel||window.ai?.languageModel;
  if(!api)throw new Error('Browser native model unavailable');
  const availability=typeof api.availability==='function'?await api.availability():null;
  if(availability==='unavailable')throw new Error('Browser native model unavailable');
  const session=typeof api.create==='function'
    ? await api.create({systemPrompt:system})
    : await api.create?.();
  if(!session?.prompt)throw new Error('Browser native model unavailable');
  return String(await session.prompt(prompt));
}

function ensureWorker(){
  if(worker)return worker;
  worker=new Worker(new URL('../workers/neural.worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=(event)=>{
    const msg=event.data||{};
    if(msg.type==='result'&&pending.has(msg.id)){
      pending.get(msg.id)!.resolve(String(msg.text||''));
      pending.delete(msg.id);
    }
    if(msg.type==='error'&&msg.id&&pending.has(msg.id)){
      lastNeuralError=String(msg.message||'Falha na geração neural local');
      pending.get(msg.id)!.reject(new Error(lastNeuralError));
      pending.delete(msg.id);
    }
  };
  worker.onerror=(event)=>{
    lastNeuralError=event.message||'Falha no worker neural local';
    for(const [,job] of pending)job.reject(new Error(lastNeuralError));
    pending.clear();
  };
  return worker;
}

const NEURAL_MODELS:Record<NeuralTier,string>={
  lite:process.env.NEXT_PUBLIC_PREDICT_NEURAL_LITE_MODEL||'onnx-community/Qwen2.5-0.5B-Instruct',
  smart:process.env.NEXT_PUBLIC_PREDICT_NEURAL_SMART_MODEL||'onnx-community/Qwen2.5-1.5B-Instruct'
};

const PREF_KEY='predictlm-neural-preference-v1';
const PROFILE_KEY='predictlm-neural-profile-v2';

type NeuralProfile={
  requested:NeuralTier;
  actual:NeuralTier;
  backend:'webgpu'|'wasm';
  readyAt:number;
};

function readNeuralProfile():NeuralProfile|null{
  if(typeof window==='undefined')return null;
  try{
    const raw=localStorage.getItem(PROFILE_KEY);
    if(!raw)return null;
    const value=JSON.parse(raw);
    if((value?.requested==='lite'||value?.requested==='smart')&&(value?.actual==='lite'||value?.actual==='smart')&&(value?.backend==='webgpu'||value?.backend==='wasm')){
      return value as NeuralProfile;
    }
  }catch{}
  return null;
}

export function preferredNeuralTier():NeuralTier|null{
  if(typeof window==='undefined')return null;
  const profile=readNeuralProfile();
  if(profile?.actual)return profile.actual;
  const value=localStorage.getItem(PREF_KEY);
  return value==='lite'||value==='smart'?value:null;
}

function saveNeuralPreference(tier:NeuralTier|null,profile?:NeuralProfile){
  if(typeof window==='undefined')return;
  try{
    if(tier)localStorage.setItem(PREF_KEY,tier);
    else localStorage.removeItem(PREF_KEY);
    if(profile)localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
    else if(!tier)localStorage.removeItem(PROFILE_KEY);
  }catch{}
}

export async function restorePreferredNeuralModel(onProgress?:(p:{progress:number|null;status:string})=>void){
  const tier=preferredNeuralTier();
  if(!tier||loadedTier)return false;
  try{
    await loadNeuralModel(tier,onProgress,{persistPreference:false});
    return true;
  }catch(firstError){
    if(tier==='smart'){
      onProgress?.({progress:null,status:'Restauração Smart falhou; tentando Lite/CPU a partir do cache'});
      await loadNeuralModel('lite',onProgress,{persistPreference:true});
      return true;
    }
    throw firstError;
  }
}

export async function loadNeuralModel(
  tier:NeuralTier,
  onProgress?:(p:{progress:number|null;status:string})=>void,
  options?:{persistPreference?:boolean}
){
  const w=ensureWorker();
  const caps=browserCapabilities();

  let realWebgpu=false;
  if(caps.webgpu){
    try{
      const gpu=(navigator as any).gpu;
      const adapter=await Promise.race([
        gpu.requestAdapter({powerPreference:'high-performance'}),
        new Promise<null>(resolve=>setTimeout(()=>resolve(null),3500))
      ]);
      realWebgpu=!!adapter;
    }catch{
      realWebgpu=false;
    }
  }

  onProgress?.({
    progress:null,
    status:realWebgpu
      ? 'WebGPU confirmado; preparando modelo'
      : 'WebGPU indisponível; usando CPU/WASM automaticamente'
  });

  return new Promise<void>((resolve,reject)=>{
    let settled=false;
    const timeout=window.setTimeout(()=>{
      if(settled)return;
      settled=true;
      w.removeEventListener('message',onMessage);
      lastNeuralError='O carregamento local excedeu 8 minutos.';
      reject(new Error(lastNeuralError));
    },8*60*1000);

    const finish=(fn:()=>void)=>{
      if(settled)return;
      settled=true;
      window.clearTimeout(timeout);
      w.removeEventListener('message',onMessage);
      fn();
    };

    const onMessage=(event:MessageEvent)=>{
      const msg=event.data;
      if(msg.type==='progress'&&msg.tier===tier){
        onProgress?.({
          progress:typeof msg.progress==='number'?msg.progress:null,
          status:String(msg.status||'loading')
        });
      }
      if(msg.type==='backend-failed'&&msg.tier===tier){
        const failed=String(msg.backend||'backend');
        onProgress?.({
          progress:null,
          status:failed==='webgpu'
            ? 'WebGPU falhou; alternando para CPU/WASM'
            : 'Falha no '+failed
        });
      }
      if(msg.type==='ready'&&msg.tier===tier){
        loadedTier=msg.actualTier==='smart'?'smart':'lite';
        loadedBackend=msg.backend==='webgpu'?'webgpu':'wasm';
        lastNeuralError='';
        if(options?.persistPreference!==false){
          saveNeuralPreference(loadedTier,{
            requested:tier,
            actual:loadedTier,
            backend:loadedBackend,
            readyAt:Date.now()
          });
        }
        try{
          void (navigator as any).storage?.persist?.();
        }catch{}
        const compatibility=tier==='smart'&&loadedTier==='lite'?' · compatibilidade Lite':'';
        onProgress?.({progress:100,status:'pronto · '+String(msg.label||msg.backend||'local')+compatibility});
        finish(resolve);
      }
      if(msg.type==='error'&&!msg.id){
        lastNeuralError=String(msg.message||'Local neural model failed to load');
        finish(()=>reject(new Error(lastNeuralError)));
      }
    };

    w.addEventListener('message',onMessage);
    // Lite is intentionally CPU/WASM-first to avoid freezing low-end office PCs.
    // Smart may use WebGPU, with WASM fallback if the adapter is unavailable.
    const allowSmartWasm=tier==='smart'&&!realWebgpu&&caps.memory>=8&&caps.cores>=8;
    w.postMessage({type:'load',tier,webgpu:tier==='smart'&&realWebgpu,allowSmartWasm,models:NEURAL_MODELS});
  });
}

export function neuralStatus(){
  const profile=typeof window!=='undefined'?readNeuralProfile():null;
  return {loaded:!!loadedTier,tier:loadedTier,backend:loadedBackend,lastError:lastNeuralError||null,profile};
}

export function unloadNeuralModel(options?:{keepPreference?:boolean}){
  if(worker){
    worker.terminate();
    worker=null;
  }
  loadedTier=null;
  loadedBackend=null;
  lastNeuralError='';
  if(!options?.keepPreference)saveNeuralPreference(null);
  for(const [,job] of pending)job.reject(new Error('Modelo local descarregado.'));
  pending.clear();
}

async function neuralGenerate(system:string,prompt:string,messages:{role:string;content:string}[]){
  if(!worker||!loadedTier)throw new Error('Neural model not loaded');
  const id=++seq;
  return new Promise<string>((resolve,reject)=>{
    pending.set(id,{resolve,reject});
    worker!.postMessage({type:'generate',id,system,prompt,messages,maxNewTokens:loadedTier==='smart'?520:360,temperature:0.5});
    setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('Local neural generation timed out'));}},120000);
  });
}

export interface NeuralBuildPatch{
  explanation:string;
  plan:string[];
  files:WorkspaceFile[];
}

function parseBuildPatch(raw:string):NeuralBuildPatch|null{
  const text=String(raw||'').replace(/```(?:json)?/gi,'').replace(/```/g,'').trim();
  const start=text.indexOf('{');
  const end=text.lastIndexOf('}');
  if(start<0||end<=start)return null;
  try{
    const data=JSON.parse(text.slice(start,end+1));
    const files=Array.isArray(data?.files)
      ? data.files
          .filter((x:any)=>x&&typeof x.path==='string'&&typeof x.content==='string')
          .map((x:any)=>({
            path:String(x.path).replace(/^\/+/, '').replace(/\.\.(?:\/|\\)/g,'').slice(0,180),
            content:String(x.content).slice(0,40000),
            language:String(x.language||'typescript').slice(0,30)
          }))
          .filter((x:WorkspaceFile)=>!!x.path&&!/^(?:\.env|node_modules\/|\.git\/)/.test(x.path))
          .slice(0,14)
      : [];
    if(!files.length)return null;
    return {
      explanation:String(data?.explanation||'Refinamento local aplicado.').slice(0,1200),
      plan:Array.isArray(data?.plan)?data.plan.map(String).slice(0,12):[],
      files
    };
  }catch{return null}
}

export async function generateNeuralBuildPatch(prompt:string,files:WorkspaceFile[]):Promise<NeuralBuildPatch|null>{
  if(!worker||!loadedTier)return null;
  const system=[
    'You are the code refinement layer of a local app builder.',
    'Return ONLY valid JSON with keys explanation, plan, files.',
    'files must contain only complete files that you actually want to change.',
    'Preserve the current project. Never replace a working app with a generic starter.',
    'For business apps, require real navigation/sidebar, domain validation, loading/error/empty states, persistence boundary, API/integration adapters, server-only secrets and tests.',
    'Do not claim an integration is connected without credentials/handshake.',
    'Prefer edits that connect generated src modules to real behavior rather than decorative files.'
  ].join(' ');
  const snapshot=files
    .filter(f=>/^(App\.tsx|styles\.css|predict\.spec\.json|ARCHITECTURE\.md|src\/|server\/|\.env\.example)/.test(f.path))
    .slice(0,12)
    .map(f=>({path:f.path,content:f.content.slice(0,2600)}));
  const request=[
    'TASK: '+prompt,
    'CURRENT PROJECT:',
    JSON.stringify(snapshot),
    'Return a minimal but production-oriented patch. If no safe useful patch is possible, return {"explanation":"no patch","plan":[],"files":[]}.'
  ].join('\n\n');
  try{
    const raw=await neuralGenerate(system,request,[]);
    return parseBuildPatch(raw);
  }catch{
    return null;
  }
}

function knowledgeReply(prompt:string){
  const math=parseMath(prompt);
  if(math!==null)return 'O resultado é **'+math.toLocaleString('pt-BR',{maximumFractionDigits:10})+'**.';
  const remembered=adaptiveRecall(prompt,2);
  if(remembered.length&&remembered[0].confidence>=.72)return remembered[0].answer;
  const p=prompt.toLowerCase().trim();
  if(/quem (é|e) voc[eê]|o que voc[eê] (é|e)/.test(p))return 'Sou o **PredictLM**. No Chat eu converso e pesquiso; no Build eu continuo projetos, edito arquivos, reviso arquitetura e preparo exportação executável. Meu modo principal é local-first.';
  const hits=retrieveKnowledge(prompt,5);
  if(hits.length){
    const best=hits.slice(0,3);
    return best.map((x,i)=>(i===0?'**'+x.title+'**\n':'**Relacionado: '+x.title+'**\n')+x.body).join('\n\n');
  }
  if(/^(como|explique|por que|porque|qual|quais)/i.test(p)){
    return 'Não tenho contexto local suficiente para responder isso com segurança sem consultar uma fonte ou um modelo carregado.';
  }
  return 'Não tenho evidência suficiente para responder isso com segurança nesta execução.';
}

export async function answerLocally(prompt:string,messages:{role:string;content:string}[],options?:{preferNative?:boolean;knowledge?:boolean;fallbackText?:string}):Promise<BrainReply>{
  const context=options?.knowledge===false?'':knowledgeContext(prompt,5);
  const trained=trainingContext(prompt,5);
  const learned=adaptiveContext(prompt,4);
  const recent=messages.slice(-10).map(m=>m.role.toUpperCase()+': '+m.content).join('\n');
  const compiled=compileSystemPrompt({
    userText:prompt,
    extra:[
      recent?'Histórico recente:\n'+recent:'',
      context?'Contexto recuperado:\n'+context:'',
      trained?'Padrões aprendidos dos packs aprovados:\n'+trained:'',
      learned?'Memória adaptativa local:\n'+learned:''
    ].filter(Boolean)
  });
  const system=compiled.system;
  const sources=retrieveKnowledge(prompt,5).map(x=>({title:x.title,source:x.source}));
  let fallbackReason='';

  if(typeof window!=='undefined'&&options?.preferNative!==false){
    try{
      const content=await nativeGenerate(system,prompt);
      if(content.trim()){
        const cleaned=cleanUserFacingAnswer(content);
        captureAdaptiveExperience(prompt,cleaned,'native-model');
        return {content:cleaned,engine:'native',sources};
      }
    }catch(error:any){
      fallbackReason=String(error?.message||'Browser native model unavailable');
    }
  }

  if(loadedTier){
    try{
      const content=await neuralGenerate(system,prompt,messages);
      if(content.trim()){
        lastNeuralError='';
        const cleaned=cleanUserFacingAnswer(content);
        captureAdaptiveExperience(prompt,cleaned,'local-model');
        return {content:cleaned,engine:loadedTier==='smart'?'neural-smart':'neural-lite',sources};
      }
      fallbackReason='Local neural model returned an empty response';
      lastNeuralError=fallbackReason;
    }catch(error:any){
      fallbackReason=String(error?.message||'Local neural generation failed');
      lastNeuralError=fallbackReason;
    }
  }

  const content=options?.fallbackText||knowledgeReply(prompt);
  return {
    content,
    engine:loadedTier?'knowledge-fallback':'knowledge',
    sources,
    fallbackReason:loadedTier?(fallbackReason||lastNeuralError||'Neural Local did not answer this turn'):undefined
  };
}
