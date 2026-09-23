'use client';
import React,{useState} from 'react';
import { Search, Sparkles } from 'lucide-react';
import { skills } from '@/lib/skills';

export function GrokPluginsPanel(){
  const [q,setQ]=useState('');
  const list=skills.filter(s=>(s.name+' '+s.category+' '+s.description+' '+s.source).toLowerCase().includes(q.toLowerCase()));
  return <section className="gtool plugins-tool"><header className="gtool-head"><div><span>Skills</span><h1>Plugins & Skills</h1><p>Capacidades instaladas e bridges do PredictLM.</p></div></header><div className="gplugin-search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar skill"/></div><div className="gplugin-grid">{list.map(s=><article key={s.id} className={s.id==='lexis-twincore-x10'?'featured':''}><div className="gplugin-icon"><Sparkles size={16}/></div><div><span>{s.category} · {s.runtime}</span><b>{s.name}</b><p>{s.description}</p><small>{s.source}</small></div></article>)}</div></section>
}
