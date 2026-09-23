'use client';

import React,{useMemo,useState} from 'react';
import { Download, Image as ImageIcon, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';
import { useStudio } from '@/lib/store';

const styles=['Cinematic','Photoreal','Editorial','3D','Anime','Minimal','Product'];
const ratios:{label:string;w:number;h:number}[]=[
  {label:'1:1',w:1024,h:1024},{label:'16:9',w:1344,h:768},{label:'9:16',w:768,h:1344},{label:'4:3',w:1152,h:864}
];

export function GrokImaginePanel(){
  const [prompt,setPrompt]=useState('');
  const [style,setStyle]=useState('Cinematic');
  const [ratio,setRatio]=useState(ratios[0]);
  const [seed,setSeed]=useState(1);
  const [generated,setGenerated]=useState('');
  const [loading,setLoading]=useState(false);
  const addFile=useStudio(s=>s.addFile);

  const enhanced=useMemo(()=>prompt.trim()?prompt.trim()+', '+style.toLowerCase()+', premium composition, coherent lighting, high detail, no watermark':'',[prompt,style]);

  function generate(){
    if(!enhanced)return;
    setLoading(true);
    const url='https://image.pollinations.ai/prompt/'+encodeURIComponent(enhanced)+'?width='+ratio.w+'&height='+ratio.h+'&seed='+seed+'&nologo=true&model=flux';
    setGenerated(url);
  }

  function savePrompt(){
    if(!enhanced)return;
    addFile('media/imagine-prompt.md','# Imagine\n\nPrompt: '+prompt+'\n\nStyle: '+style+'\nAspect: '+ratio.label+'\nSeed: '+seed+'\n\nEnhanced:\n'+enhanced,'markdown');
  }

  return <section className="gtool imagine-tool">
    <header className="gtool-head"><div><span>Imagine</span><h1>Crie uma imagem</h1><p>Prompt visual no mesmo shell. Sem chave obrigatória; geração no provider público quando disponível.</p></div></header>
    <div className="gimagine-grid">
      <div className="gimagine-controls">
        <div className="twincore-badge"><Sparkles size={13}/><div><b>TwinCore Visual</b><span>intent → prompt → render → review</span></div></div>
        <label><span>Prompt</span><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Descreva a imagem que você quer criar…"/></label>
        <div className="gimagine-styles">{styles.map(x=><button className={style===x?'active':''} key={x} onClick={()=>setStyle(x)}>{x}</button>)}</div>
        <div className="gimagine-ratios">{ratios.map(x=><button className={ratio.label===x.label?'active':''} key={x.label} onClick={()=>setRatio(x)}>{x.label}</button>)}</div>
        <label className="seed-row"><span>Seed</span><input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value)||1)}/><button onClick={()=>setSeed(Math.floor(Math.random()*999999)+1)}><RefreshCw size={13}/></button></label>
        <button className="gimagine-generate" onClick={generate} disabled={!prompt.trim()}><WandSparkles size={16}/>Gerar imagem</button>
        <button className="gimagine-save" onClick={savePrompt} disabled={!prompt.trim()}>Salvar prompt no projeto</button>
      </div>
      <div className="gimagine-canvas">
        {generated?<div className="gimagine-result"><img src={generated} alt={prompt} onLoad={()=>setLoading(false)} onError={()=>setLoading(false)}/>{loading&&<div className="gimagine-loading"><i/><i/><i/> gerando</div>}<a href={generated} target="_blank" rel="noreferrer"><Download size={14}/>Abrir imagem</a></div>:<div className="gimagine-empty"><ImageIcon size={33}/><h2>Sua imagem aparece aqui</h2><p>Escolha o estilo, proporção e descreva a cena.</p></div>}
      </div>
    </div>
  </section>
}
