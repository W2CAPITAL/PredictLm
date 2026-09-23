'use client';

import React,{useState} from 'react';
import { ExternalLink, Globe2, Search, Sparkles } from 'lucide-react';
import { synthesizeResearch } from '@/lib/chat-intelligence';
import { useStudio } from '@/lib/store';

export function GrokResearchPanel(){
  const [query,setQuery]=useState('');
  const [data,setData]=useState<any>(null);
  const [answer,setAnswer]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const addNote=useStudio(s=>s.addNote);

  async function run(){
    if(!query.trim()||loading)return;
    setLoading(true);setError('');setAnswer('');
    try{
      const r=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:query.trim(),limit:12})});
      const next=await r.json(); if(!r.ok)throw new Error(next?.error||'Research failed');
      setData(next);
      const items=[...(next.web||[]),...(next.news||[])];
      const synthesis=synthesizeResearch(query,items);
      setAnswer(synthesis?.content||'As fontes foram recuperadas, mas não há texto suficiente para uma síntese confiável.');
    }catch(e:any){setError(e?.message||'Falha de pesquisa')}finally{setLoading(false)}
  }
  function save(){
    if(!data)return;
    addNote({title:'Research: '+query.slice(0,60),body:answer+'\n\n'+[...(data.web||[]),...(data.news||[])].slice(0,8).map((x:any)=>x.title+' — '+x.url).join('\n'),tags:['research','twincore'],kind:'note'});
  }
  return <section className="gtool research-tool">
    <header className="gtool-head"><div><span>Research</span><h1>Pesquisa com síntese</h1><p>Busca → evidência → resposta. Links ficam como apoio, não como resposta.</p></div></header>
    <div className="gresearch-query"><Globe2 size={19}/><textarea value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run()}}} placeholder="O que você quer investigar?"/><button onClick={run} disabled={loading||!query.trim()}><Search size={16}/>{loading?'Pesquisando':'Pesquisar'}</button></div>
    {error&&<div className="gtool-error">{error}</div>}
    {data&&<div className="gresearch-layout">
      <article className="gresearch-answer"><div className="twincore-badge"><Sparkles size={13}/><div><b>TwinCore Research</b><span>{data.provider||'research engine'} · {data.coverage?.distinctHosts||0} domínios · {data.coverage?.strong||0} fontes fortes</span></div></div><h2>Resposta</h2><p>{answer}</p><button onClick={save}>Salvar no Segundo Cérebro</button></article>
      <div className="gresearch-sources"><h3>Fontes</h3>{[...(data.web||[]),...(data.news||[])].slice(0,8).map((x:any,i:number)=><a key={x.url+i} href={x.url} target="_blank" rel="noreferrer"><div><span>{x.source||x.site||'web'} · {x.qualityTier||'unknown'} · {x.qualityScore??'—'}/100</span><b>{x.title}</b><p>{x.summary||x.description}</p></div><ExternalLink size={13}/></a>)}</div>
      {(data.images||[]).length>0&&<div className="gresearch-images">{data.images.slice(0,8).map((x:any,i:number)=><a key={x.imageUrl+i} href={x.url} target="_blank" rel="noreferrer"><img src={x.imageUrl} alt={x.title||'Research'}/><span>{x.title||x.site}</span></a>)}</div>}
    </div>}
  </section>
}
