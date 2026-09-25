'use client';

import React,{useEffect,useMemo,useState} from 'react';
import {
  AlertTriangle,ArrowLeft,BarChart3,Bell,Brain,BriefcaseBusiness,CalendarDays,CheckCircle2,
  ChevronRight,Clock3,Database,Download,ExternalLink,FileCheck2,FileText,Filter,Gavel,
  LayoutDashboard,ListTodo,Loader2,MessageCircle,MoreHorizontal,Newspaper,PanelRight,RefreshCw,
  Scale,Search,Settings,ShieldAlert,ShieldCheck,Sparkles,Table2,UserRoundCheck,Users,X
} from 'lucide-react';
import {LEGAL_TRIBUNALS} from '@/lib/legal/tribunals';
import {
  legalAttentionText,mergePortfolioCase,portfolioFromBundle,portfolioFromSearchCase,
  type LegalPortfolioCase,type LegalPortfolioMeta,type LegalPortfolioTask,type LegalRisk
} from '@/lib/legal/portfolio';
import type {DjenSearchResult,LegalProcessBundle,LegalSearchResult} from '@/lib/legal/types';
import {createLegalDossier} from '@/lib/legal/dossier';

type InspectorTab='overview'|'timeline'|'djen'|'tasks'|'ai';

const STORE='predictlm-process-center-v2';
const fmt=(v?:string)=>{
  if(!v)return '—';
  const d=new Date(v);
  return Number.isNaN(d.getTime())?v:d.toLocaleDateString('pt-BR');
};
const fmtDateTime=(v?:string)=>{
  if(!v)return '—';
  const d=new Date(v);
  return Number.isNaN(d.getTime())?v:d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
};
const cnjDigits=(v:string)=>String(v||'').replace(/\D/g,'');

function riskLabel(r:LegalRisk){return r==='critical'?'Crítico':r==='high'?'Alto':r==='medium'?'Médio':'Baixo'}
function statusLabel(s:LegalPortfolioCase['status']){
  return s==='closed'?'Encerrado':s==='silent'?'Sem andamento':s==='attention'?'Atenção':s==='active'?'Em andamento':'Indefinido';
}
function escapeCsv(v:any){
  const s=String(v??'');
  return /[;"\n"]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
function downloadText(name:string,text:string,type='text/plain;charset=utf-8'){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),400);
}
function caseCsv(rows:LegalPortfolioCase[]){
  const headers=['numero_cnj','cliente','tribunal','grau','classe','assunto','orgao_julgador','ajuizamento','ultima_atualizacao','ultimo_movimento','dias_sem_andamento','situacao','risco','prioridade','responsavel','ultimo_retorno','proximo_retorno','movimentos','publicacoes_djen','fonte'];
  return '\ufeff'+[headers.join(';'),...rows.map(x=>[
    x.processNumber,x.meta.client||'',x.tribunal,x.degree||'',x.className||'',x.subject||'',x.court||'',
    x.filedAt||'',x.lastUpdate||'',x.latestMovement||'',x.daysSilent??'',statusLabel(x.status),riskLabel(x.risk),
    x.meta.priority||'',x.meta.owner||'',x.meta.lastReturn||'',x.meta.nextReturn||'',x.movementCount,x.djenCount,x.source
  ].map(escapeCsv).join(';'))].join('\n');
}

function MiniLine({values}:{values:number[]}){
  const max=Math.max(1,...values);
  const points=values.map((v,i)=>`${(i/(Math.max(1,values.length-1)))*100},${34-(v/max)*28}`).join(' ');
  return <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="px-spark"><polyline points={points}/></svg>;
}

function RiskBadge({risk}:{risk:LegalRisk}){return <span className={'px-risk '+risk}>{riskLabel(risk)}</span>}
function StatusBadge({status}:{status:LegalPortfolioCase['status']}){return <span className={'px-status '+status}>{statusLabel(status)}</span>}

export function ProcessIntelligenceCenter(){
  const [portfolio,setPortfolio]=useState<LegalPortfolioCase[]>([]);
  const [selected,setSelected]=useState('');
  const [tab,setTab]=useState<InspectorTab>('overview');
  const [query,setQuery]=useState('');
  const [globalSearch,setGlobalSearch]=useState('');
  const [tribunal,setTribunal]=useState('TJSP');
  const [degree,setDegree]=useState('');
  const [classCode,setClassCode]=useState('');
  const [subjectCode,setSubjectCode]=useState('');
  const [municipalityCode,setMunicipalityCode]=useState('');
  const [filedFrom,setFiledFrom]=useState('');
  const [filedTo,setFiledTo]=useState('');
  const [riskFilter,setRiskFilter]=useState('');
  const [statusFilter,setStatusFilter]=useState('');
  const [priorityFilter,setPriorityFilter]=useState('');
  const [showFilters,setShowFilters]=useState(true);
  const [loading,setLoading]=useState(false);
  const [bulkLoading,setBulkLoading]=useState(false);
  const [error,setError]=useState('');
  const [searchMeta,setSearchMeta]=useState<{total:number;fetchedAt:string;caveat:string}|null>(null);
  const [changed,setChanged]=useState<string[]>([]);
  const [djenOpen,setDjenOpen]=useState(false);
  const [djenBusy,setDjenBusy]=useState(false);
  const [djenResult,setDjenResult]=useState<DjenSearchResult|null>(null);
  const [djenForm,setDjenForm]=useState({oab:'',uf:'SP',processNumber:'',from:'',to:'',keyword:'',tribunal:''});
  const [aiBusy,setAiBusy]=useState(false);
  const [aiReport,setAiReport]=useState('');
  const [taskTitle,setTaskTitle]=useState('');

  useEffect(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem(STORE)||'[]');
      if(Array.isArray(raw)){
        setPortfolio(raw);
        if(raw[0]?.processNumber)setSelected(raw[0].processNumber);
      }
    }catch{}
  },[]);

  useEffect(()=>{
    if(!portfolio.length)return;
    try{
      const compact=portfolio.map(x=>({...x,bundle:undefined}));
      localStorage.setItem(STORE,JSON.stringify(compact.slice(0,1200)));
    }catch{}
  },[portfolio]);

  const selectedCase=useMemo(()=>portfolio.find(x=>x.processNumber===selected)||null,[portfolio,selected]);

  const filtered=useMemo(()=>{
    const q=globalSearch.trim().toLowerCase();
    return portfolio.filter(x=>{
      if(q&&![
        x.processNumber,x.meta.client,x.tribunal,x.className,x.subject,x.court,x.latestMovement,x.meta.owner
      ].some(v=>String(v||'').toLowerCase().includes(q)))return false;
      if(riskFilter&&x.risk!==riskFilter)return false;
      if(statusFilter&&x.status!==statusFilter)return false;
      if(priorityFilter&&x.meta.priority!==priorityFilter)return false;
      return true;
    });
  },[portfolio,globalSearch,riskFilter,statusFilter,priorityFilter]);

  const metrics=useMemo(()=>{
    const overdue=portfolio.filter(x=>x.meta.nextReturn&&new Date(x.meta.nextReturn).getTime()<Date.now()).length;
    const silent=portfolio.filter(x=>(x.daysSilent||0)>=45&&x.status!=='closed').length;
    const high=portfolio.filter(x=>x.risk==='high'||x.risk==='critical').length;
    const recent=portfolio.filter(x=>{
      const ms=new Date(x.lastUpdate||x.latestMovementAt||'').getTime();
      return Number.isFinite(ms)&&Date.now()-ms<7*86400000;
    }).length;
    const djen=portfolio.reduce((n,x)=>n+x.djenCount,0);
    return {total:portfolio.length,silent,overdue,high,recent,djen};
  },[portfolio]);

  const tribunalDist=useMemo(()=>{
    const map=new Map<string,number>();
    portfolio.forEach(x=>map.set(x.tribunal,(map.get(x.tribunal)||0)+1));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
  },[portfolio]);

  const statusDist=useMemo(()=>{
    const keys:['active'|'silent'|'attention'|'closed'|'unknown',string][]=[
      ['active','Em andamento'],['silent','Sem andamento'],['attention','Atenção'],['closed','Encerrados'],['unknown','Outros']
    ];
    return keys.map(([k,label])=>({key:k,label,value:portfolio.filter(x=>x.status===k).length}));
  },[portfolio]);

  const silenceBands=useMemo(()=>{
    const groups=[
      {label:'0 – 30 dias',min:0,max:30},
      {label:'31 – 60 dias',min:31,max:60},
      {label:'61 – 180 dias',min:61,max:180},
      {label:'+ 180 dias',min:181,max:999999}
    ];
    return groups.map(g=>({...g,value:portfolio.filter(x=>x.daysSilent!==null&&(x.daysSilent as number)>=g.min&&(x.daysSilent as number)<=g.max).length}));
  },[portfolio]);

  const monthTrend=useMemo(()=>{
    const now=new Date();
    return Array.from({length:12},(_,idx)=>{
      const d=new Date(now.getFullYear(),now.getMonth()-11+idx,1);
      return portfolio.filter(x=>{
        const t=new Date(x.lastUpdate||x.latestMovementAt||'');
        return !Number.isNaN(t.getTime())&&t.getFullYear()===d.getFullYear()&&t.getMonth()===d.getMonth();
      }).length;
    });
  },[portfolio]);

  function upsertCases(items:LegalPortfolioCase[]){
    setPortfolio(prev=>{
      const map=new Map(prev.map(x=>[x.processNumber,x]));
      for(const item of items){
        const old=map.get(item.processNumber);
        if(old&&old.snapshotKey!==item.snapshotKey)setChanged(list=>Array.from(new Set([item.processNumber,...list])).slice(0,50));
        map.set(item.processNumber,mergePortfolioCase(old,item));
      }
      return [...map.values()].sort((a,b)=>String(b.lastUpdate||b.latestMovementAt||'').localeCompare(String(a.lastUpdate||a.latestMovementAt||'')));
    });
  }

  async function searchDatajud(){
    setLoading(true);setError('');
    try{
      if(query.trim()&&cnjDigits(query).length===20){
        const r=await fetch('/api/legal/process?number='+encodeURIComponent(query.trim()),{cache:'no-store'});
        const data=await r.json();
        if(!r.ok)throw new Error(data?.error||'Falha na consulta.');
        const current=portfolio.find(x=>x.processNumber===data.processNumber);
        const next=portfolioFromBundle(data,current?.meta||{monitored:true});
        upsertCases([next]);
        setSelected(next.processNumber);setTab('overview');
        setSearchMeta({total:1,fetchedAt:data.fetchedAt,caveat:data.summary?.caveats?.[0]||''});
        return;
      }
      const r=await fetch('/api/legal/search',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({tribunal,size:100,processNumber:query,degree,classCode,subjectCode,municipalityCode,filedFrom,filedTo})
      });
      const data:LegalSearchResult&{error?:string}=await r.json();
      if(!r.ok)throw new Error(data.error||'Falha na busca DataJud.');
      const items=data.items.map(x=>{
        const old=portfolio.find(p=>p.processNumber===x.processNumber);
        return portfolioFromSearchCase(x,old?.meta||{monitored:true});
      });
      upsertCases(items);
      if(items[0])setSelected(items[0].processNumber);
      setSearchMeta({total:data.total,fetchedAt:data.fetchedAt,caveat:data.caveat});
    }catch(e:any){setError(e?.message||'Falha na busca DataJud.')}
    finally{setLoading(false)}
  }

  async function openProcess(processNumber:string){
    setSelected(processNumber);setTab('overview');
    const existing=portfolio.find(x=>x.processNumber===processNumber);
    if(existing?.bundle)return;
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/legal/process?number='+encodeURIComponent(processNumber),{cache:'no-store'});
      const data=await r.json();
      if(!r.ok)throw new Error(data?.error||'Falha na consulta detalhada.');
      upsertCases([portfolioFromBundle(data,existing?.meta||{monitored:true})]);
    }catch(e:any){setError(e?.message||'Falha na consulta detalhada.')}
    finally{setLoading(false)}
  }

  async function refreshPortfolio(){
    const targets=portfolio.filter(x=>x.meta.monitored!==false).slice(0,20);
    if(!targets.length)return;
    setBulkLoading(true);setError('');
    try{
      for(const item of targets){
        try{
          const r=await fetch('/api/legal/process?number='+encodeURIComponent(item.processNumber),{cache:'no-store'});
          const data=await r.json();
          if(r.ok)upsertCases([portfolioFromBundle(data,item.meta)]);
        }catch{}
      }
    }finally{setBulkLoading(false)}
  }

  function updateMeta(patch:Partial<LegalPortfolioMeta>){
    if(!selectedCase)return;
    setPortfolio(prev=>prev.map(x=>x.processNumber===selectedCase.processNumber?{
      ...x,
      meta:{...x.meta,...patch,updatedAt:new Date().toISOString()}
    }:x));
  }

  function addTask(){
    const title=taskTitle.trim();
    if(!title||!selectedCase)return;
    const tasks=[...(selectedCase.meta.tasks||[]),{
      id:crypto.randomUUID?.()||String(Date.now()),title,done:false,createdAt:new Date().toISOString()
    }];
    updateMeta({tasks});setTaskTitle('');
  }
  function toggleTask(id:string){
    if(!selectedCase)return;
    updateMeta({tasks:(selectedCase.meta.tasks||[]).map(t=>t.id===id?{...t,done:!t.done}:t)});
  }

  async function searchDjen(){
    setDjenBusy(true);setError('');
    try{
      const r=await fetch('/api/legal/djen-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(djenForm)});
      const data=await r.json();
      if(!r.ok)throw new Error(data?.error||'Falha na busca DJEN.');
      setDjenResult(data);
    }catch(e:any){setError(e?.message||'Falha na busca DJEN.')}
    finally{setDjenBusy(false)}
  }

  async function generateAiReport(){
    if(!selectedCase)return;
    if(!selectedCase.bundle){await openProcess(selectedCase.processNumber);return}
    setAiBusy(true);setAiReport('');
    try{
      const bundle=selectedCase.bundle;
      const sourceText=JSON.stringify({
        processo:bundle.processNumber,
        tribunal:bundle.tribunalLabel,
        classe:bundle.datajud.class,
        assuntos:bundle.datajud.subjects,
        orgao:bundle.datajud.court,
        timeline:bundle.timeline.slice(0,80),
        publicacoes:bundle.djen.publications.slice(0,30),
        interpretacao:bundle.interpretation,
        metadadosLocais:selectedCase.meta
      },null,2);
      const r=await fetch('/api/report-dossier/generate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          request:'Gere um relatório jurídico-operacional deste processo: situação, cronologia, evidências, riscos, pendências, retornos e próximos passos. Separe fatos públicos, dados fornecidos e inferências.',
          sourceText,classification:'confidencial',depth:'deep',theme:'dark'
        })
      });
      const data=await r.json();
      if(!r.ok)throw new Error(data?.error||'Falha no relatório IA.');
      setAiReport(String(data.markdown||''));
    }catch(e:any){setError(e?.message||'Falha no relatório IA.')}
    finally{setAiBusy(false)}
  }

  function exportCsv(){downloadText('predictlm-processos.csv',caseCsv(filtered),'text/csv;charset=utf-8')}
  function exportDossier(){
    if(!selectedCase?.bundle)return;
    downloadText('dossie-'+selectedCase.digits+'.html',createLegalDossier(selectedCase.bundle,{mode:'standard'}),'text/html;charset=utf-8');
  }

  const nav=[
    {label:'Painel',icon:LayoutDashboard,href:'/'},
    {label:'Processos',icon:Scale,active:true},
    {label:'DJEN / OAB',icon:Newspaper,onClick:()=>setDjenOpen(true)},
    {label:'Tarefas',icon:ListTodo,onClick:()=>{setTab('tasks');if(selectedCase)document.querySelector('.px-inspector')?.scrollIntoView({behavior:'smooth'})}},
    {label:'Relatórios',icon:BarChart3,href:'/dossie-studio'},
    {label:'IA',icon:Brain,href:'/'}
  ];

  return <div className="px-shell">
    <aside className="px-sidebar">
      <a className="px-brand" href="/"><span className="px-brand-mark"><Sparkles size={22}/></span><span><b>PREDICT</b><small>Process Intelligence</small></span></a>
      <nav>{nav.map(item=>{
        const Icon=item.icon;
        const body=<><Icon size={16}/><span>{item.label}</span>{item.active?<i/>:null}</>;
        if(item.href)return <a key={item.label} className={item.active?'active':''} href={item.href}>{body}</a>;
        return <button key={item.label} className={item.active?'active':''} onClick={item.onClick}>{body}</button>;
      })}</nav>
      <div className="px-side-status">
        <div><i className="online"/><span><b>DataJud</b><small>91 tribunais</small></span></div>
        <div><i className="online"/><span><b>DJEN</b><small>OAB + processo</small></span></div>
        <div><i/><span><b>OAB/CNA</b><small>consulta oficial externa</small></span></div>
      </div>
      <div className="px-side-foot"><ShieldCheck size={13}/><span>Carteira local · dados públicos + anotações deste navegador</span></div>
    </aside>

    <main className="px-main">
      <header className="px-topbar">
        <div className="px-global-search"><Search size={15}/><input value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Buscar na carteira: processo, cliente, assunto, responsável..."/><kbd>Ctrl K</kbd></div>
        <select value={tribunal} onChange={e=>setTribunal(e.target.value)}><option value="">Todos os tribunais</option>{LEGAL_TRIBUNALS.map(t=><option key={t.sigla} value={t.sigla}>{t.sigla}</option>)}</select>
        <button className={showFilters?'active':''} onClick={()=>setShowFilters(v=>!v)}><Filter size={14}/>Filtros rápidos</button>
        <button className="px-icon-btn" title="Alterações detectadas"><Bell size={15}/>{changed.length?<em>{changed.length}</em>:null}</button>
        <a className="px-profile" href="/"><Brain size={16}/><span><b>PredictLM</b><small>TwinCore X10</small></span></a>
      </header>

      <section className="px-page-head">
        <div><span>PredictLM / Jurídico / Carteira</span><h1>Processos</h1><p>Análise processual densa com DataJud, DJEN, carteira local, retornos, tarefas e IA.</p></div>
        <div>
          <button onClick={refreshPortfolio} disabled={bulkLoading||!portfolio.length}>{bulkLoading?<Loader2 className="spin" size={14}/>:<RefreshCw size={14}/>}Atualizar DataJud</button>
          <button onClick={()=>setDjenOpen(true)}><Newspaper size={14}/>DJEN / OAB</button>
          <button onClick={exportCsv} disabled={!filtered.length}><Download size={14}/>Exportar CSV</button>
          <button className="primary" onClick={()=>{setTab('ai');if(selectedCase)generateAiReport()}} disabled={!selectedCase}><Sparkles size={14}/>Gerar Relatório IA</button>
        </div>
      </section>

      <section className="px-kpis">
        <article className="blue"><div><span className="px-kpi-icon"><BriefcaseBusiness size={18}/></span><span><small>Processos na carteira</small><b>{metrics.total.toLocaleString('pt-BR')}</b><em>{searchMeta?'Busca DataJud: '+searchMeta.total.toLocaleString('pt-BR'):'Carteira local'}</em></span></div><MiniLine values={monthTrend}/></article>
        <article className="amber"><div><span className="px-kpi-icon"><Clock3 size={18}/></span><span><small>Sem andamento +45 dias</small><b>{metrics.silent.toLocaleString('pt-BR')}</b><em>priorizar revisão</em></span></div><MiniLine values={silenceBands.map(x=>x.value)}/></article>
        <article className="red"><div><span className="px-kpi-icon"><AlertTriangle size={18}/></span><span><small>Retornos vencidos</small><b>{metrics.overdue.toLocaleString('pt-BR')}</b><em>dados locais</em></span></div><MiniLine values={[0,metrics.overdue,metrics.overdue,metrics.overdue+1]}/></article>
        <article className="orange"><div><span className="px-kpi-icon"><ShieldAlert size={18}/></span><span><small>Risco alto / crítico</small><b>{metrics.high.toLocaleString('pt-BR')}</b><em>triagem qualitativa</em></span></div><MiniLine values={[metrics.high,metrics.high+1,Math.max(0,metrics.high-1),metrics.high]}/></article>
        <article className="blue"><div><span className="px-kpi-icon"><Database size={18}/></span><span><small>Atualizados em 7 dias</small><b>{metrics.recent.toLocaleString('pt-BR')}</b><em>DataJud</em></span></div><MiniLine values={monthTrend.slice(-6)}/></article>
        <article className="purple"><div><span className="px-kpi-icon"><Newspaper size={18}/></span><span><small>Publicações DJEN</small><b>{metrics.djen.toLocaleString('pt-BR')}</b><em>processos detalhados</em></span></div><MiniLine values={[0,metrics.djen,Math.max(0,metrics.djen-1),metrics.djen]}/></article>
      </section>

      <section className={'px-filter-panel '+(showFilters?'open':'')}>
        <div className="px-filter-row">
          <label><span>Tribunal</span><select value={tribunal} onChange={e=>setTribunal(e.target.value)}>{LEGAL_TRIBUNALS.map(t=><option key={t.sigla}>{t.sigla}</option>)}</select></label>
          <label><span>Grau</span><select value={degree} onChange={e=>setDegree(e.target.value)}><option value="">Todos</option><option>G1</option><option>G2</option><option>JE</option><option>TR</option><option>SUP</option></select></label>
          <label><span>Classe TPU · código</span><input value={classCode} onChange={e=>setClassCode(e.target.value)} placeholder="ex. 7"/></label>
          <label><span>Assunto TPU · código</span><input value={subjectCode} onChange={e=>setSubjectCode(e.target.value)} placeholder="ex. 10433"/></label>
          <label><span>Município IBGE</span><input value={municipalityCode} onChange={e=>setMunicipalityCode(e.target.value)} placeholder="código"/></label>
          <label><span>Período</span><div className="px-date-range"><input type="date" value={filedFrom} onChange={e=>setFiledFrom(e.target.value)}/><input type="date" value={filedTo} onChange={e=>setFiledTo(e.target.value)}/></div></label>
        </div>
        <div className="px-filter-row second">
          <label><span>Risco</span><select value={riskFilter} onChange={e=>setRiskFilter(e.target.value)}><option value="">Todos</option><option value="critical">Crítico</option><option value="high">Alto</option><option value="medium">Médio</option><option value="low">Baixo</option></select></label>
          <label><span>Situação</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Todas</option><option value="active">Em andamento</option><option value="attention">Atenção</option><option value="silent">Sem andamento</option><option value="closed">Encerrado</option></select></label>
          <label><span>Prioridade</span><select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="">Todas</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
          <div className="px-cnj-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')searchDatajud()}} placeholder="Número CNJ exato ou deixe vazio para buscar no tribunal"/><button onClick={searchDatajud} disabled={loading}>{loading?<Loader2 className="spin" size={14}/>:<Filter size={14}/>}Buscar DataJud</button></div>
          <button className="px-clear" onClick={()=>{setRiskFilter('');setStatusFilter('');setPriorityFilter('');setDegree('');setClassCode('');setSubjectCode('');setMunicipalityCode('');setFiledFrom('');setFiledTo('');setQuery('')}}>Limpar filtros</button>
        </div>
        {searchMeta?<small className="px-search-caveat">{searchMeta.total.toLocaleString('pt-BR')} resultado(s) no índice · consulta {fmtDateTime(searchMeta.fetchedAt)} · {searchMeta.caveat}</small>:null}
      </section>

      {error?<div className="px-error"><AlertTriangle size={15}/><span>{error}</span><button onClick={()=>setError('')}><X size={13}/></button></div>:null}

      <section className="px-workspace">
        <div className="px-left">
          <div className="px-table-card">
            <header><div><b>Processos ({filtered.length.toLocaleString('pt-BR')})</b><span>{portfolio.length?'carteira persistida neste navegador':'busque no DataJud ou consulte um CNJ para começar'}</span></div><div><span>Ordenado por última atualização</span><button><Table2 size={13}/>Colunas</button></div></header>
            <div className="px-table-wrap">
              <table>
                <thead><tr><th></th><th>Número CNJ</th><th>Cliente</th><th>Tribunal</th><th>Classe / Assunto</th><th>Órgão julgador</th><th>Última atualização</th><th>Último movimento</th><th>Dias</th><th>Situação</th><th>Risco</th><th>Responsável</th><th>Próximo retorno</th><th></th></tr></thead>
                <tbody>{filtered.length?filtered.map(item=><tr key={item.processNumber} className={selected===item.processNumber?'selected':''} onClick={()=>openProcess(item.processNumber)}>
                  <td><span className={'px-watch '+(item.meta.monitored===false?'off':'')}/></td>
                  <td><button className="px-cnj-link" onClick={e=>{e.stopPropagation();openProcess(item.processNumber)}}>{item.processNumber}</button>{changed.includes(item.processNumber)?<small className="px-new">novo</small>:null}</td>
                  <td>{item.meta.client||'—'}</td>
                  <td>{item.tribunal}</td>
                  <td><b>{item.className||'—'}</b><small>{item.subject||''}</small></td>
                  <td>{item.court||'—'}</td>
                  <td>{fmt(item.lastUpdate)}</td>
                  <td><span className="px-movement">{item.latestMovement||'—'}</span></td>
                  <td className={(item.daysSilent||0)>=120?'danger':(item.daysSilent||0)>=45?'warn':''}>{item.daysSilent??'—'}</td>
                  <td><StatusBadge status={item.status}/></td>
                  <td><RiskBadge risk={item.risk}/></td>
                  <td>{item.meta.owner||'—'}</td>
                  <td className={item.meta.nextReturn&&new Date(item.meta.nextReturn).getTime()<Date.now()?'danger':''}>{item.meta.nextReturn?fmt(item.meta.nextReturn):'—'}</td>
                  <td><MoreHorizontal size={14}/></td>
                </tr>):<tr><td colSpan={14} className="px-empty-row"><Database size={22}/><b>Nenhum processo na carteira</b><span>Use os filtros DataJud, consulte um CNJ ou pesquise publicações DJEN por OAB.</span></td></tr>}</tbody>
              </table>
            </div>
          </div>

          <div className="px-analytics">
            <article><header><b>Distribuição por tribunal</b></header>{tribunalDist.length?<div className="px-bars">{tribunalDist.map(([name,value])=><div key={name}><span>{name}</span><i><em style={{width:(value/Math.max(1,tribunalDist[0][1]))*100+'%'}}/></i><b>{value}</b></div>)}</div>:<p>Sem dados.</p>}</article>
            <article><header><b>Situação dos processos</b></header><div className="px-status-list">{statusDist.map(x=><div key={x.key}><span><i className={x.key}/>{x.label}</span><b>{x.value}</b></div>)}</div></article>
            <article className="wide"><header><b>Evolução de atualizações</b><span>últimos 12 meses</span></header><div className="px-chart"><MiniLine values={monthTrend}/><div>{['-11m','-9m','-7m','-5m','-3m','agora'].map(x=><span key={x}>{x}</span>)}</div></div></article>
          </div>
        </div>

        <aside className="px-inspector">
          {selectedCase?<>
            <header className="px-case-head"><div><b>{selectedCase.processNumber}</b><span>{selectedCase.className||'Processo'} · {selectedCase.tribunal}</span><div><StatusBadge status={selectedCase.status}/><RiskBadge risk={selectedCase.risk}/></div></div><button onClick={()=>openProcess(selectedCase.processNumber)} title="Atualizar"><RefreshCw size={14}/></button></header>
            <nav className="px-inspector-tabs">
              {([['overview','Visão geral'],['timeline','Movimentos'],['djen','DJEN'],['tasks','Tarefas'],['ai','IA']] as [InspectorTab,string][]).map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}
            </nav>

            {tab==='overview'?<div className="px-inspector-body">
              <section className="px-detail-grid"><div><span>Órgão</span><b>{selectedCase.court||'—'}</b></div><div><span>Grau</span><b>{selectedCase.degree||'—'}</b></div><div><span>Ajuizamento</span><b>{fmt(selectedCase.filedAt)}</b></div><div><span>Última atualização</span><b>{fmt(selectedCase.lastUpdate)}</b></div></section>
              <section className="px-local-meta"><h3>Gestão interna</h3>
                <label><span>Cliente</span><input value={selectedCase.meta.client||''} onChange={e=>updateMeta({client:e.target.value})} placeholder="Cliente / unidade / carteira"/></label>
                <div><label><span>Responsável</span><input value={selectedCase.meta.owner||''} onChange={e=>updateMeta({owner:e.target.value})} placeholder="Responsável"/></label><label><span>Prioridade</span><select value={selectedCase.meta.priority||'medium'} onChange={e=>updateMeta({priority:e.target.value as any})}><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label></div>
                <div><label><span>Último retorno</span><input type="date" value={(selectedCase.meta.lastReturn||'').slice(0,10)} onChange={e=>updateMeta({lastReturn:e.target.value})}/></label><label><span>Próximo retorno</span><input type="date" value={(selectedCase.meta.nextReturn||'').slice(0,10)} onChange={e=>updateMeta({nextReturn:e.target.value})}/></label></div>
                <label><span>Notas</span><textarea value={selectedCase.meta.notes||''} onChange={e=>updateMeta({notes:e.target.value})} placeholder="Notas operacionais locais; não são enviadas ao DataJud."/></label>
              </section>
              <section className="px-alerts"><h3>Alertas</h3><div className={'px-alert '+(selectedCase.risk==='critical'?'critical':'')}><AlertTriangle size={14}/><span><b>{legalAttentionText(selectedCase)}</b><small>{selectedCase.daysSilent!==null?selectedCase.daysSilent+' dia(s) desde o evento/atualização mais recente':'sem data confiável'}</small></span></div>{selectedCase.djenCount>0?<div className="px-alert amber"><Newspaper size={14}/><span><b>{selectedCase.djenCount} publicação(ões) DJEN</b><small>leia o inteiro teor antes de calcular prazo</small></span></div>:null}</section>
            </div>:null}

            {tab==='timeline'?<div className="px-inspector-body"><section className="px-timeline-mini"><h3>Linha do tempo</h3>{selectedCase.bundle?.timeline?.length?selectedCase.bundle.timeline.slice(0,30).map(x=><article key={x.id}><i/><div><span>{fmtDateTime(x.date)} · {x.source}</span><b>{x.title}</b>{x.body?<p>{x.body}</p>:null}</div></article>):<div className="px-inspector-empty"><RefreshCw size={17}/><span>Abra/atualize o processo para carregar a timeline completa.</span></div>}</section></div>:null}

            {tab==='djen'?<div className="px-inspector-body"><section className="px-publications-mini"><h3>Publicações DJEN</h3>{selectedCase.bundle?.djen.publications?.length?selectedCase.bundle.djen.publications.slice(0,25).map(p=><article key={p.id}><div><b>{p.type}</b><span>{fmtDateTime(p.availableAt)}</span></div><p>{p.text||'Sem texto normalizado.'}</p>{p.certificateUrl?<a href={p.certificateUrl} target="_blank" rel="noreferrer">Certidão <ExternalLink size={10}/></a>:null}</article>):<div className="px-inspector-empty"><Newspaper size={17}/><span>Nenhuma publicação carregada. Use DJEN/OAB para pesquisa ampla.</span></div>}</section></div>:null}

            {tab==='tasks'?<div className="px-inspector-body"><section className="px-task-box"><h3>Tarefas do processo</h3><div className="px-task-add"><input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addTask()}} placeholder="Ex.: analisar despacho, pedir documento..."/><button onClick={addTask}><CheckCircle2 size={13}/>Adicionar</button></div><div className="px-task-list">{selectedCase.meta.tasks?.length?selectedCase.meta.tasks.map(t=><button key={t.id} className={t.done?'done':''} onClick={()=>toggleTask(t.id)}><i>{t.done?'✓':''}</i><span>{t.title}</span><small>{fmt(t.createdAt)}</small></button>):<p>Nenhuma tarefa local.</p>}</div></section></div>:null}

            {tab==='ai'?<div className="px-inspector-body"><section className="px-ai-card"><div><Sparkles size={17}/><span><b>Insights do TwinCore</b><small>DataJud + DJEN + metadados locais, com proveniência</small></span></div>{selectedCase.bundle?<><p>{selectedCase.bundle.interpretation.currentState}</p><ul>{selectedCase.bundle.interpretation.nextActions.map((x,i)=><li key={i}>{x}</li>)}</ul></>:<p>Abra o processo para carregar a análise completa.</p>}<button onClick={generateAiReport} disabled={aiBusy}>{aiBusy?<Loader2 className="spin" size={13}/>:<Brain size={13}/>}Gerar relatório IA completo</button></section>{aiReport?<pre className="px-ai-report">{aiReport}</pre>:null}</div>:null}

            <footer className="px-inspector-foot"><button onClick={exportDossier} disabled={!selectedCase.bundle}><FileText size={13}/>Dossiê HTML</button><button onClick={()=>updateMeta({monitored:selectedCase.meta.monitored===false})}>{selectedCase.meta.monitored===false?'Monitorar':'Pausar monitoramento'}</button></footer>
          </>:<div className="px-no-selection"><PanelRight size={28}/><b>Selecione um processo</b><span>O painel lateral reúne timeline, DJEN, tarefas, retornos e IA.</span></div>}
        </aside>
      </section>

      <section className="px-bottom-analysis">
        <article><header><b>Processos por tempo sem andamento</b></header>{silenceBands.map((x,i)=><div key={x.label}><span>{x.label}</span><i><em className={'b'+i} style={{width:(x.value/Math.max(1,...silenceBands.map(b=>b.value)))*100+'%'}}/></i><b>{x.value}</b></div>)}</article>
        <article><header><b>Integrações operacionais</b></header><div className="px-integrations"><span><i className="ok"/>DataJud · busca/monitoramento</span><span><i className="ok"/>DJEN · OAB/processo</span><span><i/>PJe/e-SAJ · fallback específico</span><span><i/>OAB/CNA · abrir consulta oficial</span></div></article>
        <article><header><b>Governança</b></header><p>DataJud pode apresentar defasagem e o DJEN não substitui a leitura integral. Prazos e decisões de mérito devem ser confirmados no portal/autos. Notas e tarefas desta carteira ficam apenas neste navegador.</p></article>
      </section>
    </main>

    {djenOpen?<div className="px-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDjenOpen(false)}}><section className="px-djen-modal">
      <header><div><Newspaper size={18}/><span><b>Radar DJEN</b><small>Pesquisa oficial por OAB/UF ou número CNJ</small></span></div><button onClick={()=>setDjenOpen(false)}><X size={15}/></button></header>
      <div className="px-djen-form">
        <label><span>OAB</span><input value={djenForm.oab} onChange={e=>setDjenForm({...djenForm,oab:e.target.value})} placeholder="123456"/></label>
        <label><span>UF</span><input value={djenForm.uf} maxLength={2} onChange={e=>setDjenForm({...djenForm,uf:e.target.value.toUpperCase()})}/></label>
        <label className="wide"><span>Ou processo CNJ</span><input value={djenForm.processNumber} onChange={e=>setDjenForm({...djenForm,processNumber:e.target.value})} placeholder="0000000-00.0000.0.00.0000"/></label>
        <label><span>De</span><input type="date" value={djenForm.from} onChange={e=>setDjenForm({...djenForm,from:e.target.value})}/></label>
        <label><span>Até</span><input type="date" value={djenForm.to} onChange={e=>setDjenForm({...djenForm,to:e.target.value})}/></label>
        <label><span>Tribunal</span><input value={djenForm.tribunal} onChange={e=>setDjenForm({...djenForm,tribunal:e.target.value})} placeholder="TJSP"/></label>
        <label><span>Palavra-chave</span><input value={djenForm.keyword} onChange={e=>setDjenForm({...djenForm,keyword:e.target.value})} placeholder="liminar, penhora..."/></label>
      </div>
      <button className="px-djen-search" onClick={searchDjen} disabled={djenBusy||(!djenForm.oab.trim()&&!djenForm.processNumber.trim())}>{djenBusy?<Loader2 className="spin" size={14}/>:<Search size={14}/>}Pesquisar publicações</button>
      {djenResult?<div className="px-djen-results"><div className="px-djen-summary"><b>{djenResult.items.length} exibida(s)</b><span>{djenResult.count} total informado pela API · {fmtDateTime(djenResult.fetchedAt)}</span></div>{djenResult.items.map(p=><article key={p.id}><header><div><b>{p.processNumber}</b><span>{p.tribunal||'DJEN'} · {fmtDateTime(p.availableAt)}</span></div><button onClick={()=>{setDjenOpen(false);setQuery(p.processNumber);setTimeout(()=>openProcess(p.processNumber),0)}}>Abrir processo <ChevronRight size={11}/></button></header><strong>{p.type}</strong><p>{p.text||'Sem texto normalizado.'}</p></article>)}<small>{djenResult.caveat}</small></div>:null}
    </section></div>:null}
  </div>;
}
