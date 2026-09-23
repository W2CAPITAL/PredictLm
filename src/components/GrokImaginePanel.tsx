'use client';

import React,{useEffect,useMemo,useState} from 'react';
import { Download, Film, Image as ImageIcon, Loader2, RefreshCw, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { useStudio } from '@/lib/store';
import { animateImageToWebm, downloadBlob } from '@/lib/media/local-motion';
import { buildLocalMotionPlan } from '@/lib/media/video-pipelines';

const styles=['Cinematic','Photoreal','Editorial','3D','Anime','Minimal','Product'];
const ratios:{label:string;w:number;h:number}[]=[
  {label:'1:1',w:1024,h:1024},{label:'16:9',w:1344,h:768},{label:'9:16',w:768,h:1344},{label:'4:3',w:1152,h:864}
];

type MediaItem={
  id:string;
  prompt:string;
  enhanced_prompt?:string|null;
  style?:string|null;
  aspect_ratio?:string|null;
  width?:number|null;
  height?:number|null;
  seed?:number|null;
  remote_url?:string|null;
  thumbnail_url?:string|null;
  provider?:string|null;
  model?:string|null;
  created_at?:string;
};

export function GrokImaginePanel(){
  const [prompt,setPrompt]=useState('');
  const [style,setStyle]=useState('Cinematic');
  const [ratio,setRatio]=useState(ratios[0]);
  const [seed,setSeed]=useState(1);
  const [generated,setGenerated]=useState('');
  const [provider,setProvider]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [gallery,setGallery]=useState<MediaItem[]>([]);
  const [persisted,setPersisted]=useState(false);
  const [motionBusy,setMotionBusy]=useState(false);
  const [motionProgress,setMotionProgress]=useState(0);
  const [motionUrl,setMotionUrl]=useState('');
  const addFile=useStudio(s=>s.addFile);

  const enhanced=useMemo(()=>prompt.trim()?prompt.trim()+', '+style.toLowerCase()+', premium composition, coherent lighting, high detail, no watermark':'',[prompt,style]);
  const motionPlan=useMemo(()=>buildLocalMotionPlan(prompt,ratio.label),[prompt,ratio.label]);

  useEffect(()=>{
    let live=true;
    fetch('/api/media/library',{cache:'no-store'})
      .then(r=>r.json())
      .then(data=>{
        if(!live)return;
        setGallery(Array.isArray(data?.items)?data.items:[]);
        setPersisted(!!data?.persisted);
      })
      .catch(()=>{});
    return()=>{live=false};
  },[]);

  async function generate(){
    if(!enhanced||loading)return;
    setLoading(true);setError('');setMotionUrl('');
    try{
      const r=await fetch('/api/media/generate',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prompt:enhanced,width:ratio.w,height:ratio.h,seed,model:'flux'})
      });
      const data=await r.json();
      if(!r.ok||!data?.url)throw new Error(data?.error||'A geração não retornou imagem.');
      setGenerated(data.url);
      setProvider(data.provider||'');

      const saved=await fetch('/api/media/library',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          kind:'image',
          status:'ready',
          provider:data.provider||'pollinations',
          model:data.model||'flux',
          prompt,
          enhancedPrompt:enhanced,
          style,
          aspectRatio:ratio.label,
          width:ratio.w,
          height:ratio.h,
          seed,
          url:String(data.url).startsWith('data:')?null:data.url,
          meta:{surface:'imagine',storageMode:'metadata-only'}
        })
      }).then(x=>x.json()).catch(()=>null);

      if(saved?.item){
        setPersisted(true);
        setGallery(prev=>[saved.item,...prev.filter(x=>x.id!==saved.item.id)].slice(0,60));
      }
    }catch(e:any){
      setError(e?.message||'Falha ao gerar imagem.');
    }finally{
      setLoading(false);
    }
  }

  function savePrompt(){
    if(!enhanced)return;
    addFile(
      'media/imagine-'+seed+'.md',
      '# Imagine\n\nPrompt: '+prompt+'\n\nStyle: '+style+'\nAspect: '+ratio.label+'\nSeed: '+seed+'\nProvider: '+(provider||'auto')+'\n\nEnhanced:\n'+enhanced+'\n\nMotion plan:\n- '+motionPlan.join('\n- '),
      'markdown'
    );
  }

  async function animate(){
    if(!generated||motionBusy)return;
    setMotionBusy(true);setMotionProgress(0);setError('');
    try{
      const blob=await animateImageToWebm({
        imageUrl:generated,
        width:ratio.w,
        height:ratio.h,
        durationMs:6000,
        onProgress:setMotionProgress
      });
      if(motionUrl)URL.revokeObjectURL(motionUrl);
      setMotionUrl(URL.createObjectURL(blob));
    }catch(e:any){
      setError(e?.message||'Não foi possível animar esta imagem no navegador.');
    }finally{
      setMotionBusy(false);
    }
  }

  async function removeItem(item:MediaItem){
    if(!window.confirm('Apagar esta geração do histórico?'))return;
    setGallery(prev=>prev.filter(x=>x.id!==item.id));
    await fetch('/api/media/library?id='+encodeURIComponent(item.id),{method:'DELETE'}).catch(()=>null);
  }

  function openItem(item:MediaItem){
    const url=item.remote_url||item.thumbnail_url||'';
    if(!url)return;
    setGenerated(url);
    setPrompt(item.prompt||'');
    setStyle(item.style||'Cinematic');
    const next=ratios.find(x=>x.label===item.aspect_ratio);
    if(next)setRatio(next);
    if(item.seed)setSeed(Number(item.seed));
    setProvider(item.provider||'');
    setMotionUrl('');
  }

  return <section className="gtool imagine-tool">
    <header className="gtool-head">
      <div>
        <span>Imagine</span>
        <h1>Imagem + motion local</h1>
        <p>Geração real de imagem, histórico leve e animação WebM no navegador. O Supabase guarda metadados; binários não são enviados por padrão.</p>
      </div>
      <div className="gmedia-repo-status"><i className={persisted?'online':''}/><span>{persisted?'Media repository conectado':'Histórico local/provedor ativo'}</span></div>
    </header>

    <div className="gimagine-grid">
      <div className="gimagine-controls">
        <div className="twincore-badge"><Sparkles size={13}/><div><b>TwinCore Visual</b><span>intent → prompt → render → motion → review</span></div></div>

        <label><span>Prompt</span><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Descreva a imagem que você quer criar…"/></label>
        <div className="gimagine-styles">{styles.map(x=><button className={style===x?'active':''} key={x} onClick={()=>setStyle(x)}>{x}</button>)}</div>
        <div className="gimagine-ratios">{ratios.map(x=><button className={ratio.label===x.label?'active':''} key={x.label} onClick={()=>setRatio(x)}>{x.label}</button>)}</div>

        <label className="seed-row"><span>Seed</span><input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value)||1)}/><button onClick={()=>setSeed(Math.floor(Math.random()*999999)+1)}><RefreshCw size={13}/></button></label>

        <button className="gimagine-generate" onClick={generate} disabled={!prompt.trim()||loading}>
          {loading?<Loader2 size={16} className="spin"/>:<WandSparkles size={16}/>}
          {loading?'Gerando…':'Gerar imagem'}
        </button>
        <button className="gimagine-save" onClick={savePrompt} disabled={!prompt.trim()}>Salvar no projeto</button>

        <div className="gmedia-motion-card">
          <div><Film size={15}/><span><b>Imagem → vídeo local</b><small>6s · pan/zoom · WebM · zero API</small></span></div>
          <button onClick={animate} disabled={!generated||motionBusy}>{motionBusy?Math.round(motionProgress*100)+'%':'Animar 6s'}</button>
          {motionUrl?<div className="gmedia-motion-actions"><a href={motionUrl} target="_blank" rel="noreferrer">Prévia</a><button onClick={async()=>{
            const blob=await fetch(motionUrl).then(r=>r.blob());
            downloadBlob(blob,'predict-motion-'+seed+'.webm');
          }}><Download size={12}/>Baixar WebM</button></div>:null}
        </div>

        {error?<div className="gmedia-error">{error}</div>:null}
      </div>

      <div className="gimagine-canvas">
        {generated?<div className="gimagine-result">
          <img src={generated} alt={prompt} onLoad={()=>setLoading(false)} onError={()=>setLoading(false)}/>
          {loading&&<div className="gimagine-loading"><i/><i/><i/> gerando</div>}
          <div className="gmedia-result-actions">
            <a href={generated} target="_blank" rel="noreferrer"><Download size={14}/>Abrir imagem</a>
            {provider?<span>{provider}</span>:null}
          </div>
        </div>:<div className="gimagine-empty"><ImageIcon size={33}/><h2>Sua imagem aparece aqui</h2><p>Escolha o estilo, proporção e descreva a cena.</p></div>}

        {motionUrl?<div className="gmedia-video-preview"><video src={motionUrl} controls loop playsInline/><span>Motion clip gerado localmente; nada foi enviado ao servidor.</span></div>:null}
      </div>
    </div>

    <section className="gmedia-library">
      <div className="gmedia-library-head"><div><span>Media Library</span><h2>Gerações recentes</h2></div><small>{persisted?'Supabase metadata-only · retenção leve':'Sem Supabase configurado: a geração continua funcionando'}</small></div>
      {gallery.length?<div className="gmedia-gallery">{gallery.map(item=><article key={item.id}>
        <button className="gmedia-gallery-open" onClick={()=>openItem(item)}>
          {item.remote_url||item.thumbnail_url?<img src={item.thumbnail_url||item.remote_url||''} alt={item.prompt}/>:<div className="gmedia-gallery-empty"><ImageIcon size={20}/></div>}
          <span><b>{item.prompt}</b><small>{item.style||'Image'} · {item.aspect_ratio||''} · seed {item.seed||'—'}</small></span>
        </button>
        <button className="gmedia-gallery-delete" onClick={()=>removeItem(item)} title="Apagar do histórico"><Trash2 size={12}/></button>
      </article>)}</div>:<div className="gmedia-library-empty">As imagens geradas aparecerão aqui.</div>}
    </section>
  </section>
}
