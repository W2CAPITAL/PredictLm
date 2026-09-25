'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Download,FileText,Printer,ShieldCheck,Sparkles} from 'lucide-react';
import {
  renderReportHtml,
  type DossierClassification,
  type DossierKind
} from '@/lib/predict-dossier-html';

const example=[
  '# Relatório executivo — Operação setembro/2026',
  '',
  '**Conclusão em uma frase:** A operação está estável, mas dois retornos vencidos e uma dependência externa exigem ação hoje.',
  '',
  '## Sumário executivo',
  'A carteira permanece operacional [fornecida]. Dois retornos ultrapassaram a data prevista e precisam de contato prioritário [fornecida].',
  '',
  '## Dados-chave',
  '- **Processos acompanhados:** 128',
  '- **Retornos vencidos:** 2',
  '- **Próxima revisão:** 26/09/2026',
  '',
  '## Riscos',
  '- **Alto** — Retorno vencido para cliente crítico. Impacto: atraso de comunicação. Mitigação: contato imediato e registro.',
  '- **Médio** — Dependência de atualização externa. Mitigação: repetir consulta e registrar indisponibilidade.',
  '',
  '## Próximos passos',
  '- Contatar os dois clientes vencidos (responsável: a definir; prazo: 25/09/2026) — urgente',
  '- Repetir consulta à fonte externa (responsável: a definir; prazo: 26/09/2026) — prioridade média',
  '',
  '## Fontes',
  '- Planilha operacional de 25/09/2026 [fornecida]',
  '',
  '## Limitações',
  'Este exemplo não contém dados reais e serve apenas para demonstrar o formato.'
].join('\n');

const kinds:{value:DossierKind;label:string}[]=[
  {value:'relatorio-executivo',label:'Relatório executivo'},
  {value:'dossie-juridico',label:'Dossiê jurídico'},
  {value:'due-diligence',label:'Due diligence'},
  {value:'relatorio-tecnico',label:'Relatório técnico'},
  {value:'pesquisa',label:'Pesquisa'},
  {value:'generico',label:'Genérico'}
];

const classifications:{value:DossierClassification;label:string}[]=[
  {value:'publico',label:'Público'},
  {value:'interno',label:'Interno'},
  {value:'confidencial',label:'Confidencial'},
  {value:'restrito',label:'Restrito'}
];

export function DossierStudio(){
  const [markdown,setMarkdown]=useState(example);
  const [kind,setKind]=useState<DossierKind>('relatorio-executivo');
  const [classification,setClassification]=useState<DossierClassification>('confidencial');
  const [theme,setTheme]=useState<'auto'|'light'|'dark'>('auto');
  const [maxWords,setMaxWords]=useState(380);
  const frame=useRef<HTMLIFrameElement>(null);

  useEffect(()=>{
    try{
      const prefill=sessionStorage.getItem('predictlm:dossier-prefill');
      const savedKind=sessionStorage.getItem('predictlm:dossier-kind') as DossierKind|null;
      if(prefill){
        setMarkdown(prefill);
        sessionStorage.removeItem('predictlm:dossier-prefill');
      }
      if(savedKind&&kinds.some(x=>x.value===savedKind)){
        setKind(savedKind);
        sessionStorage.removeItem('predictlm:dossier-kind');
      }
    }catch{}
  },[]);

  const rendered=useMemo(()=>renderReportHtml(markdown,{
    maxWordsPerSection:maxWords,
    theme,
    meta:{kind,classification}
  }),[markdown,kind,classification,theme,maxWords]);

  function download(){
    const blob=new Blob([rendered.html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    const base=(rendered.dossier.title||'dossie')
      .normalize('NFD').replace(/\p{M}/gu,'')
      .replace(/[^a-z0-9]+/gi,'-')
      .replace(/^-+|-+$/g,'')
      .toLowerCase()||'dossie';
    a.download=base+'.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  return <main className="ds-root">
    <header className="ds-top">
      <div>
        <a href="/" className="ds-back"><ArrowLeft size={14}/>PredictLM</a>
        <span className="ds-kicker"><Sparkles size={12}/> REPORT ARCHITECT</span>
        <h1>Dossiê Studio</h1>
        <p>Resposta primeiro. Estrutura, evidência, qualidade e HTML determinístico.</p>
      </div>
      <div className="ds-actions">
        <button onClick={()=>frame.current?.contentWindow?.print()}><Printer size={14}/>Imprimir</button>
        <button className="primary" onClick={download}><Download size={14}/>Baixar HTML</button>
      </div>
    </header>

    <section className="ds-config">
      <label>Tipo<select value={kind} onChange={e=>setKind(e.target.value as DossierKind)}>{kinds.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label>Classificação<select value={classification} onChange={e=>setClassification(e.target.value as DossierClassification)}>{classifications.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label>Tema<select value={theme} onChange={e=>setTheme(e.target.value as 'auto'|'light'|'dark')}><option value="auto">Auto</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label>
      <label>Palavras/seção<input type="number" min={200} max={700} step={20} value={maxWords} onChange={e=>setMaxWords(Math.max(200,Math.min(700,Number(e.target.value)||380)))}/></label>
      <div className={'ds-score '+(rendered.quality.score>=85&&rendered.quality.errors===0?'good':rendered.quality.score>=65?'warn':'bad')}>
        <ShieldCheck size={17}/><div><b>{rendered.quality.score}/100</b><span>{rendered.quality.errors} erro · {rendered.quality.warnings} aviso · {rendered.quality.tips} dica</span></div>
      </div>
    </section>

    <div className="ds-grid">
      <section className="ds-editor">
        <div className="ds-pane-head"><FileText size={14}/><b>Dossier Markdown</b><span>{rendered.dossier.totalWords} palavras</span></div>
        <textarea value={markdown} onChange={e=>setMarkdown(e.target.value)} spellCheck={false}/>
        <div className="ds-issues">
          <b>Gate de qualidade</b>
          {rendered.quality.issues.length===0
            ? <p className="ok">Nenhum problema detectado. Meta de entrega atingida.</p>
            : rendered.quality.issues.map((x,index)=><article key={x.code+'-'+index} className={x.level}><span>{x.level}</span><p>{x.message}</p></article>)}
        </div>
      </section>

      <section className="ds-preview">
        <div className="ds-pane-head"><Sparkles size={14}/><b>Preview HTML</b><span>{rendered.dossier.sections.length} seções</span></div>
        <iframe ref={frame} title="Preview do dossiê" srcDoc={rendered.html}/>
      </section>
    </div>

    <style jsx>{'.ds-root{min-height:100vh;background:#080a10;color:#edf1f7;padding:24px;font-family:Inter,ui-sans-serif,system-ui}.ds-top{max-width:1480px;margin:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:10px 2px 22px}.ds-back{display:inline-flex;align-items:center;gap:5px;color:#7f8da3;text-decoration:none;font-size:10px;margin-bottom:16px}.ds-kicker{display:flex;gap:6px;align-items:center;color:#9b8cff;font-size:9px;letter-spacing:.15em}.ds-top h1{font-size:42px;letter-spacing:-.045em;margin:7px 0 3px}.ds-top p{margin:0;color:#778499;font-size:12px}.ds-actions{display:flex;gap:8px}.ds-actions button{border:1px solid #293142;background:#111722;color:#cbd5e3;border-radius:10px;padding:9px 12px;display:flex;align-items:center;gap:6px;font-size:10px}.ds-actions .primary{background:#6e55e7;border-color:#806cf0;color:#fff}.ds-config{max-width:1480px;margin:0 auto 12px;border:1px solid #202735;background:#0d121a;border-radius:14px;padding:10px;display:grid;grid-template-columns:1fr 1fr .7fr .7fr 1.1fr;gap:9px;align-items:end}.ds-config label{display:grid;gap:5px;color:#748196;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.ds-config select,.ds-config input{width:100%;border:1px solid #293143;background:#101620;color:#dbe3ef;border-radius:8px;padding:8px;font-size:10px;outline:0}.ds-score{height:45px;border:1px solid #283143;border-radius:10px;display:flex;align-items:center;gap:8px;padding:7px 10px}.ds-score b{display:block;font-size:14px}.ds-score span{display:block;color:#778499;font-size:8px}.ds-score.good{color:#68d3aa}.ds-score.warn{color:#f5b860}.ds-score.bad{color:#ff7f88}.ds-grid{max-width:1480px;margin:auto;display:grid;grid-template-columns:minmax(340px,.8fr) minmax(0,1.4fr);gap:12px;min-height:calc(100vh - 190px)}.ds-editor,.ds-preview{border:1px solid #202735;background:#0c1118;border-radius:15px;overflow:hidden;min-width:0}.ds-pane-head{height:40px;border-bottom:1px solid #202735;display:flex;gap:7px;align-items:center;padding:0 12px;color:#9b8cff}.ds-pane-head b{color:#dce4ef;font-size:10px}.ds-pane-head span{margin-left:auto;color:#687589;font-size:8px}.ds-editor textarea{display:block;width:100%;height:55vh;resize:vertical;border:0;border-bottom:1px solid #202735;background:#080c12;color:#cbd5e3;padding:16px;font:11px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;outline:0}.ds-issues{padding:12px;max-height:27vh;overflow:auto}.ds-issues>b{font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:#8d99aa}.ds-issues article{display:grid;grid-template-columns:58px 1fr;gap:8px;padding:7px 0;border-bottom:1px solid #171e29}.ds-issues article span{font:700 8px ui-monospace,monospace;text-transform:uppercase}.ds-issues article p{margin:0;color:#9aa6b8;font-size:9px}.ds-issues article.error span{color:#ff7b85}.ds-issues article.warning span{color:#f0b35d}.ds-issues article.tip span{color:#9587ed}.ds-issues .ok{font-size:9px;color:#66cfaa}.ds-preview iframe{display:block;border:0;width:100%;height:calc(100vh - 235px);min-height:620px;background:#fff}@media(max-width:980px){.ds-root{padding:12px}.ds-top{align-items:flex-start;flex-direction:column}.ds-top h1{font-size:32px}.ds-config{grid-template-columns:1fr 1fr}.ds-score{grid-column:1/-1}.ds-grid{grid-template-columns:1fr}.ds-preview iframe{height:720px}}@media(max-width:540px){.ds-config{grid-template-columns:1fr}.ds-score{grid-column:auto}.ds-actions{width:100%}.ds-actions button{flex:1;justify-content:center}}'}</style>
  </main>;
}
