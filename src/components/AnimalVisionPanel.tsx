'use client';
import { useEffect, useRef, useState } from 'react';
import { Eye, Upload, X, Send } from 'lucide-react';
import { AnimalVisionClient, type VisionProgress } from '@/lib/vision/animal-client';
import { animalSummary, validateAnimalFile, type AnimalBackend, type AnimalResult } from '@/lib/vision/animal-contract';

type Adapter={id:AnimalBackend;available:boolean};
const labels:Record<AnimalBackend,string>={browser:'No navegador · leve','hog-svm':'HOG + SVM · KamgangAnthony','pytorch-resnet':'ResNet · rt75272','keras-resnet':'Gato, cachorro e cobra · AlvaroVasquezAI'};
export function AnimalVisionPanel({onChat}:{onChat:(text:string)=>void}){
  const client=useRef<AnimalVisionClient|null>(null);
  const controller=useRef<AbortController|null>(null);
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [backend,setBackend]=useState<AnimalBackend>('browser');
  const [adapters,setAdapters]=useState<Adapter[]>([]);
  const [result,setResult]=useState<AnimalResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [progress,setProgress]=useState<VisionProgress>({message:''});
  const upload=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    client.current=new AnimalVisionClient();
    const statusController=new AbortController();
    fetch('/api/vision/animals',{signal:statusController.signal}).then(r=>r.json()).then(d=>setAdapters(d.adapters||[])).catch(()=>{});
    return()=>{statusController.abort();controller.current?.abort();client.current?.cancel();};
  },[]);
  useEffect(()=>{
    if(!file){setPreview('');return;}
    const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);
  },[file]);
  function choose(next?:File){
    if(!next||busy)return;
    setResult(null);setError('');
    try{validateAnimalFile(next);setFile(next);}catch(e){setFile(null);setError((e as Error).message);}
  }
  function stop(){controller.current?.abort();client.current?.cancel();setBusy(false);setProgress({message:'Análise cancelada.'});}
  async function analyze(){
    if(!file||busy||!client.current)return;
    const current=new AbortController();controller.current=current;
    setBusy(true);setError('');setResult(null);
    try{const answer=await client.current.classify(file,backend,setProgress,current.signal);if(!current.signal.aborted)setResult(answer);}
    catch(e){if(!current.signal.aborted)setError((e as Error).message);}
    finally{if(controller.current===current){setBusy(false);controller.current=null;}}
  }
  return <section className="animal-vision">
    <header><span><Eye size={20}/> Visão</span><h1>Que animal é esse?</h1><p>Escolha uma foto e compare as cinco principais hipóteses.</p></header>
    <div className="animal-vision-grid">
      <div className="animal-vision-card">
        <button className="animal-upload" onClick={()=>upload.current?.click()} disabled={busy} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();choose(e.dataTransfer.files[0]);}}>
          {preview?<img src={preview} alt="Foto escolhida para análise"/>:<><Upload size={34}/><b>Escolher ou arrastar foto</b><span>JPEG, PNG ou WebP · até 8 MB</span></>}
        </button>
        <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/>
        <label htmlFor="animal-backend">Analisar com</label>
        <select id="animal-backend" value={backend} disabled={busy} onChange={e=>{setBackend(e.target.value as AnimalBackend);setResult(null);}}>
          {(Object.keys(labels) as AnimalBackend[]).map(id=><option key={id} value={id} disabled={id!=='browser'&&!adapters.some(a=>a.id===id&&a.available)}>{labels[id]}{id!=='browser'&&!adapters.some(a=>a.id===id&&a.available)?' · não configurado':''}</option>)}
        </select>
        <p className="animal-note">{backend==='browser'?'A foto fica neste navegador. Na primeira análise, o modelo é baixado e armazenado em cache quando possível. Sem API paga.':'A foto será enviada ao serviço de visão configurado, somente para esta análise.'}</p>
        <button className="animal-action" onClick={busy?stop:analyze} disabled={!busy&&!file}>{busy?<><X size={16}/>Cancelar</>:<><Eye size={16}/>Identificar animal</>}</button>
        {busy?<div role="status" aria-live="polite"><p>{progress.message}</p>{Number.isFinite(progress.progress)?<progress max={100} value={progress.progress}/>:<progress/>}</div>:null}
        {error?<p role="alert" className="animal-error">{error}</p>:null}
      </div>
      <div className="animal-vision-card animal-result" aria-live="polite">
        {result?<><span className="animal-eyebrow">Resultado da análise</span><h2>{result.verdict==='likely-animal'?result.predictions[0].label:result.verdict==='not-animal'?'Categoria não animal':'Identificação inconclusiva'}</h2><ol>{result.predictions.map((p,i)=><li key={i}><div><span>{p.label}</span><b>{(p.score*100).toFixed(1)}%</b></div><progress max={1} value={p.score}/></li>)}</ol><p className="animal-note">Escores do modelo, não garantia de identificação. Fotos com vários animais, desenhos ou espécies desconhecidas podem gerar erros.</p><button className="animal-action" onClick={()=>onChat(animalSummary(result))}><Send size={15}/>Levar resultado ao Chat</button></>:<><Eye size={42}/><h2>Uma foto, várias hipóteses</h2><p>O resultado aparece aqui após a análise. Use uma foto nítida com o animal em destaque.</p><p className="animal-note">Os modelos dos três projetos ficam disponíveis quando seus pesos estão configurados. O modo do navegador funciona de forma independente.</p></>}
      </div>
    </div>
  </section>;
}
