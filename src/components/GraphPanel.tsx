'use client';
import React, { useMemo } from 'react';
import { useStudio } from '@/lib/store';
import { buildKnowledgeGraph } from '@/lib/knowledge';

export function GraphPanel(){
  const files=Object.values(useStudio(s=>s.files));
  const setActiveFile=useStudio(s=>s.setActiveFile);
  const graph=useMemo(()=>buildKnowledgeGraph(files),[files]);
  const incoming=new Map<string,number>(); const outgoing=new Map<string,number>();
  graph.edges.forEach(e=>{outgoing.set(e.from,(outgoing.get(e.from)||0)+1);incoming.set(e.to,(incoming.get(e.to)||0)+1)});
  return <div className="panel-scroll graph-panel">
    <div className="graph-summary"><div><b>{graph.nodes.length}</b><span>files</span></div><div><b>{graph.edges.length}</b><span>links</span></div><div><b>{graph.orphanCount}</b><span>orphans</span></div></div>
    <p className="panel-copy">Codebase map inspired by knowledge-graph workflows: click a node to open the file, inspect dependencies, and reduce blind agent edits.</p>
    <div className="node-list">{graph.nodes.map(n=><button key={n.id} onClick={()=>setActiveFile(n.id)}><span className={'node-kind '+n.kind}/><div><b>{n.label}</b><small>{n.id}</small></div><em>{incoming.get(n.id)||0} in · {outgoing.get(n.id)||0} out</em></button>)}</div>
    <h4 className="section-label">Internal relationships</h4>
    <div className="edge-list">{graph.edges.length===0?<div className="empty-small">No relative imports detected yet.</div>:graph.edges.map((e,i)=><div key={i}><code>{e.from}</code><span>→</span><code>{e.to}</code></div>)}</div>
  </div>
}
