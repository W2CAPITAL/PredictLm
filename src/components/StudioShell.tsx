'use client';

import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Bot, Box, Brain, ChevronDown, Code2, Download, FileCode2, Film, FolderTree, Globe2, Hammer, Layers3, MemoryStick, PanelLeft, Play, Plug, RotateCcw, Search, Send, Settings2, ShieldCheck, Sparkles, TerminalSquare, WandSparkles } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { useStudio } from '@/lib/store';
import { skills } from '@/lib/skills';
import { runPredictCore } from '@/lib/predict-core';
import { runLocal, runPuter, runServer } from '@/lib/providers';
import { buildPreview } from '@/lib/preview';
import type { PanelId, ProviderId, StudioMode } from '@/lib/types';

const panels: {id:PanelId;label:string;icon:any}[] = [
  {id:'agent',label:'Agent',icon:Bot},{id:'explorer',label:'Files',icon:FolderTree},{id:'browser',label:'Browser',icon:Globe2},{id:'skills',label:'Skills',icon:Sparkles},{id:'memory',label:'Memory',icon:Brain},{id:'media',label:'Media',icon:Film},{id:'connectors',label:'Connectors',icon:Plug},{id:'settings',label:'Settings',icon:Settings2}
];
const providers: {id:ProviderId;label:string;desc:string}[] = [
  {id:'predict-core',label:'Predict Core',desc:'Offline · sem API'},
  {id:'puter',label:'Puter / Grok',desc:'Cloud · login do usuário'},
  {id:'local',label:'Local model',desc:'Ollama / llama.cpp bridge'},
  {id:'server',label:'Server provider',desc:'Vercel env · OpenAI-compatible'}
];
const modes: StudioMode[] = ['build','plan','review','research','media'];

export function StudioShell(){
  const s = useStudio();
  const [prompt,setPrompt]=useState('');
  const [providerOpen,setProviderOpen]=useState(false);
  const [previewKey,setPreviewKey]=useState(0);
  const [memoryQuery,setMemoryQuery]=useState('');
  const files = Object.values(s.files);
  const active = s.files[s.activeFile];
  const preview = useMemo(()=>buildPreview(files),[files]);
  const filteredNotes=s.notes.filter(n=>`${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(memoryQuery.toLowerCase()));

  async function run(){
    if(!prompt.trim()||s.isRunning)return;
    const task=prompt.trim(); setPrompt(''); s.addMessage({role:'user',content:task}); s.setRunning(true);
    const recall=s.notes.filter(n=>task.toLowerCase().split(/\s+/).some(w=>w.length>4&&`${n.title} ${n.body}`.toLowerCase().includes(w))).slice(0,4);
    try{
      let result:any;
      if(s.mode==='plan'&&s.provider==='predict-core') result={explanation:'Plano criado localmente.',plan:['Definir resultado observável','Mapear arquivos e integrações','Construir menor fatia funcional','Validar preview e estados','Executar audit de qualidade','Preparar deploy'],files:[]};
      else if(s.provider==='predict-core') result=runPredictCore(task);
      else if(s.provider==='puter') result=await runPuter(`${task}\nMemory recall: ${JSON.stringify(recall)}`,files);
      else if(s.provider==='local') result=await runLocal(`${task}\nMemory recall: ${JSON.stringify(recall)}`,files,s.localEndpoint,s.localModel);
      else result=await runServer(`${task}\nMemory recall: ${JSON.stringify(recall)}`,files,s.mode);
      if(result.files?.length)s.mergeFiles(result.files);
      const body=[result.explanation,result.plan?.length?`\nPlan\n${result.plan.map((x:string,i:number)=>`${i+1}. ${x}`).join('\n')}`:''].join('');
      s.addMessage({role:'assistant',content:body});
      s.addRun({title:task,status:'done',steps:result.plan||[]});
      s.addNote({title:`Run: ${task.slice(0,50)}`,body:`Provider: ${s.provider}\nMode: ${s.mode}\n${result.explanation}`,tags:['run',s.mode,s.provider],kind:'run'});
    }catch(err:any){s.addMessage({role:'assistant',content:`Erro: ${err.message}`});s.addRun({title:task,status:'error',steps:[err.message]});}
    finally{s.setRunning(false)}
  }

  async function exportZip(){const zip=new JSZip(); files.forEach(f=>zip.file(f.path,f.content)); zip.file('predictlm.json',JSON.stringify({project:s.projectName,provider:s.provider,exportedAt:new Date().toISOString()},null,2)); const blob=await zip.generateAsync({type:'blob'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${s.projectName.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'predict-app'}.zip`;a.click();URL.revokeObjectURL(a.href)}

  return <div className="studio-root">
    <header className="studio-topbar">
      <div className="brand-mark"><div className="brand-orb"><WandSparkles size={16}/></div><div><b>PredictLM</b><span>Studio</span></div></div>
      <div className="project-chip"><span className="dot online"/><input value={s.projectName} onChange={e=>s.setProjectName(e.target.value)}/><span className="branch">main</span></div>
      <div className="mode-switch">{modes.map(m=><button key={m} className={s.mode===m?'active':''} onClick={()=>s.setMode(m)}>{m}</button>)}</div>
      <div className="top-actions"><button className="icon-btn" onClick={()=>setPreviewKey(x=>x+1)} title="Refresh preview"><RotateCcw size={15}/></button><button className="secondary" onClick={exportZip}><Download size={14}/> Export</button><button className="primary" onClick={run} disabled={s.isRunning||!prompt.trim()}><Play size={14}/>{s.isRunning?'Running':'Run agent'}</button></div>
    </header>

    <div className="studio-body">
      <aside className="rail"><div className="rail-group">{panels.map(({id,label,icon:Icon})=><button key={id} className={s.activePanel===id?'active':''} onClick={()=>s.setPanel(id)} title={label}><Icon size={19}/><span>{label}</span></button>)}</div><div className="rail-bottom"><span className="status-dot"/>local-first</div></aside>

      <section className="left-panel">
        {s.activePanel==='agent' && <><PanelTitle icon={Bot} title="Agent" subtitle="build with context"/><div className="provider-wrap"><button className="provider-btn" onClick={()=>setProviderOpen(!providerOpen)}><div><b>{providers.find(p=>p.id===s.provider)?.label}</b><span>{providers.find(p=>p.id===s.provider)?.desc}</span></div><ChevronDown size={15}/></button>{providerOpen&&<div className="provider-menu">{providers.map(p=><button key={p.id} onClick={()=>{s.setProvider(p.id);setProviderOpen(false)}}><b>{p.label}</b><span>{p.desc}</span></button>)}</div>}</div><div className="chat-list">{s.messages.length===0?<EmptyAgent/>:s.messages.map(m=><div className={`msg ${m.role}`} key={m.id}><span>{m.role==='user'?'YOU':'AI'}</span><p>{m.content}</p></div>)}{s.isRunning&&<div className="thinking"><span/><span/><span/> executing tools</div>}</div><PromptBox value={prompt} setValue={setPrompt} run={run} disabled={s.isRunning}/></>}
        {s.activePanel==='explorer' && <><PanelTitle icon={FolderTree} title="Explorer" subtitle={`${files.length} files`}/><div className="file-list">{files.map(f=><button key={f.path} className={s.activeFile===f.path?'active':''} onClick={()=>s.setActiveFile(f.path)}><FileCode2 size={14}/><span>{f.path}</span><small>{Math.ceil(f.content.length/1024)}k</small></button>)}</div></>}
        {s.activePanel==='browser' && <><PanelTitle icon={Globe2} title="Agent Browser" subtitle="bridge ready"/><InfoCard icon={Globe2} title="Browser execution" text="No Vercel, o studio monta planos e scripts. Para automação real de navegador, conecte agent-browser/MCP no desktop bridge."/><ToolRows rows={[[ 'Inspect page','DOM + screenshot context'],['Run test','browser-driven acceptance'],['Capture flow','convert interaction into reusable skill']]}/></>}
        {s.activePanel==='skills' && <><PanelTitle icon={Sparkles} title="Skills" subtitle={`${skills.length} capabilities`}/><div className="skill-list">{skills.map(k=><div className="skill" key={k.id}><div><b>{k.name}</b><span>{k.description}</span></div><small>{k.runtime}</small></div>)}</div></>}
        {s.activePanel==='memory' && <><PanelTitle icon={Brain} title="Second Brain" subtitle="recall → capture"/><div className="searchbox"><Search size={14}/><input value={memoryQuery} onChange={e=>setMemoryQuery(e.target.value)} placeholder="Search memory"/></div><button className="capture" onClick={()=>s.addNote({title:'Decision',body:'New durable project decision.',tags:['decision'],kind:'decision'})}>+ Capture decision</button><div className="memory-list">{filteredNotes.map(n=><article key={n.id}><div><b>{n.title}</b><small>{n.kind}</small></div><p>{n.body}</p><div>{n.tags.map(t=><span key={t}>#{t}</span>)}</div></article>)}</div></>}
        {s.activePanel==='media' && <><PanelTitle icon={Film} title="Media Studio" subtitle="video · image · avatar"/><ToolRows rows={[[ 'HeyGen','avatar, voice and launch-video pipelines'],['DaVinci Resolve MCP','local timeline automation bridge'],['AI Cinema','shots, scenes, continuity and assembly'],['Nano Banana Lab','image prompt recipes'],['ClipMake','short-form production workflow']]}/></>}
        {s.activePanel==='connectors' && <><PanelTitle icon={Plug} title="Connectors" subtitle="optional services"/><ToolRows rows={[[ 'Vercel','deploy + runtime'],['GitHub','repo + patch + PR'],['DataJud / DJEN','public legal data workflows'],['Snov','commercial enrichment with user credentials'],['GREY','agent bridge'],['APK Inspector','local Android analysis']]}/></>}
        {s.activePanel==='settings' && <><PanelTitle icon={Settings2} title="Runtime" subtitle="provider settings"/><label className="field"><span>Local endpoint</span><input value={s.localEndpoint} onChange={e=>s.setLocalEndpoint(e.target.value)}/></label><label className="field"><span>Local model</span><input value={s.localModel} onChange={e=>s.setLocalModel(e.target.value)}/></label><InfoCard icon={ShieldCheck} title="Secrets stay server-side" text="Cloud keys belong in Vercel environment variables. Local endpoints are stored only in your browser."/></>}
      </section>

      <main className="workbench">
        <div className="editor-pane"><div className="pane-head"><div><Code2 size={14}/><b>{active?.path||'No file'}</b></div><span>{active?.language}</span></div><div className="editor-area">{active&&<CodeMirror value={active.content} theme={oneDark} height="100%" extensions={[active.language==='css'?css():javascript({jsx:true,typescript:true})]} onChange={v=>s.updateFile(active.path,v)} basicSetup={{lineNumbers:true,foldGutter:true,highlightActiveLine:true}}/>}</div><div className="terminal-strip"><TerminalSquare size={13}/><span>Terminal bridge</span><code>desktop runtime required for shell access</code></div></div>
        <div className="preview-pane"><div className="pane-head"><div><Globe2 size={14}/><b>Preview</b></div><div className="preview-badges"><span>responsive</span><span>sandbox</span></div></div><iframe key={previewKey} srcDoc={preview} sandbox="allow-scripts allow-forms allow-modals allow-popups" title="Predict preview"/></div>
      </main>

      <aside className="context-panel"><PanelTitle icon={Layers3} title="Context" subtitle="live run state"/><div className="context-stats"><Stat icon={FileCode2} label="Files" value={String(files.length)}/><Stat icon={MemoryStick} label="Memory" value={String(s.notes.length)}/><Stat icon={Box} label="Skills" value={String(skills.length)}/><Stat icon={Hammer} label="Runs" value={String(s.runs.length)}/></div><h4>Recent runs</h4><div className="runs">{s.runs.slice(0,7).map(r=><div key={r.id}><span className={`run-dot ${r.status}`}/><div><b>{r.title}</b><small>{r.steps.length} steps · {r.status}</small></div></div>)}</div><h4>Quality gates</h4><ul className="checks"><li><ShieldCheck/> secrets isolated</li><li><PanelLeft/> responsive shell</li><li><Sparkles/> design audit ready</li><li><Brain/> memory capture on runs</li></ul></aside>
    </div>
  </div>
}

function PanelTitle({icon:Icon,title,subtitle}:{icon:any,title:string,subtitle:string}){return <div className="panel-title"><Icon size={15}/><div><b>{title}</b><span>{subtitle}</span></div></div>}
function EmptyAgent(){return <div className="empty-agent"><div className="empty-logo"><WandSparkles size={22}/></div><h3>Build with an agent,<br/>not a blank canvas.</h3><p>Predict Core can create starters offline. Connect a local model or cloud provider for deeper multi-file work.</p><div className="suggestions"><span>Build a CRM</span><span>Create a SaaS dashboard</span><span>Review this UI</span></div></div>}
function PromptBox({value,setValue,run,disabled}:{value:string,setValue:(v:string)=>void,run:()=>void,disabled:boolean}){return <div className="prompt-box"><textarea value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run()}}} placeholder="Describe an app, feature, fix, research task..."/><div><span><Sparkles size={13}/> context aware</span><button onClick={run} disabled={disabled||!value.trim()}><Send size={14}/></button></div></div>}
function InfoCard({icon:Icon,title,text}:{icon:any,title:string,text:string}){return <div className="info-card"><Icon size={17}/><div><b>{title}</b><p>{text}</p></div></div>}
function ToolRows({rows}:{rows:string[][]}){return <div className="tool-rows">{rows.map(([a,b])=><div key={a}><div><b>{a}</b><span>{b}</span></div><button>Configure</button></div>)}</div>}
function Stat({icon:Icon,label,value}:{icon:any,label:string,value:string}){return <div><Icon size={14}/><span>{label}</span><b>{value}</b></div>}
