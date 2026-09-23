'use client';
import React, { useState } from 'react';
import { useStudio } from '@/lib/store';

type Result={query:string;web:any[];news:any[];images:any[]};

export function ResearchPanel(){
  const [query,setQuery]=useState('');
  const [result,setResult]=useState<Result|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const addNote=useStudio(s=>s.addNote);
  async function search(){
    if(!query.trim()||loading)return;
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:query.trim(),limit:6})});
      const data=await r.json();
      if(!r.ok) throw new Error(data?.error||'Research failed');
      setResult(data);
    }catch(e:any){setError(e.message)}finally{setLoading(false)}
  }
  function save(){
    if(!result)return;
    const lines=[...result.web,...result.news].slice(0,8).map((x:any,i:number)=>(i+1)+'. '+x.title+' — '+x.url);
    addNote({title:'Research: '+result.query.slice(0,60),body:lines.join('\n'),tags:['research','sources'],kind:'note'});
  }
  return <div className="panel-scroll research-panel">
    <div className="research-box"><textarea value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();search()}}} placeholder="Research a library, competitor, bug, API or implementation pattern..."/><div><span>Firecrawl v2 · server-side key</span><button onClick={search} disabled={loading||!query.trim()}>{loading?'Searching…':'Search web'}</button></div></div>
    {error&&<div className="research-error">{error}<small>The rest of PredictLM remains usable without Firecrawl.</small></div>}
    {result&&<><div className="research-head"><div><b>{result.web.length+result.news.length}</b><span> sources for “{result.query}”</span></div><button onClick={save}>Save to memory</button></div>
      <div className="source-list">{[...result.web,...result.news].map((x:any,i:number)=><a href={x.url} target="_blank" rel="noopener noreferrer" key={x.url+i}><span>{x.type||'web'} · {x.site}</span><b>{x.title}</b><p>{x.description}</p></a>)}</div>
      {result.images?.length>0&&<><h4 className="section-label">Images</h4><div className="image-results">{result.images.slice(0,6).map((x:any,i:number)=><a href={x.url} target="_blank" rel="noopener noreferrer" key={x.imageUrl+i}><img src={x.imageUrl} alt={x.title||'Research result'}/><span>{x.title||x.site}</span></a>)}</div></>}
    </>}
  </div>
}
