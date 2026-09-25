'use client';

import React,{useEffect,useMemo,useState} from 'react';
import { BrainCircuit, Download, Film, Image as ImageIcon, Loader2, Play, RefreshCw, Search, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { useStudio } from '@/lib/store';
import { animateImageToWebm, animateStoryboardToWebm, downloadBlob, type LocalMotionStyle } from '@/lib/media/local-motion';
import { buildGenerativeVideoPrompt, buildLocalMotionPlan, buildStoryboardFrames, formatMediaResearchContext, mediaResearchQuery } from '@/lib/media/video-pipelines';
import { mediaErrorText } from '@/lib/media/media-errors';
import { autoVariationSeed, buildQualityImagePrompt } from '@/lib/media/prompt-quality';
import { isNarutoKuramaVsSasukeSusanooPrompt, recommendedMatchupAspect } from '@/lib/media/canonical-matchup';
import { preloadGeneratedImage, reviewSemanticImage, reviewImageQuality, type ImageQualityReview } from '@/lib/media/image-review';
import { buildDisplayTitle, buildSafeCaptionPtBr, mediaOriginalPrompt, recommendedImageStyle, sanitizeLibraryCaption, shouldForceLiteralMode } from '@/lib/media/media-fidelity';
import { browserMediaLibraryAvailable, deleteBrowserMediaItem, loadBrowserMediaLibrary, saveBrowserMediaItem } from '@/lib/media/browser-media-library';
import {loadCognitiveState} from '@/lib/cognitive/cognitive-memory';
import {frankMediaPrompt} from '@/lib/cognitive/frank-media';

const styles=['Cinematic','Photoreal','Editorial','3D','Anime','Minimal','Product'];
const ratios:{label:string;w:number;h:number}[]=[
  {label:'1:1',w:1024,h:1024},{label:'16:9',w:1344,h:768},{label:'9:16',w:768,h:1344},{label:'4:3',w:1152,h:864}
];
const durations=[4000,6000,8000];
const motions:{id:LocalMotionStyle;label:string}[]=[
  {id:'push-in',label:'Push-in'},
  {id:'pan-right',label:'Pan →'},
  {id:'pan-left',label:'← Pan'},
  {id:'drift',label:'Drift'}
];

function looksSpecificVisualPrompt(input:string){
  return shouldForceLiteralMode(input);
}

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
  const [styleManuallyChosen,setStyleManuallyChosen]=useState(false);
  const [ratio,setRatio]=useState(ratios[0]);
  const [ratioManuallyChosen,setRatioManuallyChosen]=useState(false);
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
  const [videoProvider,setVideoProvider]=useState<'auto'|'local'|'gemini'|'veo'|'sora'|'seedance'|'comfyui'>('auto');
  const [videoProviders,setVideoProviders]=useState<Record<string,{enabled:boolean;label:string;requiresExternalCredits?:boolean}>>({});
  const [recommendedVideoProvider,setRecommendedVideoProvider]=useState<string>('');
  const [remoteVideoUrl,setRemoteVideoUrl]=useState('');
  const [videoStage,setVideoStage]=useState('');
  const [videoProviderWarning,setVideoProviderWarning]=useState('');
  const [attempt,setAttempt]=useState(0);
  const [review,setReview]=useState<ImageQualityReview|null>(null);
  const [imageStage,setImageStage]=useState('');
  const [deepThink,setDeepThink]=useState(false);
  const [deepResearch,setDeepResearch]=useState(false);
  const [frankBrain,setFrankBrain]=useState(false);
  const [directorBrief,setDirectorBrief]=useState('');
  const [researchContext,setResearchContext]=useState('');
  const [generatedRequest,setGeneratedRequest]=useState('');
  const [promptMode,setPromptMode]=useState<'auto'|'literal'|'imagine'>('auto');
  const [negativePrompt,setNegativePrompt]=useState('');
  const [generatedCaption,setGeneratedCaption]=useState('');
  const [imageProviderWarning,setImageProviderWarning]=useState('');
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
    setGallery(loadBrowserMediaLibrary() as MediaItem[]);
    setPersisted(browserMediaLibraryAvailable());
    fetch('/api/media/video',{cache:'no-store'})
      .then(r=>r.json())
      .catch(()=>({providers:{local:{enabled:true,label:'Local storyboard'}}}))
      .then(video=>{
        if(!live)return;
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

  function switchMediaMode(next:'image'|'video'){
    setMode(next);
    setDirectorBrief('');
    setResearchContext('');
    setImageProviderWarning('');
    if(next==='video'){
      setDeepThink(true);
      setDeepResearch(true);
    }else{
      setDeepThink(false);
      setDeepResearch(false);
    }
  }

  function updatePrompt(value:string){
    setPrompt(value);
    setAttempt(0);
    setReview(null);
    setImageProviderWarning('');
    if(mode==='image'&&!styleManuallyChosen){
      const nextStyle=recommendedImageStyle(value,'Cinematic');
      if(nextStyle!==style)setStyle(nextStyle);
    }
    if(mode==='image'&&!ratioManuallyChosen){
      const wanted=recommendedMatchupAspect(value,'1:1');
      const nextRatio=ratios.find(x=>x.label===wanted);
      if(nextRatio&&nextRatio.label!==ratio.label)setRatio(nextRatio);
      if(wanted==='1:1'&&ratio.label!=='1:1')setRatio(ratios[0]);
    }
  }

  async function prepareMediaPrompt(kind:'image'|'video'){
    let research='';
    let brief='';
    let cognition='';
    const frankActive=frankBrain||/\b(frank\s*stein|c[eé]rebro|brain|mem[oó]ria|sentimento|emo[cç][aã]o|mosca predict|human core)\b/i.test(prompt);
    if(frankActive){
      try{
        const state=await loadCognitiveState();
        cognition=frankMediaPrompt(state.frank,kind);
      }catch{}
    }
    const setStage=(message:string)=>kind==='video'?setVideoStage(message):setImageStage(message);
    const literalImage=kind==='image'&&(isNarutoKuramaVsSasukeSusanooPrompt(prompt)||promptMode==='literal'||(promptMode==='auto'&&looksSpecificVisualPrompt(prompt)));
    const useDirector=deepThink||literalImage;

    if(deepResearch){
      setStage('Deep Research · buscando referências úteis…');
      try{
        const response=await fetch('/api/research',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            query:mediaResearchQuery(prompt,kind,style),
            limit:14,
            depth:'comprehensive'
          })
        });
        const data=await response.json().catch(()=>({}));
        if(response.ok)research=formatMediaResearchContext(data);
      }catch{}
    }
    setResearchContext(research);

    if(useDirector){
      setStage(literalImage?'API Director · travando identidade e composição…':'Deep Think · refinando direção visual…');
      try{
        const directorPrompt=[
          'Atue como Media Director do PredictLM.',
          kind==='video'
            ? 'Transforme o pedido em um production brief para UM clipe temporal realmente generativo, com ação ao longo do tempo, câmera, continuidade, física visual e áudio/ambiente quando fizer sentido. Não proponha slideshow, pan/zoom de imagem estática nem cenas desconectadas.'
            : literalImage
              ? 'Produza um identity/composition lock LITERAL para a imagem. Não reescreva criativamente o pedido: detalhe somente características visuais obrigatórias, contagem, relações, composição, câmera e negativas que impeçam drift.'
              : 'Transforme o pedido em um production brief de imagem: sujeito exato, composição, câmera/lente, iluminação, materiais, identidade, detalhes obrigatórios e artefatos a evitar.',
          'Preserve integralmente personagens, marcas, roupas, formas, poderes e relações explicitamente pedidos; não troque por arquétipos genéricos.',
          'PROIBIDO inventar estética de tecnologia/IA sem pedido explícito: não introduza binário, redes neurais, circuitos, drones, hologramas, data streams, cyberpunk, robôs ou fendas dimensionais só porque o produto se chama PredictLM.',
          'Pedido: '+prompt,
          'Estilo: '+style+'. Aspecto: '+ratio.label+'.'+(kind==='video'?' Duração alvo: '+Math.round(duration/1000)+'s.':''),
          cognition?('FRANK STEIN COGNITIVE VISUAL STATE:\n'+cognition):'',
          research?('Contexto pesquisado:\n'+research):'',
          'Responda apenas com um brief operacional compacto. Não exponha raciocínio privado, etapas internas ou debate.'
        ].filter(Boolean).join('\n\n');
        const response=await fetch('/api/chat',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            mode:'media-director',
            prompt:directorPrompt,
            deep:true,
            researchContext:[research,cognition].filter(Boolean).join('\n\n'),
            messages:[]
          })
        });
        const data=await response.json().catch(()=>({}));
        if(response.ok&&typeof data?.content==='string')brief=data.content.trim().slice(0,2600);
      }catch{}
    }
    setDirectorBrief(brief);

    if(kind==='video'){
      return {
        prompt:buildGenerativeVideoPrompt({
          prompt,
          style,
          aspect:ratio.label,
          durationMs:duration,
          directorBrief:brief,
          researchContext:[research,cognition].filter(Boolean).join('\n\n')
        }),
        brief,
        research,
        cognition
      };
    }

    return {
      prompt:literalImage
        ? prompt.trim()
        : [
            buildQualityImagePrompt(prompt,{style,attempt}),
            brief?('MEDIA DIRECTOR BRIEF: '+brief):'',
            research?('RESEARCH-GROUNDED VISUAL NOTES: '+research):'',
            cognition?('FRANK STEIN COGNITIVE STATE: '+cognition):''
          ].filter(Boolean).join('\n\n'),
      brief,
      research,
      cognition
    };
  }

  async function generateSceneCaption(expandedPrompt:string,fallback=''){
    const safeFallback=buildSafeCaptionPtBr(prompt,fallback);
    if(shouldForceLiteralMode(prompt))return safeFallback;
    try{
      const response=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          prompt:[
            'Escreva uma legenda natural em pt-BR de uma frase para a cena solicitada.',
            'Não repita prompt técnico, estilo, seed, resolução, lente, negative prompt ou instruções internas.',
            'Não comece com faça, crie, gere, create ou make.',
            'Pedido: '+prompt,
            expandedPrompt?('Brief visual: '+expandedPrompt.slice(0,900)):'',
            'Comece direto pela descrição da cena.'
          ].filter(Boolean).join('\n\n'),
          deep:false,
          messages:[]
        })
      });
      const data=await response.json().catch(()=>({}));
      if(response.ok&&typeof data?.content==='string'){
        return sanitizeLibraryCaption(data.content,safeFallback);
      }
    }catch{}
    return safeFallback;
  }

  async function saveLibrary(input:{
    kind:'image'|'video'|'storyboard';
    status?:string;
    provider?:string;
    model?:string;
    url?:string|null;
    enhancedPrompt?:string;
    seed?:number;
    style?:string;
    meta?:Record<string,any>;
  }){
    const saved=saveBrowserMediaItem({
      kind:input.kind,
      status:input.status||'ready',
      provider:input.provider||provider||'predict-media',
      model:input.model||'',
      prompt,
      enhancedPrompt:input.enhancedPrompt||enhanced,
      style:input.style||style,
      aspectRatio:ratio.label,
      width:ratio.w,
      height:ratio.h,
      seed:Number.isFinite(Number(input.seed))?Number(input.seed):seed,
      url:input.url&&String(input.url).startsWith('data:')?null:input.url,
      meta:{surface:'imagine',storageMode:'browser-local-metadata',...(input.meta||{})}
    });

    if(saved){
      setPersisted(true);
      setGallery(prev=>[saved as MediaItem,...prev.filter(x=>x.id!==saved.id)].slice(0,60));
    }
    return saved as MediaItem|null;
  }

  async function createImageUrl(renderPrompt:string,renderSeed:number,renderAttempt=attempt,semanticRepair=false,semanticRepairHints='',apiDirectorBrief=''){
    setImageStage('Preparando referências visuais e identidade…');
    const r=await fetch('/api/media/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        prompt:renderPrompt,
        originalPrompt:prompt,
        promptMode,
        negativePrompt,
        style,
        styleLocked:styleManuallyChosen,
        attempt:renderAttempt,
        semanticRepair,
        semanticRepairHints,
        directorBrief:apiDirectorBrief,
        width:ratio.w,
        height:ratio.h,
        seed:renderSeed,
        model:'flux',
        referenceMode:'auto'
      })
    });
    const data=await r.json();
    if(!r.ok||!data?.url)throw new Error(mediaErrorText(data?.error,'A geração não retornou imagem.'));
    const url=String(data.url);
    setImageStage('Finalizando imagem…');
    await preloadGeneratedImage(url);
    return {
      url,
      provider:String(data.provider||''),
      model:String(data.model||'flux'),
      expandedPrompt:String(data.expandedPrompt||renderPrompt),
      referencesUsed:Array.isArray(data.referencesUsed)?data.referencesUsed:[],
      referenceWarnings:Array.isArray(data.referenceWarnings)?data.referenceWarnings:[],
      promptMode:String(data.promptMode||promptMode),
      caption:String(data.caption||''),
      displayTitle:String(data.displayTitle||buildDisplayTitle(prompt)),
      style:String(data.style||style),
      fidelityLimited:!!data.fidelityLimited,
      providerWarning:String(data.providerWarning||'')
    };
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
    setImageProviderWarning('');
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
      const prepared=await prepareMediaPrompt('image');
      const literalRequest=isNarutoKuramaVsSasukeSusanooPrompt(prompt)||promptMode==='literal'||(promptMode==='auto'&&looksSpecificVisualPrompt(prompt));
      const basePrompt=literalRequest
        ? prepared.prompt
        : regenerate
          ? [
              buildQualityImagePrompt(prompt,{
                style,
                attempt:nextAttempt,
                previousPrompt:generatedPrompt||undefined
              }),
              prepared.brief?('MEDIA DIRECTOR BRIEF: '+prepared.brief):'',
              prepared.research?('RESEARCH-GROUNDED VISUAL NOTES: '+prepared.research):''
            ].filter(Boolean).join('\n\n')
          : prepared.prompt;
      const reviewHints=!literalRequest&&nextReview?.promptHints?.length
        ? '. Correções objetivas da geração anterior: '+nextReview.promptHints.join('; ')+'.'
        : '';
      const uniqueness=!literalRequest&&regenerate
        ? '. Use a substantially different camera position, framing, subject placement and composition. Do not reproduce the previous image.'
        : '';
      const renderPrompt=basePrompt+reviewHints+uniqueness;

      setSeed(nextSeed);
      setAttempt(nextAttempt);
      let data=await createImageUrl(renderPrompt,nextSeed,nextAttempt,false,'',prepared.brief||'');
      let url=data.url;
      let expandedPrompt=data.expandedPrompt||renderPrompt;

      if(data.provider==='entity-self-reference'){
        const caption=await generateSceneCaption(expandedPrompt,data.caption);
        setReview(null);
        setGenerated(url);
        setGeneratedPrompt(expandedPrompt);
        setGeneratedRequest(prompt);
        setGeneratedCaption(caption);
        setProvider(data.provider);
        setImageProviderWarning(data.providerWarning||'');
        await saveLibrary({
          kind:'image',
          provider:data.provider,
          model:data.model||'predict-persistent-identity',
          url,
          enhancedPrompt:expandedPrompt,
          seed:nextSeed,
          style:data.style||style,
          meta:{identityExact:true,identityLocked:true,referenceMode:'persistent-self',parityContract:'grok-imagine-parity',promptMode:data.promptMode,caption,displayTitle:data.displayTitle||buildDisplayTitle(prompt),promptOriginal:prompt,frankBrain}
        });
        return url;
      }

      setImageStage('Revisando nitidez e exposição…');
      let finalReview=await reviewImageQuality(url).catch(()=>null);

      const shouldSemanticReview=deepThink||looksSpecificVisualPrompt(prompt)||prompt.length>80;
      let semanticReview=shouldSemanticReview?await reviewSemanticImage(url,prompt):null;
      const semanticRepair=semanticReview?.status==='failed';
      const semanticRepairHints=semanticRepair
        ? (semanticReview?.retryPrompt||semanticReview?.issues?.join('; ')||'').trim()
        : '';

      // One automatic repair pass combines semantic fidelity and technical
      // image-quality feedback. It never loops indefinitely.
      if(!regenerate&&(semanticRepair||(finalReview&&finalReview.score<72&&data.promptMode!=='literal'))){
        const repairSeed=autoVariationSeed(nextSeed);
        const repairPrompt=semanticRepair
          ? [
              prompt,
              semanticRepairHints?('Correções visuais obrigatórias: '+semanticRepairHints):'',
              'Preserve o pedido original e corrija somente divergências realmente visíveis.'
            ].filter(Boolean).join('\n\n')
          : buildQualityImagePrompt(prompt,{
              style,
              attempt:nextAttempt+1,
              previousPrompt:renderPrompt
            })+'. Correções obrigatórias: '+(finalReview?.promptHints||[]).join('; ')+'. Preserve the subject but replace the weak composition. Crisp focal detail, coherent anatomy/geometry, no blur, no smeared textures.';
        setImageStage(semanticRepair?'Fidelidade abaixo do gate · corrigindo uma vez…':'Qualidade abaixo do gate · regenerando uma vez…');
        data=await createImageUrl(repairPrompt,repairSeed,nextAttempt+1,semanticRepair,semanticRepairHints,prepared.brief||'');
        url=data.url;
        expandedPrompt=data.expandedPrompt||repairPrompt;
        nextSeed=repairSeed;
        nextAttempt+=1;
        setSeed(nextSeed);
        setAttempt(nextAttempt);
        finalReview=await reviewImageQuality(url).catch(()=>finalReview);
        if(semanticRepair)semanticReview=await reviewSemanticImage(url,prompt);
      }

      const semanticWarning=semanticReview?.status==='failed'
        ? 'A revisão semântica ainda encontrou divergências visíveis: '+semanticReview.issues.slice(0,3).join('; ')+'.'
        : semanticReview?.status==='unavailable'
          ? 'A fidelidade semântica da cena não pôde ser verificada automaticamente.'
          : '';
      data.providerWarning=[data.providerWarning,semanticWarning].filter(Boolean).join(' ');
      setReview(finalReview);
      const caption=await generateSceneCaption(expandedPrompt,data.caption);
      const upscaled=await upscaleImageUrl(url);
      url=upscaled.url;

      setGenerated(url);
      setGeneratedPrompt(expandedPrompt);
      setGeneratedRequest(prompt);
      setGeneratedCaption(caption);
      setImageProviderWarning(data.providerWarning||'');
      if(data.style&&data.style!==style)setStyle(data.style);
      setProvider(upscaled.upscaled?(data.provider||'image')+' + '+upscaled.provider:(data.provider||''));
      await saveLibrary({
        kind:'image',
        provider:data.provider||'pollinations-proxy',
        model:data.model||'flux',
        url,
        enhancedPrompt:expandedPrompt,
        seed:nextSeed,
        style:data.style||style,
        meta:{
          keyframeForVideo:mode==='video',
          attempt:nextAttempt,
          previousQuality:nextReview?.score??null,
          finalQuality:finalReview?.score??null,
          semanticReview,
          semanticRepair:!regenerate&&semanticRepair,
          autoQualityRepair:!regenerate&&nextAttempt>0,
          superResolution:upscaled.upscaled,
          superResolutionProvider:upscaled.upscaled?upscaled.provider:null,
          autoVariation:true,
          deepThink,
          deepResearch,
          researchGrounded:!!prepared.research,
          frankBrain:!!prepared.cognition,
          directorBrief:prepared.brief||null,
          parityContract:'grok-imagine-parity',
          promptOriginal:prompt,
          promptExpanded:expandedPrompt,
          referenceCount:data.referencesUsed?.length||0,
          referenceWarnings:data.referenceWarnings||[],
          promptMode:data.promptMode||promptMode,
          negativePrompt,
          caption,
          displayTitle:data.displayTitle||buildDisplayTitle(prompt),
          fidelityLimited:!!data.fidelityLimited,
          providerWarning:data.providerWarning||''
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
      const message=mediaErrorText(e,'Falha ao gerar imagem.');
      setError(message);
      reportMediaError(message,{stage:'image'});
    }
  }

  async function regenerateImage(){
    if(!generated||loading||motionBusy)return;
    try{await requestImage({regenerate:true})}
    catch(e:any){
      const message=mediaErrorText(e,'Falha ao regenerar a imagem.');
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
      '\nPrompt mode: '+promptMode+
      (negativePrompt?'\nNegative: '+negativePrompt:'')+
      '\nDeep Think: '+(deepThink?'on':'off')+
      '\nDeep Research: '+(deepResearch?'on':'off')+
      '\n\nEnhanced:\n'+enhanced+
      (directorBrief?'\n\nDirector brief:\n'+directorBrief:'')+
      (researchContext?'\n\nResearch context:\n'+researchContext:'')+
      (generatedCaption?'\n\nScene caption:\n'+generatedCaption:'')+
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
      const message=mediaErrorText(e,'Não foi possível gerar o vídeo no navegador.');
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
      const message=mediaErrorText(e,'Não foi possível gerar o storyboard em vídeo.');
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
    setVideoStage('Preparando geração neural…');
    setError('');
    setVideoProviderWarning('');
    setRemoteVideoUrl('');
    try{
      const prepared=await prepareMediaPrompt('video');
      const videoPrompt=prepared.prompt;
      const currentImage=generated&&generatedRequest===prompt?generated:undefined;

      let referenceImages:string[]=[];
      setVideoStage('Preparando referências visuais…');
      try{
        const refs=await fetch('/api/media/references',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({query:prompt,limit:3})
        });
        const data=await refs.json().catch(()=>({}));
        if(refs.ok&&Array.isArray(data?.references)){
          referenceImages=data.references
            .map((x:any)=>String(x?.imageUrl||'').trim())
            .filter(Boolean)
            .slice(0,3);
        }
      }catch{}

      setVideoStage('Enviando para '+(videoProvider==='auto'?(recommendedVideoProvider||'Auto'):videoProvider));
      const create=await fetch('/api/media/video',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          provider:videoProvider,
          prompt:videoPrompt,
          duration:Math.max(3,Math.round(duration/1000)),
          imageUrl:currentImage,
          referenceImages,
          aspectRatio:ratio.label,
          resolution:'720p',
          seed
        })
      });
      const initial=await create.json().catch(()=>({}));
      if(!create.ok)throw new Error(mediaErrorText(initial?.error,'Falha ao iniciar vídeo IA.'));
      if(initial?.compatibilityWarning)setVideoProviderWarning(String(initial.compatibilityWarning));

      let videoUrl=String(initial?.videoUrl||'');
      const taskId=String(initial?.taskId||'');
      const actualProvider=String(initial?.provider||(videoProvider==='auto'?(recommendedVideoProvider||'auto'):videoProvider));
      if(!videoUrl&&!taskId)throw new Error('Provider não retornou uma tarefa válida.');

      if(!videoUrl){
        for(let pollAttempt=0;pollAttempt<72;pollAttempt++){
          setVideoStage('Gerando vídeo neural · '+Math.round((pollAttempt+1)*5)+'s');
          setMotionProgress(Math.min(.94,.08+(pollAttempt/72)*.86));
          await new Promise(r=>setTimeout(r,5000));
          const q=new URLSearchParams({provider:actualProvider,taskId});
          const poll=await fetch('/api/media/video?'+q.toString(),{cache:'no-store'});
          const status=await poll.json().catch(()=>({}));
          if(!poll.ok)throw new Error(mediaErrorText(status?.error,'Falha ao consultar o vídeo.'));
          if(status?.status==='failed')throw new Error(mediaErrorText(status?.error,'O provider não conseguiu gerar o vídeo.'));
          if(status?.status==='completed'&&status?.videoUrl){
            videoUrl=String(status.videoUrl);
            break;
          }
        }
      }
      if(!videoUrl)throw new Error('A geração excedeu 6 minutos sem concluir.');

      setRemoteVideoUrl(videoUrl);
      setMotionProgress(1);
      setProvider(actualProvider);
      await saveLibrary({
        kind:'video',
        provider:actualProvider,
        model:actualProvider,
        url:videoUrl,
        meta:{
          durationMs:duration,
          effectiveDurationSeconds:Number(initial?.effectiveDuration)||Math.round(duration/1000),
          variant:'remote-generative-video',
          realGenerative:true,
          sourceImage:currentImage||null,
          referenceCount:referenceImages.length,
          deepThink,
          deepResearch,
          researchGrounded:!!prepared.research,
          directorBrief:prepared.brief||null,
          visualInputDowngraded:!!initial?.visualInputDowngraded,
          compatibilityWarning:String(initial?.compatibilityWarning||'')
        }
      });
      return videoUrl;
    }catch(e:any){
      const message=mediaErrorText(e,'Não foi possível gerar o vídeo IA.');
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
        setError(mediaErrorText(e,'Não foi possível gerar o vídeo.'));
      }
      return;
    }

    setLoading(true);
    setVideoStage('Planejando 3 cenas');
    try{
      const prepared=await prepareMediaPrompt('video');
      const frames=buildStoryboardFrames(prepared.prompt,style,ratio.label);
      const urls:string[]=[];
      let firstProvider='';
      for(let i=0;i<frames.length;i++){
        setVideoStage('Preparando cena '+(i+1)+'/'+frames.length);
        const frame=frames[i];
        const frameSeed=Math.min(2147483646,seed+frame.seedOffset);
        const result=await createImageUrl(frame.prompt,frameSeed,i);
        urls.push(result.url);
        if(!firstProvider)firstProvider=result.provider;
      }
      if(!urls.length)throw new Error('Nenhuma cena foi criada.');
      setGenerated(urls[0]);
      setGeneratedPrompt(enhanced);
      setGeneratedRequest(prompt);
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
      const message=mediaErrorText(e,'Não foi possível gerar o vídeo.');
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
    deleteBrowserMediaItem(item.id);
  }

  function openItem(item:MediaItem){
    const url=item.remote_url||item.thumbnail_url||'';
    const original=mediaOriginalPrompt(item)||item.prompt||'';
    if(url){
      setGenerated(url);
      setGeneratedPrompt(item.enhanced_prompt||original);
    }
    setPrompt(original);
    setStyle(item.style||'Cinematic');
    const next=ratios.find(x=>x.label===item.aspect_ratio);
    if(next)setRatio(next);
    if(item.seed)setSeed(Number(item.seed));
    setAttempt(Number(item.meta?.attempt||0));
    setReview(null);
    setProvider(item.provider||'');
    setGeneratedCaption(buildSafeCaptionPtBr(original,String(item.meta?.caption||'')));
    setImageProviderWarning(String(item.meta?.providerWarning||((item.provider||'').includes('pollinations')?'Fallback público: fidelidade de personagens pode ser limitada.':'')));
    if(item.meta?.promptMode==='literal'||item.meta?.promptMode==='imagine'||item.meta?.promptMode==='auto')setPromptMode(item.meta.promptMode);
    if(typeof item.meta?.negativePrompt==='string')setNegativePrompt(item.meta.negativePrompt);
    if(item.kind==='video'){
      setMode('video');
      if(item.remote_url)setRemoteVideoUrl(item.remote_url);
    }else{
      setMode('image');
      setRemoteVideoUrl('');
    }
    setMotionUrl('');
  }

  function imageFailed(){
    const message='A imagem não carregou. Tente gerar novamente; gerações novas usam o proxy same-origin.';
    setGenerated('');
    setGeneratedPrompt('');
    setGeneratedCaption('');
    setImageProviderWarning('');
    setError(message);
    reportMediaError(message,{stage:'image-load'});
  }

  const mainBusy=loading||motionBusy;
  const mainProgress=mode==='video'&&motionBusy?Math.round(motionProgress*100):null;
  const literalUiMode=mode==='image'&&(promptMode==='literal'||(promptMode==='auto'&&looksSpecificVisualPrompt(prompt)));

  return <section className="gtool imagine-tool">
    <header className="gtool-head">
      <div>
        <span>Imagine</span>
        <h1>Imagem e vídeo</h1>
        <p>Imagem com Literal automático para personagens específicos, referências Firecrawl quando disponíveis e biblioteca local no navegador. Vídeo generativo usa providers configurados.</p>
      </div>
      <div className="gmedia-repo-status"><i className={persisted?'online':''}/><span>{persisted?'Biblioteca local ativa':'Biblioteca local indisponível'}</span></div>
    </header>

    <div className="gimagine-grid">
      <div className="gimagine-controls">
        <div className="twincore-badge"><Sparkles size={13}/><div><b>TwinCore Visual</b><span>intent → research → director → reference → generation → temporal review → export</span></div></div>

        <div className="gmedia-mode-switch">
          <button className={mode==='image'?'active':''} onClick={()=>switchMediaMode('image')}><ImageIcon size={13}/>Imagem</button>
          <button className={mode==='video'?'active':''} onClick={()=>switchMediaMode('video')}><Film size={13}/>Vídeo</button>
        </div>

        <label><span>Prompt</span><textarea value={prompt} onChange={e=>updatePrompt(e.target.value)} placeholder={mode==='video'?'Descreva a cena do vídeo…':'Descreva a imagem que você quer criar…'}/></label>
        <div className="gimagine-styles">{styles.map(x=><button className={style===x?'active':''} key={x} onClick={()=>{setStyle(x);setStyleManuallyChosen(true);setAttempt(0);setReview(null)}}>{x}</button>)}</div>
        <div className="gimagine-ratios">{ratios.map(x=><button className={ratio.label===x.label?'active':''} key={x.label} onClick={()=>{setRatio(x);setRatioManuallyChosen(true)}}>{x.label}</button>)}</div>

        {mode==='image'?<div className="gmedia-prompt-mode">
          <span>Interpretação do prompt</span>
          <div>
            <button className={promptMode==='auto'?'active':''} onClick={()=>setPromptMode('auto')} type="button"><b>Auto</b><small>Personagem/franquia específica → literal; pedido genérico → Imagine.</small></button>
            <button className={promptMode==='literal'?'active':''} onClick={()=>setPromptMode('literal')} type="button"><b>Literal</b><small>Zero reescrita criativa. Mantém pedido, identidade, referências e negative.</small></button>
            <button className={promptMode==='imagine'?'active':''} onClick={()=>setPromptMode('imagine')} type="button"><b>Imagine</b><small>Expansão cinematográfica Grok-like antes do provider real.</small></button>
          </div>
          <label><span>Evitar · negative opcional</span><input value={negativePrompt} onChange={e=>setNegativePrompt(e.target.value)} placeholder="ex.: cabelo branco, personagens fundidos, texto, watermark"/></label>
          {literalUiMode?<small className="gmedia-literal-note">Modo literal ativo: Deep Think/Research não reescrevem a imagem; Firecrawl e identity lock continuam ativos.</small>:null}
        </div>:null}

        {mode==='video'?<div className="gmedia-video-options">
          <span>Motor</span>
          <div className="gmedia-provider-row">
            {([
              ['auto','Auto · IA generativa'],
              ['gemini','Gemini Veo 3.1'],
              ['comfyui','ComfyUI · LTX/Custom'],
              ['veo','Veo 3'],
              ['seedance','Seedance 2'],
              ['sora','Sora 2'],
              ['local','Motion fallback']
            ] as const).map(([id,label])=>{
              const enabled=id==='local'||!!videoProviders[id]?.enabled;
              return <button
                key={id}
                className={videoProvider===id?'active':''}
                disabled={!enabled}
                title={!enabled
                  ?'Configure o motor no servidor para habilitar este provider.'
                  :id==='local'
                    ?'Fallback local: movimento/transição de imagens, não é vídeo generativo.'
                    :videoProviders[id]?.requiresExternalCredits
                      ?'Vídeo generativo real; o provider externo pode consumir créditos.'
                      :'Vídeo neural real via motor local/self-hosted configurado.'}
                onClick={()=>setVideoProvider(id)}
              >{label}{!enabled?' · off':''}</button>
            })}
          </div>
          {videoProvider==='local'?<>
          <span>Fallback local</span><small className="gmedia-provider-note">Este modo anima imagens/keyframes e não sintetiza movimento novo. Use Auto/Gemini/ComfyUI/Veo/Seedance/Sora para vídeo generativo real.</small><span>Tipo de motion</span>
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

        <div className="gmedia-reasoning">
          <button className={deepThink&&!literalUiMode?'active':''} onClick={()=>setDeepThink(v=>!v)} type="button" disabled={literalUiMode}>
            <BrainCircuit size={14}/><span><b>Deep Think</b><small>{literalUiMode?'Desligado no Literal para não reescrever o pedido.':'Diretor de mídia refina identidade, composição, ação, câmera, continuidade e áudio antes da geração.'}</small></span>
          </button>
          <button className={deepResearch&&!literalUiMode?'active':''} onClick={()=>setDeepResearch(v=>!v)} type="button" disabled={literalUiMode}>
            <Search size={14}/><span><b>Deep Research</b><small>{literalUiMode?'Referências visuais continuam via Firecrawl sem injetar texto extra.':'Pesquisa referências e evidência visual antes do prompt final. Aumenta a latência para melhorar fidelidade.'}</small></span>
          </button>
          <button className={frankBrain?'active':''} onClick={()=>setFrankBrain(v=>!v)} type="button">
            <BrainCircuit size={14}/><span><b>Frank Brain</b><small>Usa emoção, memória, percepções e estado neural persistente do Frank Stein para compor imagens e vídeos. Ativa automaticamente para pedidos sobre Frank/cérebro/memória/emoções.</small></span>
          </button>
        </div>

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
          <div><Film size={15}/><span><b>{videoProvider!=='local'?'Vídeo generativo real · '+(videoProvider==='auto'?(recommendedVideoProvider||'Auto'):videoProvider):(videoVariant==='storyboard'?'Motion fallback · keyframes':'Motion fallback · 1 imagem')}</b><small>{videoProvider!=='local'?'motor temporal neural assíncrono com movimento sintetizado de verdade':(videoVariant==='storyboard'?'keyframes + transições + WebM; não é geração temporal neural':duration/1000+'s · '+motion+' · WebM; não é geração temporal neural')} · histórico leve</small></span></div>
          {videoProvider==='local'&&generated?<button onClick={()=>animate(generated)} disabled={motionBusy||loading}>{motionBusy?'Renderizando '+Math.round(motionProgress*100)+'%':'Animar a imagem atual'}</button>:null}
          {motionUrl||remoteVideoUrl?<div className="gmedia-motion-actions"><a href={remoteVideoUrl||motionUrl} target="_blank" rel="noreferrer">Prévia</a><button onClick={downloadVideo}><Download size={12}/>{remoteVideoUrl?'Abrir vídeo':'Baixar vídeo'}</button></div>:null}
          {motionSize&&!remoteVideoUrl?<small className="gmedia-video-meta">{(motionSize/1024/1024).toFixed(2)} MB · {motionMime||'video/webm'}</small>:null}
        </div>:null}

        {review&&mode==='image'?<div className="gmedia-review"><b>Qualidade técnica da anterior: {review.score}/100</b><span>{review.observations.join(' · ')}</span></div>:null}
        {error?<div className="gmedia-error">{error}</div>:null}
      </div>

      <div className="gimagine-canvas">
        {mainBusy?<div className="gmedia-loading-stage"><div className="gmedia-loading-orb"/><div className="gmedia-loading-lines"><i/><i/><i/></div><b>{imageStage||videoStage||'Gerando…'}</b><span>{mode==='video'?'O vídeo aparece quando o provider concluir o arquivo real.':'A imagem aparece assim que o arquivo estiver realmente carregado.'}</span></div>:null}
        {generated&&!loading?<div className="gimagine-result">
          <img src={generated} alt={prompt} onError={imageFailed}/>
          <div className="gmedia-result-actions">
            <a href={generated} target="_blank" rel="noreferrer"><Download size={14}/>Abrir imagem</a>
            {provider?<span>{provider}</span>:null}
          </div>
          {imageProviderWarning?<div className="gmedia-provider-warning"><b>Fidelidade limitada</b><span>{imageProviderWarning}</span></div>:null}
          {generatedCaption?<div className="gmedia-result-caption"><b>Cena gerada</b><p>{generatedCaption}</p></div>:null}
        </div>:<div className="gimagine-empty">{mode==='video'?<Film size={34}/>:<ImageIcon size={33}/>}<h2>{mode==='video'?'Seu vídeo aparece aqui':'Sua imagem aparece aqui'}</h2><p>{mode==='video'?'Auto usa um motor temporal real configurado (Veo/ComfyUI/Veo 3/Seedance/Sora); motion local é somente fallback explícito.':'Escolha o estilo, proporção e descreva a cena.'}</p></div>}

        {videoProviderWarning?<div className="gmedia-provider-warning"><b>Compatibilidade do vídeo</b><span>{videoProviderWarning}</span></div>:null}
        {motionUrl||remoteVideoUrl?<div className="gmedia-video-preview"><video src={remoteVideoUrl||motionUrl} controls loop playsInline autoPlay/><span>{remoteVideoUrl?'Vídeo generativo retornado pelo provider configurado.':'Vídeo renderizado localmente. Use “Baixar vídeo” para salvar o arquivo.'}</span></div>:null}
      </div>
    </div>

    <section className="gmedia-library">
      <div className="gmedia-library-head"><div><span>Media Library</span><h2>Gerações recentes</h2></div><small>{persisted?'LocalStorage · somente neste navegador':'Armazenamento local indisponível'}</small></div>
      {gallery.length?<div className="gmedia-gallery">{gallery.map(item=>{
        const original=mediaOriginalPrompt(item)||item.prompt||'';
        const title=String(item.meta?.displayTitle||buildDisplayTitle(original));
        const caption=buildSafeCaptionPtBr(original,String(item.meta?.caption||''));
        return <article key={item.id}>
          <button className="gmedia-gallery-open" onClick={()=>openItem(item)}>
            {item.remote_url||item.thumbnail_url?<img src={item.thumbnail_url||item.remote_url||''} alt={title}/>:<div className="gmedia-gallery-empty">{item.kind==='video'?<Film size={20}/>:<ImageIcon size={20}/>}</div>}
            <span className="gmedia-gallery-copy">
              <b>{title}</b>
              <em>{caption}</em>
              <small>{item.kind==='video'?'Vídeo':item.style||'Imagem'} · {item.aspect_ratio||''}</small>
            </span>
          </button>
          <button className="gmedia-gallery-delete" onClick={()=>removeItem(item)} title="Apagar do histórico"><Trash2 size={12}/></button>
        </article>
      })}</div>:<div className="gmedia-library-empty">As imagens e vídeos gerados aparecerão aqui.</div>}
    </section>
  </section>
}
