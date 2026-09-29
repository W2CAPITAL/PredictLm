'use client';

import React,{useEffect,useMemo,useState} from 'react';
import {Download,Image as ImageIcon,Loader2,RefreshCw,Sparkles} from 'lucide-react';

const RATIOS=[
  {label:'1:1',width:1024,height:1024},
  {label:'16:9',width:1344,height:768},
  {label:'9:16',width:768,height:1344},
  {label:'4:3',width:1152,height:864}
];

function seedNow(){
  return Math.max(1,Math.floor(Date.now()%2147483646));
}

export function SimpleImaginePanel(){
  const [prompt,setPrompt]=useState('');
  const [ratio,setRatio]=useState(RATIOS[0]);
  const [style,setStyle]=useState('Cinematic');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<{url:string;provider:string;model:string;seed:number;prompt:string}|null>(null);
  const [seed,setSeed]=useState(seedNow());

  useEffect(()=>{
    try{
      const prefill=sessionStorage.getItem('predictlm:simple-imagine-prefill');
      if(prefill){
        setPrompt(prefill.slice(0,6000));
        sessionStorage.removeItem('predictlm:simple-imagine-prefill');
      }
    }catch{}
  },[]);

  const effectivePrompt=useMemo(()=>{
    const text=prompt.trim();
    if(!text)return '';
    return style==='Auto'?text:text+'\n\nEstilo visual: '+style+'. Preserve fielmente o sujeito, a ação, a composição e os detalhes pedidos.';
  },[prompt,style]);

  async function validateImageUrl(url:string){
    if(!url)throw new Error('O provider não retornou uma imagem.');
    await new Promise<void>((resolve,reject)=>{
      const image=new window.Image();
      image.onload=()=>resolve();
      image.onerror=()=>reject(new Error('O provider retornou uma imagem que não abriu no navegador.'));
      image.src=url;
    });
    return url;
  }

  async function generate(nextSeed=seed){
    if(!effectivePrompt||loading)return;
    setLoading(true);
    setError('');
    setResult(null);
    let primaryError='';
    let generationPrompt=effectivePrompt;

    try{
      const [{loadCognitiveState,saveCognitiveState},{advanceCognitiveWorkspace},{buildCreativeMediaControl}]=await Promise.all([
        import('@/lib/cognitive/cognitive-memory'),
        import('@/lib/cognitive/cognitive-workspace'),
        import('@/lib/cognitive/creative-media')
      ]);
      const previous=await loadCognitiveState();
      const next=advanceCognitiveWorkspace(previous,effectivePrompt);
      await saveCognitiveState(next);
      const creative=buildCreativeMediaControl(next,effectivePrompt);
      generationPrompt=effectivePrompt+'\n\n'+creative.publicBrief;
    }catch{
      // Cognitive control is an enhancement; image generation must remain usable if local state is unavailable.
    }

    try{
      const response=await fetch('/api/media/generate',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          prompt:generationPrompt,
          width:ratio.width,
          height:ratio.height,
          seed:nextSeed,
          promptMode:'auto',
          referenceMode:'off'
        })
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data?.url){
        throw new Error(String(data?.detail||data?.error||'O provider não entregou uma imagem válida'));
      }

      const url=await validateImageUrl(String(data.url));
      setResult({
        url,
        provider:String(data.provider||'imagem'),
        model:String(data.model||'modelo não informado'),
        seed:nextSeed,
        prompt:prompt.trim()
      });
      return;
    }catch(err:any){
      primaryError=String(err?.message||'Provider principal indisponível.');
    }

    try{
      const mod:any=await import('@heyputer/puter.js');
      const puter:any=mod?.puter||mod?.default?.puter||mod?.default||null;
      if(!puter?.ai?.txt2img)throw new Error('Fallback de imagem do Puter indisponível.');

      const [w,h]=ratio.label.split(':').map(Number);
      const generated:any=await puter.ai.txt2img(generationPrompt,{
        model:'replicate:black-forest-labs/flux-schnell',
        ratio:{w:w||1,h:h||1},
        seed:nextSeed
      });
      const raw=generated?.src||generated?.url||(typeof generated?.toString==='function'?generated.toString():'');
      const url=await validateImageUrl(String(raw||''));
      setResult({
        url,
        provider:'puter-replicate',
        model:'black-forest-labs/flux-schnell',
        seed:nextSeed,
        prompt:prompt.trim()
      });
    }catch(err:any){
      const fallbackError=String(err?.message||'Fallback Puter indisponível.');
      setError(primaryError+' · Fallback: '+fallbackError);
    }finally{
      setLoading(false);
    }
  }

  function regenerate(){
    const next=seedNow();
    setSeed(next);
    void generate(next);
  }

  return <section style={{minHeight:'100%',padding:'clamp(18px,4vw,42px)',overflow:'auto'}}>
    <div style={{maxWidth:1080,margin:'0 auto',display:'grid',gap:18}}>
      <header style={{display:'grid',gap:8}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:12,letterSpacing:'.12em',opacity:.68}}><Sparkles size={13}/> IMAGINE · DIRETO</span>
        <h1 style={{margin:0,fontSize:'clamp(28px,6vw,52px)',letterSpacing:'-.04em'}}>Gerar imagem sem enrolação.</h1>
        <p style={{margin:0,maxWidth:760,opacity:.72,lineHeight:1.6}}>Um pedido, uma geração. Sem gate de identidade bloqueando o resultado e sem carregar vídeo, storyboard ou laboratório junto com a tela.</p>
      </header>

      <div style={{display:'grid',gap:12,padding:16,border:'1px solid rgba(255,255,255,.10)',borderRadius:18,background:'rgba(255,255,255,.035)'}}>
        <textarea
          value={prompt}
          onChange={e=>setPrompt(e.target.value)}
          placeholder="Descreva a imagem que você quer gerar"
          style={{width:'100%',minHeight:132,resize:'vertical',borderRadius:14,border:'1px solid rgba(255,255,255,.12)',background:'#0c0e12',color:'inherit',padding:14,font:'inherit',fontSize:16,outline:'none'}}
        />

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['Auto','Cinematic','Photoreal','Anime','Editorial','3D'].map(item=><button key={item} onClick={()=>setStyle(item)} style={{borderRadius:999,padding:'8px 11px',border:'1px solid rgba(255,255,255,.12)',background:style===item?'rgba(255,255,255,.14)':'transparent',color:'inherit'}}>{item}</button>)}
        </div>

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {RATIOS.map(item=><button key={item.label} onClick={()=>setRatio(item)} style={{borderRadius:10,padding:'8px 11px',border:'1px solid rgba(255,255,255,.12)',background:ratio.label===item.label?'rgba(255,255,255,.14)':'transparent',color:'inherit'}}>{item.label}</button>)}
        </div>

        <button
          onClick={()=>void generate()}
          disabled={loading||!prompt.trim()}
          style={{display:'inline-flex',justifyContent:'center',alignItems:'center',gap:8,minHeight:46,border:0,borderRadius:13,fontWeight:700,cursor:loading?'wait':'pointer'}}
        >{loading?<Loader2 className="spin" size={17}/>:<ImageIcon size={17}/>} {loading?'Gerando imagem…':'Gerar imagem'}</button>
      </div>

      {error?<div role="alert" style={{padding:14,borderRadius:14,border:'1px solid rgba(255,120,120,.35)',background:'rgba(255,80,80,.08)',display:'grid',gap:8}}>
        <b>Não foi possível gerar.</b>
        <span>{error}</span>
        <button onClick={regenerate} disabled={loading} style={{justifySelf:'start',display:'inline-flex',gap:7,alignItems:'center'}}><RefreshCw size={14}/>Tentar novamente</button>
      </div>:null}

      {result?<article style={{display:'grid',gap:12}}>
        <div style={{borderRadius:18,overflow:'hidden',border:'1px solid rgba(255,255,255,.10)',background:'#08090b'}}>
          <img src={result.url} alt={result.prompt||'Imagem gerada'} style={{display:'block',width:'100%',height:'auto',maxHeight:'72vh',objectFit:'contain'}}/>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',fontSize:13,opacity:.8}}>
          <span>{result.provider}</span><span>·</span><span>{result.model}</span><span>·</span><span>seed {result.seed}</span>
          <a href={result.url} target="_blank" rel="noreferrer" style={{marginLeft:'auto',display:'inline-flex',gap:6,alignItems:'center',color:'inherit'}}><Download size={14}/>Abrir imagem</a>
          <button onClick={regenerate} disabled={loading} style={{display:'inline-flex',gap:6,alignItems:'center'}}><RefreshCw size={14}/>Nova variação</button>
        </div>
      </article>:null}
    </div>
  </section>;
}
