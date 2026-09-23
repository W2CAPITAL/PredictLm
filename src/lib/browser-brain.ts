import { knowledgeContext, retrieveKnowledge } from './assistant-knowledge';
import { compileSystemPrompt } from './prompt-os/compiler';
import { cleanUserFacingAnswer } from './prompt-os/response-contract';

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
  const source=`
    import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';
    let generator=null;
    let tier=null;
    const MODELS={
      lite:'onnx-community/Qwen2.5-0.5B-Instruct',
      smart:'onnx-community/Qwen2.5-1.5B-Instruct'
    };
    self.onmessage=async(event)=>{
      const msg=event.data;
      try{
        if(msg.type==='load'){
          if(generator&&tier===msg.tier){self.postMessage({type:'ready',tier});return;}
          tier=msg.tier;
          const device=msg.webgpu?'webgpu':'wasm';
          generator=await pipeline('text-generation',MODELS[tier],{
            dtype:'q4',
            device,
            progress_callback:(p)=>self.postMessage({type:'progress',tier,progress:p?.progress??null,status:p?.status||p?.file||'loading'})
          });
          self.postMessage({type:'progress',tier,progress:100,status:'validating inference'});
          const probe=await generator([
            {role:'system',content:'You are a health check. Reply only OK.'},
            {role:'user',content:'OK?'}
          ],{max_new_tokens:6,do_sample:false,repetition_penalty:1.0});
          const probeResult=probe?.[0]?.generated_text;
          const probeText=Array.isArray(probeResult)?String(probeResult[probeResult.length-1]?.content||''):String(probeResult||'');
          if(!probeText.trim())throw new Error('Model loaded but inference self-test returned empty output');
          self.postMessage({type:'ready',tier});
        }
        if(msg.type==='generate'){
          if(!generator)throw new Error('Neural model not loaded');
          const chat=[
            {role:'system',content:msg.system},
            ...msg.messages.slice(-10),
            {role:'user',content:msg.prompt}
          ];
          const out=await generator(chat,{
            max_new_tokens:msg.maxNewTokens||420,
            temperature:msg.temperature||0.55,
            do_sample:true,
            repetition_penalty:1.08
          });
          let text='';
          const result=out?.[0]?.generated_text;
          if(Array.isArray(result))text=result[result.length-1]?.content||'';
          else text=String(result||'');
          self.postMessage({type:'result',id:msg.id,text});
        }
      }catch(error){self.postMessage({type:'error',id:msg.id||0,message:error?.message||String(error)});}
    };
  `;
  worker=new Worker(URL.createObjectURL(new Blob([source],{type:'text/javascript'})),{type:'module'});
  worker.onmessage=(event)=>{
    const msg=event.data;
    if(msg.type==='result'&&pending.has(msg.id)){pending.get(msg.id)!.resolve(String(msg.text||''));pending.delete(msg.id);}
    if(msg.type==='error'&&msg.id&&pending.has(msg.id)){lastNeuralError=String(msg.message||'Local neural generation failed');pending.get(msg.id)!.reject(new Error(lastNeuralError));pending.delete(msg.id);}
  };
  return worker;
}

export async function loadNeuralModel(tier:NeuralTier,onProgress?:(p:{progress:number|null;status:string})=>void){
  const w=ensureWorker();
  const caps=browserCapabilities();
  return new Promise<void>((resolve,reject)=>{
    const onMessage=(event:MessageEvent)=>{
      const msg=event.data;
      if(msg.type==='progress'&&msg.tier===tier)onProgress?.({progress:typeof msg.progress==='number'?msg.progress:null,status:String(msg.status||'loading')});
      if(msg.type==='ready'&&msg.tier===tier){loadedTier=tier;lastNeuralError='';w.removeEventListener('message',onMessage);resolve();}
      if(msg.type==='error'&&!msg.id){lastNeuralError=String(msg.message||'Local neural model failed to load');w.removeEventListener('message',onMessage);reject(new Error(lastNeuralError));}
    };
    w.addEventListener('message',onMessage);
    w.postMessage({type:'load',tier,webgpu:caps.webgpu});
  });
}

export function neuralStatus(){return {loaded:!!loadedTier,tier:loadedTier,lastError:lastNeuralError||null};}

async function neuralGenerate(system:string,prompt:string,messages:{role:string;content:string}[]){
  if(!worker||!loadedTier)throw new Error('Neural model not loaded');
  const id=++seq;
  return new Promise<string>((resolve,reject)=>{
    pending.set(id,{resolve,reject});
    worker!.postMessage({type:'generate',id,system,prompt,messages,maxNewTokens:loadedTier==='smart'?520:360,temperature:0.5});
    setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('Local neural generation timed out'));}},120000);
  });
}

function knowledgeReply(prompt:string){
  const math=parseMath(prompt);
  if(math!==null)return 'O resultado é **'+math.toLocaleString('pt-BR',{maximumFractionDigits:10})+'**.';
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
  const recent=messages.slice(-10).map(m=>m.role.toUpperCase()+': '+m.content).join('\n');
  const compiled=compileSystemPrompt({
    userText:prompt,
    extra:[
      recent?'Histórico recente:\n'+recent:'',
      context?'Contexto recuperado:\n'+context:''
    ].filter(Boolean)
  });
  const system=compiled.system;
  const sources=retrieveKnowledge(prompt,5).map(x=>({title:x.title,source:x.source}));
  let fallbackReason='';

  if(typeof window!=='undefined'&&options?.preferNative!==false){
    try{
      const content=await nativeGenerate(system,prompt);
      if(content.trim())return {content:cleanUserFacingAnswer(content),engine:'native',sources};
    }catch(error:any){
      fallbackReason=String(error?.message||'Browser native model unavailable');
    }
  }

  if(loadedTier){
    try{
      const content=await neuralGenerate(system,prompt,messages);
      if(content.trim()){
        lastNeuralError='';
        return {content:cleanUserFacingAnswer(content),engine:loadedTier==='smart'?'neural-smart':'neural-lite',sources};
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
