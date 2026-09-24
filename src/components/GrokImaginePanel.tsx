'use client';

import React,{useEffect,useMemo,useState} from 'react';
import { Download, Film, Image as ImageIcon, Loader2, Play, RefreshCw, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { useStudio } from '@/lib/store';
import { animateImageToWebm, animateStoryboardToWebm, downloadBlob, type LocalMotionStyle } from '@/lib/media/local-motion';
import { buildLocalMotionPlan, buildStoryboardFrames } from '@/lib/media/video-pipelines';
import { autoVariationSeed, buildQualityImagePrompt } from '@/lib/media/prompt-quality';
import { preloadGeneratedImage, reviewImageQuality, type ImageQualityReview } from '@/lib/media/image-review';

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
  const [seed,setSeed]=useState(()=>autoVariationSeed());
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
  const [videoProvider,setVideoProvider]=useState<'auto'|'local'|'veo'|'sora'|'seedance'>('auto');
  const [videoProviders,setVideoProviders]=useState<Record<string,{enabled:boolean;label:string;requiresExternalCredits?:boolean}>>({});
  const [recommendedVideoProvider,setRecommendedVideoProvider]=useState<string>('');
  const [remoteVideoUrl,setRemoteVideoUrl]=useState('');
  const [videoStage,setVideoStage]=useState('');
  const [attempt,setAttempt]=useState(0);
  const [review,setReview]=useState<ImageQualityReview|null>(null);
  const [imageStage,setImageStage]=useState('');
  const addFile=useStudio(s=>s.addFile);

  const enhanced=useMemo(
    ()=>prompt.trim()?buildQualityImagePrompt(prompt,{
      style,
      attempt,
      previousPrompt:attempt>0?generatedPrompt||undefined:undefined
    }):'',
    [prompt,style,attempt,generatedPrompt]
  );
  const motionPlan=useMemo(()=>buildLocalMotionPlan(prompt,ratio.label),[prompt,ratio.label]);

  function reportMediaError(message:string,metadata:Record<string,any>={}){
    fetch('/api/feedback',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({kind:'error',surface:'media',message,metadata:{mode,videoProvider,videoVariant,...metadata}})
    }).catch(()=>{});
  }

  useEffect(()=>{
    let live=true;
    Promise.all([
      fetch('/api/media/library',{cache:'no-store'}).then(r=>r.json()).catch(()=>({items:[],persisted:false})),
      fetch('/api/media/video',{cache:'no-store'}).then(r=>r.json()).catch(()=>({providers:{local:{enabled:true,label:'Local storyboard'}}}))
    ]).then(([media,video])=>{
      if(!live)return;
      setGallery(Array.isArray(media?.items)?media.items:[]);
      setPersisted(!!media?.persisted);
      setVideoProviders(video?.providers||{local:{enabled:true,label:'Motion local · fallback'}});
      setRecommendedVideoProvider(String(video?.recommended||''));
      if(video?.recommended)setVideoProvider('auto');
      else setVideoProvider('local');
    });
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
    const url=String(data.url);
    setImageStage('Finalizando imagem…');
    await preloadGeneratedImage(url);
    return {url,provider:String(data.provider||''),model:String(data.model||'flux')};
  }

  async function upscaleImageUrl(sourceUrl:string){
    try{
      setImageStage('Aplicando super-resolução…');
      const r=await fetch('/api/media/upscale',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sourceUrl,scale:2,model:'realesrgan-x4plus'})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data?.upscaled||!data?.url)return {url:sourceUrl,upscaled:false,provider:''};
      const url=String(data.url);
      await preloadGeneratedImage(url);
      return {url,upscaled:true,provider:String(data.provider||'configured-upscaler')};
    }catch{
      return {url:sourceUrl,upscaled:false,provider:''};
    }
  }

  async function requestImage(options?:{regenerate?:boolean}){
    if(!prompt.trim())throw new Error('Descreva a imagem ou vídeo que você quer criar.');
    const regenerate=!!options?.regenerate&&!!generated;
    setLoading(true);
    setImageStage(regenerate?'Analisando a imagem anterior…':'Preparando a melhor composição…');
    setError('');
    setRemoteVideoUrl('');
    if(motionUrl){
      URL.revokeObjectURL(motionUrl);
      setMotionUrl('');
    }
    setMotionSize(0);

    let nextReview:ImageQualityReview|null=null;
    let nextAttempt=regenerate?attempt+1:0;
    let nextSeed=regenerate?autoVariationSeed(seed):autoVariationSeed(seed);

    try{
      if(regenerate){
        try{
          nextReview=await reviewImageQuality(generated);
          setReview(nextReview);
        }catch{
          nextReview=null;
        }
      }else{
        setReview(null);
      }

      setImageStage(regenerate?'Criando uma composição diferente e melhor…':'Gerando imagem em alta qualidade…');
      const basePrompt=buildQualityImagePrompt(prompt,{
        style,
        attempt:nextAttempt,
        previousPrompt:regenerate?generatedPrompt||undefined:undefined
      });
      const reviewHints=nextReview?.promptHints?.length
        ? '. Correções objetivas da geração anterior: '+nextReview.promptHints.join('; ')+'.'
        : '';
      const uniqueness=regenerate
        ? '. Use a substantially different camera position, framing, subject placement and composition. Do not reproduce the previous image.'
        : '';
      const renderPrompt=basePrompt+reviewHints+uniqueness;

      setSeed(nextSeed);
      setAttempt(nextAttempt);
      let data=await createImageUrl(renderPrompt,nextSeed);
      let url=data.url;

      setImageStage('Revisando nitidez e exposição…');
      let finalReview=await reviewImageQuality(url).catch(()=>null);

      // One automatic repair attempt prevents a visibly weak first render
      // from becoming the final asset. It never loops indefinitely.
      if(!regenerate&&finalReview&&finalReview.score<72){
        const repairSeed=autoVariationSeed(nextSeed);
        const repairPrompt=buildQualityImagePrompt(prompt,{
          style,
          attempt:nextAttempt+1,
          previousPrompt:renderPrompt
        })+'. Correções obrigatórias: '+finalReview.promptHints.join('; ')+'. Preserve the subject but replace the weak composition. Crisp focal detail, coherent anatomy/geometry, no blur, no smeared textures.';
        setImageStage('Qualidade abaixo do gate · regenerando uma vez…');
        data=await createImageUrl(repairPrompt,repairSeed);
        url=data.url;
        nextSeed=repairSeed;
        nextAttempt+=1;
        setSeed(nextSeed);
        setAttempt(nextAttempt);
        finalReview=await reviewImageQuality(url).catch(()=>finalReview);
      }

      setReview(finalReview);
      const upscaled=await upscaleImageUrl(url);
      url=upscaled.url;

      setGenerated(url);
      setGeneratedPrompt(renderPrompt);
      setProvider(upscaled.upscaled?(data.provider||'image')+' + '+upscaled.provider:(data.provider||''));
      await saveLibrary({
        kind:'image',
        provider:upscaled.upscaled?upscaled.provider:(data.provider||'pollinations-proxy'),
        model:data.model||'flux',
        url,
        meta:{
          keyframeForVideo:mode==='video',
          attempt:nextAttempt,
          previousQuality:nextReview?.score??null,
          finalQuality:finalReview?.score??null,
          autoQualityRepair:!regenerate&&nextAttempt>0,
          superResolution:upscaled.upscaled,
          autoVariation:true
        }
      });
      return url;
    }finally{
      setImageStage('');
      setLoading(false);
    }
  }

  async function generateImage(){
    if(loading||motionBusy)return;
    try{await requestImage({regenerate:false})}
    catch(e:any){
      const message=e?.message||'Falha ao gerar imagem.';
      setError(message);
      reportMediaError(message,{stage:'image'});
    }
  }

  async function regenerateImage(){
    if(!generated||loading||motionBusy)return;
    try{await requestImage({regenerate:true})}
    catch(e:any){
      const message=e?.message||'Falha ao regenerar a imagem.';
      setError(message);
      reportMediaError(message,{stage:'image-regenerate'});
    }
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
      const message=e?.message||'Não foi possível gerar o vídeo no navegador.';
      setError(message);
      reportMediaError(message,{stage:'single-motion'});
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
      const message=e?.message||'Não foi possível gerar o storyboard em vídeo.';
      setError(message);
      reportMediaError(message,{stage:'storyboard'});
      return null;
    }finally{
      setVideoStage('');
      setMotionBusy(false);
    }
  }

  async function generateRemoteVideo(){
    setMotionBusy(true);
    setMotionProgress(0);
    setVideoStage('Enviando para '+videoProvider);
    setError('');
    setRemoteVideoUrl('');
    try{
      const currentImage=generated&&generatedPrompt===enhanced?generated:undefined;
      const create=await fetch('/api/media/video',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          provider:videoProvider,
          prompt:enhanced,
          duration:Math.max(3,Math.round(duration/1000)),
          imageUrl:currentImage
        })
      });
      const initial=await create.json();
      if(!create.ok)throw new Error(initial?.error||'Falha ao iniciar vídeo IA.');

      let videoUrl=initial?.videoUrl||'';
      const taskId=String(initial?.taskId||'');
      if(!videoUrl&&!taskId)throw new Error('Provider não retornou uma tarefa válida.');

      if(!videoUrl){
        for(let attempt=0;attempt<72;attempt++){
          setVideoStage('Gerando vídeo real · '+Math.round((attempt+1)*5)+'s');
          setMotionProgress(Math.min(.94,.08+(attempt/72)*.86));
          await new Promise(r=>setTimeout(r,5000));
          const q=new URLSearchParams({provider:videoProvider,taskId});
          const poll=await fetch('/api/media/video?'+q.toString(),{cache:'no-store'});
          const status=await poll.json();
          if(!poll.ok)throw new Error(status?.error||'Falha ao consultar o vídeo.');
          if(status?.status==='failed')throw new Error(status?.error||'O provider não conseguiu gerar o vídeo.');
          if(status?.status==='completed'&&status?.videoUrl){
            videoUrl=String(status.videoUrl);
            break;
          }
        }
      }
      if(!videoUrl)throw new Error('A geração excedeu 6 minutos sem concluir.');

      setRemoteVideoUrl(videoUrl);
      setMotionProgress(1);
      await saveLibrary({
        kind:'video',
        provider:videoProvider==='auto'?(recommendedVideoProvider||'auto'):videoProvider,
        model:videoProvider==='auto'?(recommendedVideoProvider||'auto'):videoProvider,
        url:videoUrl,
        meta:{
          durationMs:duration,
          variant:'remote-generative-video',
          sourceImage:currentImage||null
        }
      });
      return videoUrl;
    }catch(e:any){
      const message=e?.message||'Não foi possível gerar o vídeo IA.';
      setError(message);
      reportMediaError(message,{stage:'remote-video',provider:videoProvider});
      return null;
    }finally{
      setVideoStage('');
      setMotionBusy(false);
    }
  }

  async function generateVideo(){
    if(!enhanced||loading||motionBusy)return;
    setError('');
    if(videoProvider!=='local'){
      await generateRemoteVideo();
      return;
    }
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
      const message=e?.message||'Não foi possível gerar o vídeo.';
      setError(message);
      reportMediaError(message,{stage:'video-orchestration'});
      setLoading(false);
      setVideoStage('');
    }
  }

  async function downloadVideo(){
    if(remoteVideoUrl){
      window.open(remoteVideoUrl,'_blank','noopener,noreferrer');
      return;
    }
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
    setAttempt(Number(item.meta?.attempt||0));
    setReview(null);
    setProvider(item.provider||'');
    if(item.kind==='video'){
      setMode('video');
      if(item.remote_url)setRemoteVideoUrl(item.remote_url);
    }else setRemoteVideoUrl('');
    setMotionUrl('');
  }

  function imageFailed(){
    const message='A imagem não carregou. Tente gerar novamente; gerações novas usam o proxy same-origin.';
    setGenerated('');
    setGeneratedPrompt('');
    setError(message);
    reportMediaError(message,{stage:'image-load'});
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

        <label><span>Prompt</span><textarea value={prompt} onChange={e=>{setPrompt(e.target.value);setAttempt(0);setReview(null)}} placeholder={mode==='video'?'Descreva a cena do vídeo…':'Descreva a imagem que você quer criar…'}/></label>
        <div className="gimagine-styles">{styles.map(x=><button className={style===x?'active':''} key={x} onClick={()=>{setStyle(x);setAttempt(0);setReview(null)}}>{x}</button>)}</div>
        <div className="gimagine-ratios">{ratios.map(x=><button className={ratio.label===x.label?'active':''} key={x.label} onClick={()=>setRatio(x)}>{x.label}</button>)}</div>

        {mode==='video'?<div className="gmedia-video-options">
          <span>Motor</span>
          <div className="gmedia-provider-row">
            {([
              ['auto','Auto · IA generativa'],
              ['veo','Veo 3'],
              ['sora','Sora 2'],
              ['seedance','Seedance 2']
            ] as const).map(([id,label])=>{
              const enabled=id==='local'||!!videoProviders[id]?.enabled;
              return <button
                key={id}
                className={videoProvider===id?'active':''}
                disabled={!enabled}
                title={!enabled?'Configure uma API de vídeo no servidor para habilitar este provider.':id==='local'?'Fallback local: movimento/transição de imagens, não é vídeo generativo.':'Vídeo generativo real; provider externo pode consumir créditos.'}
                onClick={()=>setVideoProvider(id)}
              >{label}{!enabled?' · off':''}</button>
            })}
          </div>
          {videoProvider==='local'?<>
          <span>Fallback local</span><small className="gmedia-provider-note">Este modo anima imagens/keyframes e não sintetiza movimento novo. Use Auto/Veo/Seedance/Sora para vídeo generativo real.</small><span>Tipo de motion</span>
          <div>
            <button className={videoVariant==='storyboard'?'active':''} onClick={()=>setVideoVariant('storyboard')}>3 cenas IA</button>
            <button className={videoVariant==='single'?'active':''} onClick={()=>setVideoVariant('single')}>1 cena + motion</button>
          </div>
          <span>Duração</span>
          <div>{durations.map(ms=><button className={duration===ms?'active':''} key={ms} onClick={()=>setDuration(ms)}>{ms/1000}s</button>)}</div>
          <span>Movimento</span>
          <div>{motions.map(x=><button className={motion===x.id?'active':''} key={x.id} onClick={()=>setMotion(x.id)}>{x.label}</button>)}</div>
          </>:<>
          <span>Duração alvo</span>
          <div>{durations.map(ms=><button className={duration===ms?'active':''} key={ms} onClick={()=>setDuration(ms)}>{ms/1000}s</button>)}</div>
          <small className="gmedia-provider-note">Auto prioriza o primeiro provider generativo configurado no servidor. O fallback local só é usado quando nenhuma API de vídeo está disponível ou quando você o seleciona manualmente.</small>
          </>}
        </div>:null}

        <div className="gmedia-auto-variation"><RefreshCw size={12}/><span>Variação automática</span><small>Cada geração usa uma composição nova; não precisa configurar seed.</small></div>

        {mode==='image'
          ?<div className="gmedia-image-actions">
            <button className="gimagine-generate" onClick={generateImage} disabled={!prompt.trim()||mainBusy}>
              {loading?<Loader2 size={16} className="spin"/>:<WandSparkles size={16}/>}
              {loading?(imageStage||'Gerando imagem…'):'Gerar imagem'}
            </button>
            {generated?<button className="gimagine-regenerate" onClick={regenerateImage} disabled={mainBusy}><RefreshCw size={14}/>Regenerar melhor</button>:null}
          </div>
          :<button className="gimagine-generate gmedia-video-generate" onClick={generateVideo} disabled={!prompt.trim()||mainBusy}>
            {mainBusy?<Loader2 size={16} className="spin"/>:<Play size={16}/>}
            {motionBusy?(videoStage||'Gerando vídeo')+' '+mainProgress+'%':loading?(videoStage||'Criando cenas…'):'Gerar vídeo'}
          </button>}

        <button className="gimagine-save" onClick={savePrompt} disabled={!prompt.trim()}>Salvar prompt e plano no projeto</button>

        {mode==='video'?<div className="gmedia-motion-card">
          <div><Film size={15}/><span><b>{videoProvider!=='local'?'Vídeo generativo real · '+(videoProvider==='auto'?(recommendedVideoProvider||'Auto'):videoProvider):(videoVariant==='storyboard'?'Motion fallback · keyframes':'Motion fallback · 1 imagem')}</b><small>{videoProvider!=='local'?'provider externo assíncrono com movimento sintetizado':(videoVariant==='storyboard'?'keyframes + transições + WebM; não é geração temporal neural':duration/1000+'s · '+motion+' · WebM; não é geração temporal neural')} · histórico leve</small></span></div>
          {videoProvider==='local'&&generated?<button onClick={()=>animate(generated)} disabled={motionBusy||loading}>{motionBusy?'Renderizando '+Math.round(motionProgress*100)+'%':'Animar a imagem atual'}</button>:null}
          {motionUrl||remoteVideoUrl?<div className="gmedia-motion-actions"><a href={remoteVideoUrl||motionUrl} target="_blank" rel="noreferrer">Prévia</a><button onClick={downloadVideo}><Download size={12}/>{remoteVideoUrl?'Abrir vídeo':'Baixar vídeo'}</button></div>:null}
          {motionSize&&!remoteVideoUrl?<small className="gmedia-video-meta">{(motionSize/1024/1024).toFixed(2)} MB · {motionMime||'video/webm'}</small>:null}
        </div>:null}

        {review&&mode==='image'?<div className="gmedia-review"><b>Revisão automática da anterior: {review.score}/100</b><span>{review.observations.join(' · ')}</span></div>:null}
        {error?<div className="gmedia-error">{error}</div>:null}
      </div>

      <div className="gimagine-canvas">
        {loading?<div className="gmedia-loading-stage"><div className="gmedia-loading-orb"/><div className="gmedia-loading-lines"><i/><i/><i/></div><b>{imageStage||videoStage||'Gerando…'}</b><span>A imagem aparece assim que o arquivo estiver realmente carregado.</span></div>:null}
        {generated&&!loading?<div className="gimagine-result">
          <img src={generated} alt={prompt} onError={imageFailed}/>
          <div className="gmedia-result-actions">
            <a href={generated} target="_blank" rel="noreferrer"><Download size={14}/>Abrir imagem</a>
            {provider?<span>{provider}</span>:null}
          </div>
        </div>:<div className="gimagine-empty">{mode==='video'?<Film size={34}/>:<ImageIcon size={33}/>}<h2>{mode==='video'?'Seu vídeo aparece aqui':'Sua imagem aparece aqui'}</h2><p>{mode==='video'?'O app cria o keyframe e renderiza um clipe local reproduzível.':'Escolha o estilo, proporção e descreva a cena.'}</p></div>}

        {motionUrl||remoteVideoUrl?<div className="gmedia-video-preview"><video src={remoteVideoUrl||motionUrl} controls loop playsInline autoPlay/><span>{remoteVideoUrl?'Vídeo generativo retornado pelo provider configurado.':'Vídeo renderizado localmente. Use “Baixar vídeo” para salvar o arquivo.'}</span></div>:null}
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
