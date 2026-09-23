'use client';
import React, { useMemo } from 'react';
import { useStudio } from '@/lib/store';
import { runLocalCouncil } from '@/lib/council';
import { auditProject } from '@/lib/audits';

export function CouncilPanel(){
  const files=Object.values(useStudio(s=>s.files));
  const report=useMemo(()=>runLocalCouncil(files),[files]);
  const audit=useMemo(()=>auditProject(files),[files]);
  return <div className="panel-scroll council-panel">
    <div className="score-hero"><div><span>SHIP SCORE</span><b>{report.score}</b></div><p>Local deterministic review. No model or API required.</p></div>
    <div className="council-grid">
      {report.members.map(m=><article className={'council-card '+m.status} key={m.id}>
        <header><div><b>{m.name}</b><span>{m.focus}</span></div><small>{m.status}</small></header>
        <p>{m.summary}</p>
        <ul>{m.recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul>
      </article>)}
    </div>
    <h4 className="section-label">Consensus</h4>
    <div className="consensus-list">{report.consensus.map((x,i)=><div key={i}><span/> {x}</div>)}</div>
    <h4 className="section-label">Security findings</h4>
    <div className="finding-list">{audit.findings.length===0?<div className="empty-small">No static findings in the generated workspace.</div>:audit.findings.map(f=><div className={'finding '+f.severity} key={f.id+(f.path||'')}><div><b>{f.title}</b><small>{f.category} · {f.severity}{f.path?' · '+f.path:''}</small></div><p>{f.detail}</p></div>)}</div>
  </div>
}
