import { env, pipeline, RawImage, type ImageClassificationPipeline } from '@huggingface/transformers';
import { BROWSER_ANIMAL_MODEL, BROWSER_ANIMAL_REVISION, animalResult } from '../lib/vision/animal-contract';

env.allowLocalModels=false;
env.useBrowserCache=true;
// One CPU thread in a dedicated worker keeps the UI and weaker devices responsive.
if(env.backends.onnx.wasm){env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;}
type LoadOptions={revision:string;device:'wasm';dtype:'q8';progress_callback:(p:{status?:string;progress?:number})=>void};
const loadClassifier=pipeline as unknown as (task:'image-classification',model:string,options:LoadOptions)=>Promise<ImageClassificationPipeline>;
let classifier:ImageClassificationPipeline|null=null;
let busy=false;
self.onmessage=async(event:MessageEvent<{id:number;pixels:Uint8ClampedArray;width:number;height:number}>)=>{
  const {id,pixels,width,height}=event.data;
  if(busy){self.postMessage({id,type:'error',message:'Uma análise já está em andamento.'});return;}
  busy=true;
  try{
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>1024*1024||pixels.length!==width*height*4)throw new Error('Imagem inválida.');
    if(!classifier){
      self.postMessage({id,type:'progress',message:'Baixando o modelo de visão; ele poderá ser reutilizado do cache.'});
      classifier=await loadClassifier('image-classification',BROWSER_ANIMAL_MODEL,{
        revision:BROWSER_ANIMAL_REVISION,device:'wasm',dtype:'q8',
        progress_callback:(p:{status?:string;progress?:number})=>self.postMessage({id,type:'progress',message:p.status==='progress'?'Carregando modelo de visão…':'Preparando análise…',progress:p.progress})
      });
    }
    self.postMessage({id,type:'progress',message:'Analisando a imagem…'});
    const start=performance.now();
    const output=await classifier(new RawImage(pixels,width,height,4),{top_k:20});
    const labels=(classifier.model.config as unknown as {id2label:Record<string,string>}).id2label||{};
    const offset=Object.keys(labels).length===1001?1:0;
    const ids=new Map(Object.entries(labels).map(([k,v])=>[v,Number(k)]));
    const predictions=(output as {label:string;score:number}[]).map(p=>{
      const classId=ids.get(p.label);
      return {...p,classId,animal:classId!==undefined&&classId>=offset&&classId<=397+offset};
    });
    self.postMessage({id,type:'result',result:animalResult('browser',BROWSER_ANIMAL_MODEL,predictions,performance.now()-start)});
  }catch(error){
    classifier=null;
    self.postMessage({id,type:'error',message:error instanceof Error?error.message:'Não foi possível analisar a imagem.'});
  }finally{busy=false;}
};
