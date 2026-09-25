'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Brain, Clock3, Download, ExternalLink, FileSearch, Newspaper, RefreshCw, Scale, Search, ShieldAlert } from 'lucide-react';
import { createLegalDossier } from '@/lib/legal/dossier';
import { maskCnj } from '@/lib/legal/cnj';
import type { LegalProcessBundle } from '@/lib/legal/types';

type Tab='resumo'|'timeline'|'djen'|'council';

const formatDate=(v?:string)=>{
  if(!v)return '—';
  const d=new Date(v);
  return Number.isNaN(d.getTime())?v:d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:v.includes('T')?'short':undefined});
};

export function LegalModule({onBack,initialNumber=''}:{onBack?:()=>void;initialNumber?:string}={}){
  const [query,setQuery]=useState(initialNumber);
  const [result,setResult]=useState<LegalProcessBundle|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [tab,setTab]=useState<Tab>('resumo');
  const [history,setHistory]=useState<string[]>([]);

  useEffect(()=>{
    try{setHistory(JSON.parse(localStorage.getItem('predictlm-legal-history-v1')||'[]'))}catch{}
  },[]);

  useEffect(()=>{
    if(initialNumber&&!result)search(initialNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[initialNumber]);

  const latest=result?.timeline?.[0];

  async function search(value=query){
    const number=maskCnj(value.trim());
    if(!number)return;
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/legal/process?number='+encodeURIComponent(number),{cache:'no-store'});
      const data=await r.json();
      if(!r.ok)throw new Error(data?.error||'Falha na consulta');
      setResult(data);setQuery(data.processNumber);setTab('resumo');
      const next=[data.processNumber,...history.filter(x=>x!==data.processNumber)].slice(0,8);
      setHistory(next);
      localStorage.setItem('predictlm-legal-history-v1',JSON.stringify(next));
    }catch(e:any){setError(e?.message||'Falha na consulta processual');}
    finally{setLoading(false)}
  }

  function downloadDossier(){
    if(!result)return;
    const html=createLegalDossier(result,{mode:'standard'});
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='dossie-'+result.digits+'.html';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const sourceState=useMemo(()=>({
    datajud:result?.datajud.ok?'online':result?'erro':'aguardando',
    djen:result?.djen.ok?'online':result?'erro':'aguardando'
  }),[result]);

  const goBack=()=>{
    if(onBack){onBack();return;}
    window.location.assign('/');
  };

  return <div className="legal-shell">
    <aside className="legal-side">
      <div className="legal-side-head"><button onClick={goBack}><ArrowLeft size={16}/></button><div><span className="legal-mark"><Scale size={16}/></span><b>Processos</b></div></div>
      <button className="legal-new" onClick={()=>{setResult(null);setQuery('');setError('')}}><FileSearch size={15}/>Nova consulta</button>
      <span className="legal-side-label">Recentes</span>
      <div className="legal-history">{history.length?history.map(n=><button key={n} onClick={()=>{setQuery(n);search(n)}}>{n}</button>):<small>Nenhuma consulta ainda.</small>}</div>
      <div className="legal-source-status">
        <div><i className={sourceState.datajud}/><span><b>DataJud</b><small>capa + movimentos</small></span></div>
        <div><i className={sourceState.djen}/><span><b>DJEN</b><small>publicações + prazos</small></span></div>
      </div>
      <div className="legal-side-note">Consulta processual. Sem CRM, carteira de clientes ou gestão comercial. Dados públicos; confirme os autos antes de decisões sobre prazo ou mérito.</div>
    </aside>

    <main className="legal-main">
      <header className="legal-top">
        <div><span>PredictLM / Processos</span><h1>Consulta de Processos</h1></div>
        <div className="legal-top-actions">{result&&<button onClick={downloadDossier}><Download size={14}/>Dossiê HTML</button>}</div>
      </header>

      <section className="legal-query">
        <div className="legal-query-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')search()}} placeholder="Número CNJ — ex.: 4000338-89.2026.8.26.0002"/><button onClick={()=>search()} disabled={loading||!query.trim()}>{loading?<RefreshCw className="spin" size={17}/>:<Search size={17}/>}Consultar</button></div>
        <p>Consulte um processo pelo número CNJ. O PredictLM cruza DataJud e DJEN e organiza os dados em uma única leitura.</p>
      </section>

      {error&&<div className="legal-error"><ShieldAlert size={17}/><div><b>Consulta não concluída</b><span>{error}</span></div></div>}

      {!result&&!loading&&!error&&<section className="legal-empty">
        <Scale size={28}/><h2>Consulta processual integrada</h2><p>Digite um número CNJ. O módulo organiza os dados públicos, cria linha do tempo, cruza publicações e aplica as cinco lentes do workflow Lexis Revisional.</p>
        <div className="legal-capabilities"><span>DataJud</span><span>DJEN</span><span>Timeline</span><span>Council</span><span>Dossiê</span></div>
      </section>}

      {result&&<section className="legal-result">
        <div className="legal-case-head">
          <div><span className="legal-tribunal">{result.tribunalLabel}</span><h2>{result.processNumber}</h2><p>{result.summary.headline}</p></div>
          <div className="legal-valid"><i className={result.validCnj?'ok':'warn'}/><span>{result.validCnj?'CNJ válido':'DV não confirmado'}</span></div>
        </div>

        <div className="legal-metrics">
          <article><span>Status público</span><b>{result.summary.status}</b><small>{latest?formatDate(latest.date):'sem evento'}</small></article>
          <article><span>Movimentações</span><b>{result.summary.movementCount}</b><small>DataJud</small></article>
          <article><span>Publicações</span><b>{result.summary.publicationCount}</b><small>DJEN</small></article>
          <article><span>Última atualização</span><b>{formatDate(result.datajud.lastUpdate)}</b><small>{result.datajud.degree||result.tribunalLabel}</small></article>
        </div>

        <nav className="legal-tabs">
          <button className={tab==='resumo'?'active':''} onClick={()=>setTab('resumo')}><FileSearch size={14}/>Resumo</button>
          <button className={tab==='timeline'?'active':''} onClick={()=>setTab('timeline')}><Clock3 size={14}/>Timeline</button>
          <button className={tab==='djen'?'active':''} onClick={()=>setTab('djen')}><Newspaper size={14}/>DJEN <em>{result.djen.count}</em></button>
          <button className={tab==='council'?'active':''} onClick={()=>setTab('council')}><Brain size={14}/>Council</button>
        </nav>

        {tab==='resumo'&&<div className="legal-panel">
          <div className="legal-summary-grid">
            <article className="legal-card"><header>Processo</header><dl><div><dt>Classe</dt><dd>{result.datajud.class?.name||'—'}</dd></div><div><dt>Órgão julgador</dt><dd>{result.datajud.court?.name||'—'}</dd></div><div><dt>Ajuizamento</dt><dd>{formatDate(result.datajud.filedAt)}</dd></div><div><dt>Sistema</dt><dd>{result.datajud.system||'—'}</dd></div><div><dt>Formato</dt><dd>{result.datajud.format||'—'}</dd></div><div><dt>Sigilo</dt><dd>{result.datajud.confidentiality??'—'}</dd></div></dl></article>
            <article className="legal-card"><header>Assuntos</header><div className="legal-subjects">{result.datajud.subjects.length?result.datajud.subjects.map((x,i)=><span key={i}>{x.name}</span>):<p>Nenhum assunto retornado.</p>}</div><header className="second">Evento mais recente</header><div className="legal-latest">{latest?<><b>{latest.title}</b><span>{formatDate(latest.date)} · {latest.source}</span><p>{latest.body}</p></>:<p>Sem evento normalizado.</p>}</div></article>
          </div>
          <div className="legal-caveat"><ShieldAlert size={16}/><div><b>Leitura responsável</b><span>{result.summary.caveats.join(' ')}</span></div></div>
          <div className="legal-source-links">
            {result.datajud.endpoint&&<a href="https://datajud-wiki.cnj.jus.br/api-publica/" target="_blank" rel="noreferrer">DataJud/CNJ <ExternalLink size={12}/></a>}
            {result.djen.endpoint&&<a href={result.djen.endpoint} target="_blank" rel="noreferrer">DJEN/CNJ <ExternalLink size={12}/></a>}
          </div>
        </div>}

        {tab==='timeline'&&<div className="legal-panel"><div className="legal-timeline">{result.timeline.length?result.timeline.map(x=><article key={x.id} className={x.type}><i/><div className="legal-time">{formatDate(x.date)}<span>{x.source}</span></div><div><b>{x.title}</b>{x.body&&<p>{x.body}</p>}</div></article>):<div className="legal-no-data">Nenhum movimento/publicação foi normalizado.</div>}</div></div>}

        {tab==='djen'&&<div className="legal-panel"><div className="legal-publications">{result.djen.publications.length?result.djen.publications.map(p=><article key={p.id}><header><div><b>{p.type}</b><span>{formatDate(p.availableAt)} · {p.tribunal||result.tribunalLabel}</span></div>{p.certificateUrl&&<a href={p.certificateUrl} target="_blank" rel="noreferrer">Certidão <ExternalLink size={11}/></a>}</header>{p.courtUnit&&<small>{p.courtUnit}{p.recipient?' · '+p.recipient:''}</small>}<p>{p.text||'Sem texto normalizado.'}</p></article>):<div className="legal-no-data">{result.djen.error||'Nenhuma publicação encontrada na consulta atual.'}</div>}</div></div>}

        {tab==='council'&&<div className="legal-panel"><div className="legal-council">{result.lenses.map(l=><article className={l.level} key={l.id}><header><b>{l.title}</b><span>{l.level==='high'?'atenção alta':l.level==='attention'?'revisar':'informativo'}</span></header><ul>{l.findings.map((x,i)=><li key={i}>{x}</li>)}</ul></article>)}</div><div className="legal-caveat"><ShieldAlert size={16}/><div><b>Escopo do Council</b><span>As lentes organizam sinais operacionais a partir de metadados públicos. Elas não concluem mérito jurídico nem calculam prazo processual automaticamente.</span></div></div></div>}
      </section>}
    </main>
  </div>
}
