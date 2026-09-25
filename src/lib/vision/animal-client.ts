'use client';
import { animalResult, validateAnimalFile, type AnimalBackend, type AnimalResult } from './animal-contract';
export type VisionProgress={message:string;progress?:number};

// One client belongs to one panel. Cancellation terminates its worker and download/inference.
export class AnimalVisionClient{
  private worker:Worker|null=null;
  private sequence=0;
  private pendingReject:((reason:Error)=>void)|null=null;
  cancel(){this.pendingReject?.(new DOMException('Análise cancelada.','AbortError'));this.pendingReject=null;this.worker?.terminate();this.worker=null;}
  async classify(file:File,backend:AnimalBackend,onProgress:(p:VisionProgress)=>void,signal:AbortSignal):Promise<AnimalResult>{
    validateAnimalFile(file);
    signal.throwIfAborted();
    if(backend==='auto'){
      onProgress({message:'IA visual · entendendo a cena e o animal…'});
      try{
        const form=new FormData();form.set('file',file);
        const response=await fetch('/api/vision/identify',{method:'POST',body:form,signal});
        const data=await response.json().catch(()=>({}));
        if(response.ok&&Array.isArray(data?.predictions)){
          return animalResult('auto',String(data.model||'multimodal'),data.predictions,data.elapsedMs,{
            semantic:true,
            description:String(data.description||''),
            scientificName:String(data.scientificName||''),
            broadGroup:String(data.broadGroup||''),
            confidence:Number(data.confidence||0)
          });
        }
        if(signal.aborted)signal.throwIfAborted();
        onProgress({message:'IA multimodal indisponível · usando classificador local como fallback…'});
      }catch(error){
        if(signal.aborted)throw error;
        onProgress({message:'IA multimodal indisponível · usando classificador local como fallback…'});
      }
      backend='browser';
    }
    if(backend!=='browser'){
      onProgress({message:'Enviando a foto ao serviço configurado…'});
      const form=new FormData();form.set('file',file);form.set('backend',backend);
      const response=await fetch('/api/vision/animals',{method:'POST',body:form,signal});
      const data=await response.json();
      if(!response.ok)throw new Error(String(data.error||'Não foi possível analisar a imagem.'));
      return animalResult(backend,String(data.model||backend),data.predictions,data.elapsedMs);
    }
    if(this.pendingReject)throw new Error('Aguarde a análise atual.');
    onProgress({message:'Preparando a foto…'});
    const bitmap=await createImageBitmap(file);
    try{
      if(bitmap.width*bitmap.height>24_000_000)throw new Error('Use uma foto com até 24 megapixels.');
      signal.throwIfAborted();
      const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas indisponível.');
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const worker=this.worker||(this.worker=new Worker(new URL('../../workers/animal-vision.worker.ts',import.meta.url),{type:'module'}));
      const id=++this.sequence;
      return await new Promise<AnimalResult>((resolve,reject)=>{
        const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);this.pendingReject=null;worker.onmessage=null;worker.onerror=null;};
        const fail=(err:Error)=>{finish();reject(err);};
        const abort=()=>this.cancel();
        const timer=setTimeout(()=>{this.cancel();},180000);
        this.pendingReject=fail;
        signal.addEventListener('abort',abort,{once:true});
        worker.onerror=()=>{fail(new Error('O módulo de visão não iniciou. Verifique a conexão e tente novamente.'));worker.terminate();this.worker=null;};
        worker.onmessage=({data})=>{
          if(data.id!==id)return;
          if(data.type==='progress'){onProgress(data);return;}
          if(data.type==='error'){fail(new Error('Não foi possível carregar ou executar o modelo de visão. '+String(data.message||'')));worker.terminate();this.worker=null;return;}
          if(data.type==='result'){finish();resolve(data.result);}
        };
        if(signal.aborted){abort();return;}
        worker.postMessage({id,pixels,width:canvas.width,height:canvas.height},[pixels.buffer]);
      });
    }finally{bitmap.close();}
  }
}
