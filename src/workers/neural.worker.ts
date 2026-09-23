/// <reference lib="webworker" />
import { env, pipeline } from '@huggingface/transformers';

type Tier='lite'|'smart';

env.allowLocalModels=false;
env.useBrowserCache=true;

try{
  const wasm=(env as any).backends?.onnx?.wasm;
  if(wasm){
    wasm.numThreads=Math.max(1,Math.min(2,self.navigator?.hardwareConcurrency||1));
    wasm.proxy=false;
  }
}catch{}

const MODELS:Record<Tier,string>={
  lite:'onnx-community/Qwen2.5-0.5B-Instruct',
  smart:'onnx-community/Qwen2.5-1.5B-Instruct'
};

let generator:any=null;
let tier:Tier|null=null;
let backend='none';
let modelId='';

function post(data:any){(self as DedicatedWorkerGlobalScope).postMessage(data)}

async function openGenerator(requested:Tier,preferWebgpu:boolean,allowSmartWasm:boolean,models?:Partial<Record<Tier,string>>){
  const attempts:{tier:Tier;device:'webgpu'|'wasm'|'default';dtype:'q4'|'q8';label:string}[]=[];

  // Prefer explicit backends. On Windows, a navigator.gpu object can exist even
  // when no adapter is actually available, so Lite never depends on WebGPU.
  if(requested==='smart'&&preferWebgpu){
    attempts.push({tier:'smart',device:'webgpu',dtype:'q4',label:'Smart · WebGPU q4'});
  }
  if(requested==='smart'&&allowSmartWasm){
    attempts.push({tier:'smart',device:'wasm',dtype:'q8',label:'Smart · CPU/WASM q8'});
    attempts.push({tier:'smart',device:'wasm',dtype:'q4',label:'Smart · CPU/WASM q4'});
  }
  attempts.push({tier:'lite',device:'wasm',dtype:'q8',label:requested==='smart'?'Compatibilidade Lite · CPU/WASM q8':'Lite · CPU/WASM q8'});
  attempts.push({tier:'lite',device:'wasm',dtype:'q4',label:'Lite · CPU/WASM q4'});
  attempts.push({tier:'lite',device:'default',dtype:'q4',label:'Lite · backend automático'});

  let lastError:any=null;
  for(const attempt of attempts){
    try{
      post({type:'progress',tier:requested,progress:null,status:'preparando '+attempt.label});
      const options:any={
        dtype:attempt.dtype,
        progress_callback:(p:any)=>post({
          type:'progress',
          tier:requested,
          progress:typeof p?.progress==='number'?p.progress:null,
          status:String(p?.status||p?.file||'carregando')+' · '+attempt.label
        })
      };
      if(attempt.device!=='default')options.device=attempt.device;

      const selectedModel=String(models?.[attempt.tier]||MODELS[attempt.tier]);
      const next=await pipeline('text-generation',selectedModel,options);
      return {
        generator:next,
        backend:attempt.device==='webgpu'?'webgpu':'wasm',
        actualTier:attempt.tier,
        modelId:selectedModel,
        label:attempt.label
      };
    }catch(error:any){
      lastError=error;
      post({
        type:'backend-failed',
        tier:requested,
        backend:attempt.device,
        message:error?.message||String(error),
        label:attempt.label
      });
      await new Promise(r=>setTimeout(r,240));
    }
  }
  throw lastError||new Error('Nenhum backend neural local compatível foi encontrado.');
}

async function infer(messages:any[],maxNewTokens:number,temperature:number){
  if(!generator)throw new Error('Modelo local não carregado.');
  const out=await generator(messages,{
    max_new_tokens:maxNewTokens,
    temperature,
    do_sample:temperature>0.15,
    top_p:.88,
    repetition_penalty:1.12
  });
  const result=out?.[0]?.generated_text;
  if(Array.isArray(result))return String(result[result.length-1]?.content||'');
  return String(result||'');
}

(self as DedicatedWorkerGlobalScope).onmessage=async(event:MessageEvent)=>{
  const msg=event.data||{};
  try{
    if(msg.type==='load'){
      if(generator&&tier===msg.tier){
        post({type:'ready',tier,backend,modelId,actualTier:tier});
        return;
      }
      generator=null;
      tier=msg.tier;
      backend='none';
      modelId='';
      const opened=await openGenerator(msg.tier,!!msg.webgpu,!!msg.allowSmartWasm,msg.models);
      generator=opened.generator;
      backend=opened.backend;
      modelId=opened.modelId;
      tier=opened.actualTier;

      post({type:'progress',tier:msg.tier,progress:100,status:'validando inferência · '+opened.label});
      const probe=await infer([
        {role:'system',content:'Responda apenas OK.'},
        {role:'user',content:'OK?'}
      ],6,0.1);
      if(!probe.trim())throw new Error('O modelo carregou, mas o autoteste retornou vazio.');
      post({type:'ready',tier:msg.tier,actualTier:tier,backend,modelId,label:opened.label});
      return;
    }

    if(msg.type==='generate'){
      if(!generator)throw new Error('Modelo local não carregado.');
      const chat=[
        {role:'system',content:msg.system},
        ...(Array.isArray(msg.messages)?msg.messages.slice(-10):[]),
        {role:'user',content:msg.prompt}
      ];
      const text=await infer(chat,msg.maxNewTokens||420,msg.temperature||0.42);
      post({type:'result',id:msg.id,text});
    }
  }catch(error:any){
    post({type:'error',id:msg.id||0,message:error?.message||String(error)});
  }
};
