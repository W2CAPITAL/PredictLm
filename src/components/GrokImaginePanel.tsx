'use client';

import React,{useEffect,useMemo,useState} from 'react';
import { Download, Film, Image as ImageIcon, Loader2, Play, RefreshCw, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { useStudio } from '@/lib/store';
import { animateImageToWebm, animateStoryboardToWebm, downloadBlob, type LocalMotionStyle } from '@/lib/media/local-motion';
import { buildLocalMotionPlan, buildStoryboardFrames } from '@/lib/media/video-pipelines';

const styles=['Cinematic','Photoreal','Editorial','3D','Anime','Minimal','Product'];
const ratios:{label:string;w:number;h:number}[]=[
  {label:'1:1',w:1024,h:1024},{label:'16:9',w:1344,h:768},{label:'9:16',w:768,h:1344},{label:'4:3',w:1152,h:864}
];
const durations=[6000,10000,12000];
const motions:{id:LocalMotionStyle;label:string}[]=[
  {id:'push-in',label:'Push-in'},
  {id:'pan-right',label:'Pan →'},
  {id:'pan-left',label:'← Pan'},
  {id:'drift',label:'Drift'}
];

type MediaItem={
  id:string;
  kind?:'image'|'video'|'storyboard';
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
  meta?:Record<string,any>|null;
  created_at?:string;
};

export function GrokImaginePanel(){
  const [prompt,setPrompt]=useState('');
  const [style,setStyle]=useState('Cinematic');
  const [ratio,setRatio]=useState(ratios[0]);
  const [seed,setSeed]=useState(1);
  const [mode,setMode]=useState<'image'|'video'>('image');
  const [generated,setGenerated]=useState('');
  const [generatedPrompt,setGeneratedPrompt]=useState('');
  const [provider,setProvider]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [gallery,setGallery]=useState<MediaItem[]>([]);
  const [persisted,setPersisted]=useState(false);
  const [motionBusy,setMotionBusy]=useState(false);
  const [motionProgress,setMotionProgress]=useState(0);
  const [motionUrl,setMotionUrl]=useState('');
  const [motionMime,setMotionMime]=useState('');
  const [motionSize,setMotionSize]=useState(0);
  const [duration,setDuration]=useState(6000);
  const [motion,setMotion]=useState<LocalMotionStyle>('push-in');
  const [videoVariant,setVideoVariant]=useState<'storyboard'|'single'>('storyboard');
  const [videoStage,setVideoStage]=useState('');
  const addFile=useStudio(s=>s.addFile);

  const enhanced=useMemo(
    ()=>prompt.trim()?prompt.trim()+', '+style.toLowerCase()+', premium composition, coherent lighting, high detail, no watermark':'',
    [prompt,style]
  );
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

  useEffect(()=>()=>{
    if(motionUrl)URL.revokeObjectURL(motionUrl);
  },[motionUrl]);

  async function saveLibrary(input:{
    kind:'image'|'video'|'storyboard';
    status?:string;
    provider?:string;
    model?:string;
    url?:string|null;
    meta?:Record<string,any>;
  }){
    const saved=await fetch('/api/media/library',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        kind:input.kind,
        status:input.status||'ready',
        provider:input.provider||provider||'predict-media',
        model:input.model||'',
        prompt,
        enhancedPrompt:enhanced,
        style,
        aspectRatio:ratio.label,
        width:ratio.w,
        height:ratio.h,
        seed,
        url:input.url&&String(input.url).startsWith('data:')?null:input.url,
        meta:{surface:'imagine',storageMode:'metadata-only',...(input.meta||{})}
      })
    }).then(x=>x.json()).catch(()=>null);

    if(saved?.item){
      setPersisted(true);
      setGallery(prev=>[saved.item,...prev.filter(x=>x.id!==saved.item.id)].slice(0,60));
    }
    return saved?.item||null;
  }

  async function createImageUrl(renderPrompt:string,renderSeed:number){
    const r=await fetch('/api/media/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt:renderPrompt,width:ratio.w,height:ratio.h,seed:renderSeed,model:'flux'})
    });
    const data=await r.json();
    if(!r.ok||!data?.url)throw new Error(data?.error||'A geração não retornou imagem.');
    return {url:String(data.url),provider:String(data.provider||''),model:String(data.model||'flux')};
  }

  async function requestImage(){
    if(!enhanced)throw new Error('Descreva a imagem ou vídeo que você quer criar.');
    setLoading(true);
    setError('');
    if(motionUrl){
      URL.revokeObjectURL(motionUrl);
      setMotionUrl('');
    }
    setMotionSize(0);
    try{
      const data=await createImageUrl(enhanced,seed);
      const url=data.url;
      setGenerated(url);
      setGeneratedPrompt(enhanced);
      setProvider(data.provider||'');
      await saveLibrary({
        kind:'image',
        provider:data.provider||'pollinations-proxy',
        model:data.model||'flux',
        url,
        meta:{keyframeForVideo:mode==='video'}
      });
      return url;
    }finally{
      setLoading(false);
    }
  }

  async function generateImage(){
    if(loading||motionBusy)return;
    try{await requestImage()}
    catch(e:any){setError(e?.message||'Falha ao gerar imagem.')}
  }

  function savePrompt(){
    if(!enhanced)return;
    addFile(
      'media/imagine-'+seed+'.md',
      '# Imagine\n\nPrompt: '+prompt+
      '\n\nMode: '+mode+
      '\nStyle: '+style+
      '\nAspect: '+ratio.label+
      '\nSeed: '+seed+
      '\nProvider: '+(provider||'auto')+
      '\n\nEnhanced:\n'+enhanced+
      '\n\nMotion plan:\n- '+motionPlan.join('\n- ')+
      '\nDuration: '+duration+'ms\nMotion: '+motion,
      'markdown'
    );
  }

  async function animate(sourceUrl=generated){
    if(!sourceUrl||motionBusy)return null;
    setMotionBusy(true);
    setMotionProgress(0);
    setError('');
    try{
      const blob=await animateImageToWebm({
        imageUrl:sourceUrl,
        width:ratio.w,
        height:ratio.h,
        durationMs:duration,
        motion,
        onProgress:setMotionProgress
      });
      if(motionUrl)URL.revokeObjectURL(motionUrl);
      const url=URL.createObjectURL(blob);
      setMotionUrl(url);
      setMotionMime(blob.type||'video/webm');
      setMotionSize(blob.size);

      await saveLibrary({
        kind:'video',
        provider:'browser-mediarecorder',
        model:'predict-motion-v2',
        url:null,
        meta:{
          durationMs:duration,
          motion,
          mime:blob.type||'video/webm',
          bytes:blob.size,
          sourceImage:sourceUrl
        }
      });
      return blob;
    }catch(e:any){
      setError(e?.message||'Não foi possível gerar o vídeo no navegador.');
      return null;
    }finally{
      setMotionBusy(false);
    }
  }

  async function renderStoryboard(urls:string[],frameLabels:string[]){
    setMotionBusy(true);
    setMotionProgress(0);
    setVideoStage('Carregando cenas');
    setError('');
    try{
      const blob=await animateStoryboardToWebm({
        imageUrls:urls,
        width:ratio.w,
        height:ratio.h,
        durationMs:Math.max(duration,9000),
        onFrameLoaded:(loaded,total)=>{
          setVideoStage('Cena '+loaded+'/'+total+' pronta');
          setMotionProgress((loaded/total)*0.18);
        },
        onProgress:value=>{
          setVideoStage('Renderizando vídeo');
          setMotionProgress(.18+value*.82);
        }
      });
      if(motionUrl)URL.revokeObjectURL(motionUrl);
      const localUrl=URL.createObjectURL(blob);
      setMotionUrl(localUrl);
      setMotionMime(blob.type||'video/webm');
      setMotionSize(blob.size);
      await saveLibrary({
        kind:'video',
        provider:'predict-storyboard',
        model:'predict-storyboard-v1',
        url:null,
        meta:{
          durationMs:Math.max(duration,9000),
          variant:'storyboard',
          frames:urls,
          frameLabels,
          mime:blob.type||'video/webm',
          bytes:blob.size
        }
      });
      return blob;
    }catch(e:any){
      setError(e?.message||'Não foi possível gerar o storyboard em vídeo.');
      return null;
    }finally{
      setVideoStage('');
      setMotionBusy(false);
    }
  }

  async function generateVideo(){
    if(!enhanced||loading||motionBusy)return;
    setError('');
    if(videoVariant==='single'){
      try{
        let source=generated;
        if(!source||generatedPrompt!==enhanced)source=await requestImage();
        await animate(source);
      }catch(e:any){
        setError(e?.message||'Não foi possível gerar o vídeo.');
      }
      return;
    }

    setLoading(true);
    setVideoStage('Planejando 3 cenas');
    try{
      const frames=buildStoryboardFrames(prompt,style,ratio.label);
      const urls:string[]=[];
      let firstProvider='';
      for(let i=0;i<frames.length;i++){
        setVideoStage('Preparando cena '+(i+1)+'/'+frames.length);
        const frame=frames[i];
        const result=await createImageUrl(frame.prompt,Math.min(2147483646,seed+frame.seedOffset));
        urls.push(result.url);
        if(!firstProvider)firstProvider=result.provider;
      }
      if(!urls.length)throw new Error('Nenhuma cena foi criada.');
      setGenerated(urls[0]);
      setGeneratedPrompt(enhanced);
      setProvider(firstProvider||'pollinations-proxy');
      await saveLibrary({
        kind:'image',
        provider:firstProvider||'pollinations-proxy',
        model:'flux',
        url:urls[0],
        meta:{keyframeForVideo:true,storyboard:true,shots:frames.map(x=>x.label)}
      });
      setLoading(false);
      await renderStoryboard(urls,frames.map(x=>x.label));
    }catch(e:any){
      setError(e?.message||'Não foi possível gerar o vídeo.');
      setLoading(false);
      setVideoStage('');
    }
  }

  async function downloadVideo(){
    if(!motionUrl)return;
    const blob=await fetch(motionUrl).then(r=>r.blob());
    const ext=blob.type.includes('mp4')?'mp4':'webm';
    downloadBlob(blob,'predict-video-'+seed+'.'+ext);
  }

  async function removeItem(item:MediaItem){
    if(!window.confirm('Apagar esta geração do histórico?'))return;
    setGallery(prev=>prev.filter(x=>x.id!==item.id));
    await fetch('/api/media/library?id='+encodeURIComponent(item.id),{method:'DELETE'}).catch(()=>null);
  }

  function openItem(item:MediaItem){
    const url=item.remote_url||item.thumbnail_url||'';
    if(url){
      setGenerated(url);
      setGeneratedPrompt(item.enhanced_prompt||item.prompt||'');
    }
    setPrompt(item.prompt||'');
    setStyle(item.style||'Cinematic');
    const next=ratios.find(x=>x.label===item.aspect_ratio);
    if(next)setRatio(next);
    if(item.seed)setSeed(Number(item.seed));
    setProvider(item.provider||'');
    if(item.kind==='video')setMode('video');
    setMotionUrl('');
  }

  function imageFailed(){
    setError('A imagem não carregou. O app agora usa um proxy same-origin; tente gerar novamente para substituir esta geração antiga.');
  }

  const mainBusy=loading||motionBusy;
  const mainProgress=mode==='video'&&motionBusy?Math.round(motionProgress*100):null;

  return <section className="gtool imagine-tool">
    <header className="gtool-head">
      <div>
        <span>Imagine</span>
        <h1>Imagem e vídeo</h1>
        <p>Gere uma imagem ou transforme o prompt em um clipe real no navegador. O Supabase mantém metadados leves; o vídeo fica local até você baixar.</p>
      </div>
      <div className="gmedia-repo-status"><i className={persisted?'online':''}/><span>{persisted?'Media repository conectado':'Media repository iniciando'}</span></div>
    </header>

    <div className="gimagine-grid">
      <div className="gimagine-controls">
        <div className="twincore-badge"><Sparkles size={13}/><div><b>TwinCore Visual</b><span>intent → keyframe → motion → review → export</span></div></div>

        <div className="gmedia-mode-switch">
          <button className={mode==='image'?'active':''} onClick={()=>setMode('image')}><ImageIcon size={13}/>Imagem</button>
          <button className={mode==='video'?'active':''} onClick={()=>setMode('video')}><Film size={13}/>Vídeo</button>
        </div>

        <label><span>Prompt</span><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={mode==='video'?'Descreva a cena do vídeo…':'Descreva a imagem que você quer criar…'}/></label>
        <div className="gimagine-styles">{styles.map(x=><button className={style===x?'active':''} key={x} onClick={()=>setStyle(x)}>{x}</button>)}</div>
        <div className="gimagine-ratios">{ratios.map(x=><button className={ratio.label===x.label?'active':''} key={x.label} onClick={()=>setRatio(x)}>{x.label}</button>)}</div>

        {mode==='video'?<div className="gmedia-video-options">
          <span>Tipo de vídeo</span>
          <div>
            <button className={videoVariant==='storyboard'?'active':''} onClick={()=>setVideoVariant('storyboard')}>3 cenas IA</button>
            <button className={videoVariant==='single'?'active':''} onClick={()=>setVideoVariant('single')}>1 cena + motion</button>
          </div>
          <span>Duração</span>
          <div>{durations.map(ms=><button className={duration===ms?'active':''} key={ms} onClick={()=>setDuration(ms)}>{ms/1000}s</button>)}</div>
          <span>Movimento</span>
          <div>{motions.map(x=><button className={motion===x.id?'active':''} key={x.id} onClick={()=>setMotion(x.id)}>{x.label}</button>)}</div>
        </div>:null}

        <label className="seed-row"><span>Seed</span><input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value)||1)}/><button onClick={()=>setSeed(Math.floor(Math.random()*999999)+1)}><RefreshCw size={13}/></button></label>

        {mode==='image'
          ?<button className="gimagine-generate" onClick={generateImage} disabled={!prompt.trim()||mainBusy}>
            {loading?<Loader2 size={16} className="spin"/>:<WandSparkles size={16}/>}
            {loading?'Gerando imagem…':'Gerar imagem'}
          </button>
          :<button className="gimagine-generate gmedia-video-generate" onClick={generateVideo} disabled={!prompt.trim()||mainBusy}>
            {mainBusy?<Loader2 size={16} className="spin"/>:<Play size={16}/>}
            {motionBusy?(videoStage||'Gerando vídeo')+' '+mainProgress+'%':loading?(videoStage||'Criando cenas…'):'Gerar vídeo'}
          </button>}

        <button className="gimagine-save" onClick={savePrompt} disabled={!prompt.trim()}>Salvar prompt e plano no projeto</button>

        {mode==='video'?<div className="gmedia-motion-card">
          <div><Film size={15}/><span><b>{videoVariant==='storyboard'?'Storyboard IA + render local':'Vídeo local funcional'}</b><small>{videoVariant==='storyboard'?'3 keyframes coerentes + transições + WebM':duration/1000+'s · '+motion+' · WebM'} · sem upload do binário</small></span></div>
          {generated?<button onClick={()=>animate(generated)} disabled={motionBusy||loading}>{motionBusy?'Renderizando '+Math.round(motionProgress*100)+'%':'Animar a imagem atual'}</button>:null}
          {motionUrl?<div className="gmedia-motion-actions"><a href={motionUrl} target="_blank" rel="noreferrer">Prévia</a><button onClick={downloadVideo}><Download size={12}/>Baixar vídeo</button></div>:null}
          {motionSize?<small className="gmedia-video-meta">{(motionSize/1024/1024).toFixed(2)} MB · {motionMime||'video/webm'}</small>:null}
        </div>:null}

        {error?<div className="gmedia-error">{error}</div>:null}
      </div>

      <div className="gimagine-canvas">
        {generated?<div className="gimagine-result">
          <img src={generated} alt={prompt} onError={imageFailed}/>
          <div className="gmedia-result-actions">
            <a href={generated} target="_blank" rel="noreferrer"><Download size={14}/>Abrir imagem</a>
            {provider?<span>{provider}</span>:null}
          </div>
        </div>:<div className="gimagine-empty">{mode==='video'?<Film size={34}/>:<ImageIcon size={33}/>}<h2>{mode==='video'?'Seu vídeo aparece aqui':'Sua imagem aparece aqui'}</h2><p>{mode==='video'?'O app cria o keyframe e renderiza um clipe local reproduzível.':'Escolha o estilo, proporção e descreva a cena.'}</p></div>}

        {motionUrl?<div className="gmedia-video-preview"><video src={motionUrl} controls loop playsInline autoPlay/><span>Vídeo gerado localmente. Use “Baixar vídeo” para salvar o arquivo.</span></div>:null}
      </div>
    </div>

    <section className="gmedia-library">
      <div className="gmedia-library-head"><div><span>Media Library</span><h2>Gerações recentes</h2></div><small>{persisted?'Supabase metadata-only · retenção leve':'Conectando ao repositório leve'}</small></div>
      {gallery.length?<div className="gmedia-gallery">{gallery.map(item=><article key={item.id}>
        <button className="gmedia-gallery-open" onClick={()=>openItem(item)}>
          {item.remote_url||item.thumbnail_url?<img src={item.thumbnail_url||item.remote_url||''} alt={item.prompt}/>:<div className="gmedia-gallery-empty">{item.kind==='video'?<Film size={20}/>:<ImageIcon size={20}/>}</div>}
          <span><b>{item.prompt}</b><small>{item.kind==='video'?'Vídeo':item.style||'Imagem'} · {item.aspect_ratio||''} · seed {item.seed||'—'}</small></span>
        </button>
        <button className="gmedia-gallery-delete" onClick={()=>removeItem(item)} title="Apagar do histórico"><Trash2 size={12}/></button>
      </article>)}</div>:<div className="gmedia-library-empty">As imagens e vídeos gerados aparecerão aqui.</div>}
    </section>
  </section>
}
