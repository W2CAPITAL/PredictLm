'use client';

export type WebLLMTier='lite'|'smart';

type WebLLMProgress={progress:number|null;status:string};

const MODULE_VERSION='0.2.85';
const MODULE_URL='https://esm.run/@mlc-ai/web-llm@'+MODULE_VERSION;
const PREF_KEY='predictlm-webllm-preference-v1';

export const WEBLLM_MODELS:Record<WebLLMTier,string>={
  lite:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  smart:'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'
};

declare global{
  interface Window{
    __predictlmWebLLM?:any;
    __predictlmWebLLMLoading?:Promise<any>;
  }
}

let engine:any=null;
let loadedTier:WebLLMTier|null=null;
let loadedModelId:string|null=null;
let loadingTier:WebLLMTier|null=null;
let lastError='';

function readPreference():WebLLMTier|null{
  if(typeof window==='undefined')return null;
  try{
    const value=localStorage.getItem(PREF_KEY);
    return value==='lite'||value==='smart'?value:null;
  }catch{return null}
}

function savePreference(tier:WebLLMTier|null){
  if(typeof window==='undefined')return;
  try{
    if(tier)localStorage.setItem(PREF_KEY,tier);
    else localStorage.removeItem(PREF_KEY);
  }catch{}
}

async function importWebLLM(){
  if(typeof window==='undefined')throw new Error('WebLLM exige navegador.');
  if(window.__predictlmWebLLM)return window.__predictlmWebLLM;
  if(window.__predictlmWebLLMLoading)return window.__predictlmWebLLMLoading;

  const task=new Promise<any>((resolve,reject)=>{
    let settled=false;
    const finish=(fn:()=>void)=>{
      if(settled)return;
      settled=true;
      window.removeEventListener('predictlm:webllm-module-ready',onReady);
      window.clearTimeout(timeout);
      fn();
    };
    const onReady=()=>finish(()=>window.__predictlmWebLLM
      ? resolve(window.__predictlmWebLLM)
      : reject(new Error('WebLLM carregou sem exportar o módulo.')));
    const timeout=window.setTimeout(()=>finish(()=>reject(new Error('Timeout ao carregar WebLLM.'))),30000);
    window.addEventListener('predictlm:webllm-module-ready',onReady,{once:true});

    const existing=document.querySelector('script[data-predictlm-webllm="'+MODULE_VERSION+'"]');
    if(existing)return;

    const script=document.createElement('script');
    script.type='module';
    script.dataset.predictlmWebllm=MODULE_VERSION;
    script.textContent=[
      'import * as WebLLM from '+JSON.stringify(MODULE_URL)+';',
      'window.__predictlmWebLLM=WebLLM;',
      'window.dispatchEvent(new Event("predictlm:webllm-module-ready"));'
    ].join('\n');
    script.onerror=()=>finish(()=>reject(new Error('Falha ao importar WebLLM. Verifique rede/CSP.')));
    document.head.appendChild(script);
  });

  window.__predictlmWebLLMLoading=task;
  try{return await task}
  finally{window.__predictlmWebLLMLoading=undefined}
}

async function assertWebGPU(){
  if(typeof navigator==='undefined'||!(navigator as any).gpu)throw new Error('WebGPU não está disponível neste navegador.');
  const adapter=await (navigator as any).gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw new Error('WebGPU existe, mas nenhum adaptador de GPU foi disponibilizado.');
}

export async function loadWebLLMModel(
  tier:WebLLMTier,
  onProgress?:(p:WebLLMProgress)=>void,
  options?:{persistPreference?:boolean}
){
  if(loadedTier===tier&&engine)return;
  if(loadingTier)throw new Error('WebLLM já está carregando outro modelo.');
  loadingTier=tier;
  lastError='';
  try{
    await assertWebGPU();
    onProgress?.({progress:null,status:'WebGPU confirmado · carregando runtime WebLLM'});
    const mod=await importWebLLM();
    const modelId=WEBLLM_MODELS[tier];
    const next=await mod.CreateMLCEngine(modelId,{
      initProgressCallback:(report:any)=>{
        const raw=Number(report?.progress);
        onProgress?.({
          progress:Number.isFinite(raw)?Math.max(0,Math.min(100,raw<=1?raw*100:raw)):null,
          status:String(report?.text||report?.status||'carregando modelo WebLLM')
        });
      }
    });
    const probe=await next.chat.completions.create({
      messages:[{role:'user',content:'Responda apenas OK.'}],
      temperature:0,
      max_tokens:8,
      stream:false
    });
    const text=String(probe?.choices?.[0]?.message?.content||'').trim();
    if(!text)throw new Error('WebLLM carregou, mas o self-test retornou vazio.');
    if(engine&&engine!==next){
      try{await engine.unload?.()}catch{}
    }
    engine=next;
    loadedTier=tier;
    loadedModelId=modelId;
    if(options?.persistPreference!==false)savePreference(tier);
    try{void (navigator as any).storage?.persist?.()}catch{}
    onProgress?.({progress:100,status:'WebLLM pronto · '+modelId});
  }catch(error:any){
    lastError=String(error?.message||error);
    throw error;
  }finally{
    loadingTier=null;
  }
}

export async function restorePreferredWebLLMModel(onProgress?:(p:WebLLMProgress)=>void){
  const tier=readPreference();
  if(!tier||engine)return false;
  await loadWebLLMModel(tier,onProgress,{persistPreference:false});
  return true;
}

export async function webLLMGenerate(
  messages:{role:'system'|'user'|'assistant';content:string}[],
  options?:{maxTokens?:number;temperature?:number}
){
  if(!engine||!loadedTier)throw new Error('WebLLM não está carregado.');
  const result=await engine.chat.completions.create({
    messages,
    temperature:options?.temperature??0.35,
    max_tokens:options?.maxTokens??700,
    stream:false
  });
  const content=String(result?.choices?.[0]?.message?.content||'').trim();
  if(!content)throw new Error('WebLLM retornou resposta vazia.');
  return content;
}

export function webLLMStatus(){
  return {
    loaded:!!engine,
    tier:loadedTier,
    modelId:loadedModelId,
    loadingTier,
    preferredTier:readPreference(),
    lastError:lastError||null,
    version:MODULE_VERSION
  };
}

export async function unloadWebLLMModel(options?:{keepPreference?:boolean}){
  const current=engine;
  engine=null;
  loadedTier=null;
  loadedModelId=null;
  loadingTier=null;
  lastError='';
  if(!options?.keepPreference)savePreference(null);
  try{await current?.unload?.()}catch{}
}
