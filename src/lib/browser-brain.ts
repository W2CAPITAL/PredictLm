import { knowledgeContext, retrieveKnowledge } from './assistant-knowledge';

export type NeuralTier='lite'|'smart';
export type BrainEngine='native'|'neural-lite'|'neural-smart'|'knowledge';

export interface BrainReply {
  content:string;
  engine:BrainEngine;
  sources?:{title:string;source:string}[];
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
    if(msg.type==='error'&&msg.id&&pending.has(msg.id)){pending.get(msg.id)!.reject(new Error(msg.message));pending.delete(msg.id);}
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
      if(msg.type==='ready'&&msg.tier===tier){loadedTier=tier;w.removeEventListener('message',onMessage);resolve();}
      if(msg.type==='error'&&!msg.id){w.removeEventListener('message',onMessage);reject(new Error(msg.message));}
    };
    w.addEventListener('message',onMessage);
    w.postMessage({type:'load',tier,webgpu:caps.webgpu});
  });
}

export function neuralStatus(){return {loaded:!!loadedTier,tier:loadedTier};}

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
  if(/^(oi|ol[aá]|bom dia|boa tarde|boa noite|hey|hello)\b/.test(p))return 'Olá. Posso conversar normalmente, explicar um assunto, pesquisar na web ou, quando você quiser construir software, mudar para o modo **Build**.';
  if(/quem (é|e) voc[eê]|o que voc[eê] (é|e)/.test(p))return 'Sou o **PredictLM**, com duas superfícies: Chat para assistência geral e Build para desenvolvimento. Sem API, uso conhecimento local, memória e DeepThink; quando o Neural Local está ativado, a geração de linguagem roda no seu próprio navegador.';
  const hits=retrieveKnowledge(prompt,5);
  if(hits.length){
    const intro='Encontrei conhecimento interno relevante sobre isso:';
    const body=hits.map((x,i)=>(i+1)+'. **'+x.title+'** — '+x.body).join('\n\n');
    return intro+'\n\n'+body+'\n\nSe quiser, eu também posso transformar isso em um plano, comparar abordagens ou abrir a implementação no modo **Build**.';
  }
  if(/como|explique|o que|porque|por que|qual|quais|programa|c[oó]digo|javascript|typescript|react|next|python/i.test(p)){
    return 'Consigo trabalhar nisso pelo motor local, mas esta pergunta é ampla para o fallback determinístico. Ative **Neural Local** para uma resposta generativa completa, ou use **Web** para eu buscar fontes atuais. O modo Build continua disponível para tarefas de código.';
  }
  return 'Entendi: “'+prompt.slice(0,220)+'”. No modo sem modelo neural carregado eu uso DeepThink + memória + knowledge packs. Para conversa aberta e respostas mais flexíveis, ative **Neural Local**; ele roda no navegador e não usa Ollama nem uma API de inferência.';
}

const SYSTEM=`Você é PredictLM, um assistente geral e de desenvolvimento. Responda em português quando o usuário escrever em português. Seja direto, competente e útil. Não invente que executou ferramentas que não foram executadas. Use o contexto de conhecimento quando for relevante, mas não diga que repositórios equivalem a treinamento do modelo. Quando a tarefa for construir/editar software, você pode sugerir o modo Build, mas ainda responda à pergunta normal do usuário.`;

export async function answerLocally(prompt:string,messages:{role:string;content:string}[],options?:{preferNative?:boolean;knowledge?:boolean}):Promise<BrainReply>{
  const context=options?.knowledge===false?'':knowledgeContext(prompt,5);
  const system=SYSTEM+(context?'\n\nContexto recuperado:\n'+context:'');
  const sources=retrieveKnowledge(prompt,5).map(x=>({title:x.title,source:x.source}));
  if(typeof window!=='undefined'&&options?.preferNative!==false){
    try{
      const content=await nativeGenerate(system,prompt);
      if(content.trim())return {content,engine:'native',sources};
    }catch{}
  }
  if(loadedTier){
    try{
      const content=await neuralGenerate(system,prompt,messages);
      if(content.trim())return {content,engine:loadedTier==='smart'?'neural-smart':'neural-lite',sources};
    }catch{}
  }
  return {content:knowledgeReply(prompt),engine:'knowledge',sources};
}
