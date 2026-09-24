'use client';

import React,{useState} from 'react';
import { ExternalLink, Globe2, Search, Sparkles } from 'lucide-react';
import { synthesizeResearch } from '@/lib/chat-intelligence';
import { inferResearchDepth, planResearchQueries, researchConcurrency, researchSourceBudget, type ResearchDepth } from '@/lib/research-policy';
import { useStudio } from '@/lib/store';

export function GrokResearchPanel(){
  const [query,setQuery]=useState('');
  const [data,setData]=useState<any>(null);
  const [answer,setAnswer]=useState('');
  const [loading,setLoading]=useState(false);
  const [depth,setDepth]=useState<ResearchDepth>('balanced');
  const [error,setError]=useState('');
  const addNote=useStudio(s=>s.addNote);

  async function run(){
    if(!query.trim()||loading)return;
    setLoading(true);setError('');setAnswer('');
    try{
      const chosen=depth||inferResearchDepth(query);
      const queries=planResearchQueries(query.trim(),chosen);
      const concurrency=researchConcurrency(chosen);
      const budget=researchSourceBudget(chosen);
      const batches:Array<string[]>=Array.from({length:Math.ceil(queries.length/concurrency)},(_,i)=>queries.slice(i*concurrency,(i+1)*concurrency));
      const results:any[]=[];
      for(const batch of batches){
        const chunk=await Promise.all(batch.map(async planned=>{
          const r=await fetch('/api/research',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({query:planned,limit:budget})
          });
          const data=await r.json().catch(()=>({}));
          if(!r.ok)return {query:planned,error:data?.error||'Research failed',web:[],news:[],images:[]};
          return {...data,query:planned};
        }));
        results.push(...chunk);
      }

      const dedupe=(items:any[])=>{
        const seen=new Set<string>();
        return items.filter(item=>{
          const key=String(item?.url||item?.imageUrl||item?.title||'').trim();
          if(!key||seen.has(key))return false;
          seen.add(key);return true;
        });
      };
      const web=dedupe(results.flatMap(x=>x.web||[])).slice(0,budget);
      const news=dedupe(results.flatMap(x=>x.news||[])).slice(0,budget);
      const images=dedupe(results.flatMap(x=>x.images||[])).slice(0,8);
      const hosts=new Set([...web,...news].map((x:any)=>{
        try{return new URL(x.url).hostname.replace(/^www\./,'')}catch{return x.site||x.source||''}
      }).filter(Boolean));
      const strong=[...web,...news].filter((x:any)=>Number(x.qualityScore||0)>=70).length;
      const next={
        web,news,images,
        provider:results.map(x=>x.provider).filter(Boolean).join(' + ')||'research engine',
        research:{mode:chosen,queries:queries.length,completed:results.filter(x=>!x.error).length,errors:results.filter(x=>x.error).map(x=>x.error)},
        coverage:{distinctHosts:hosts.size,strong}
      };
      setData(next);
      const synthesis=synthesizeResearch(query,[...web,...news]);
      setAnswer(synthesis?.content||'As fontes foram recuperadas, mas não há texto suficiente para uma síntese confiável.');
    }catch(e:any){setError(e?.message||'Falha de pesquisa')}finally{setLoading(false)}
  }
  function save(){
    if(!data)return;
    addNote({title:'Research: '+query.slice(0,60),body:answer+'\n\n'+[...(data.web||[]),...(data.news||[])].slice(0,8).map((x:any)=>x.title+' — '+x.url).join('\n'),tags:['research','twincore'],kind:'note'});
  }
  return <section className="gtool research-tool">
    <header className="gtool-head"><div><span>Research</span><h1>Pesquisa com síntese</h1><p>Busca → evidência → resposta. Links ficam como apoio, não como resposta.</p></div></header>
    <div className="gresearch-query"><Globe2 size={19}/><textarea value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run()}}} placeholder="O que você quer investigar?"/><select value={depth} onChange={e=>setDepth(e.target.value as ResearchDepth)} aria-label="Profundidade da pesquisa"><option value="fast">Rápida</option><option value="balanced">Balanceada</option><option value="comprehensive">Profunda</option></select><button onClick={run} disabled={loading||!query.trim()}><Search size={16}/>{loading?'Pesquisando':'Pesquisar'}</button></div>
    {error&&<div className="gtool-error">{error}</div>}
    {data&&<div className="gresearch-layout">
      <article className="gresearch-answer"><div className="twincore-badge"><Sparkles size={13}/><div><b>TwinCore Research</b><span>{data.provider||'research engine'} · {data.research?.mode||depth} · {data.research?.completed||1}/{data.research?.queries||1} buscas · {data.coverage?.distinctHosts||0} domínios · {data.coverage?.strong||0} fontes fortes</span></div></div><h2>Resposta</h2><p>{answer}</p><button onClick={save}>Salvar no Segundo Cérebro</button></article>
      <div className="gresearch-sources"><h3>Fontes</h3>{[...(data.web||[]),...(data.news||[])].slice(0,8).map((x:any,i:number)=><a key={x.url+i} href={x.url} target="_blank" rel="noreferrer"><div><span>{x.source||x.site||'web'} · {x.qualityTier||'unknown'} · {x.qualityScore??'—'}/100</span><b>{x.title}</b><p>{x.summary||x.description}</p></div><ExternalLink size={13}/></a>)}</div>
      {(data.images||[]).length>0&&<div className="gresearch-images">{data.images.slice(0,8).map((x:any,i:number)=><a key={x.imageUrl+i} href={x.url} target="_blank" rel="noreferrer"><img src={x.imageUrl} alt={x.title||'Research'}/><span>{x.title||x.site}</span></a>)}</div>}
    </div>}
  </section>
}
