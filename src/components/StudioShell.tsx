'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Bot, Brain, ChevronDown, Code2, Download, FileCode2, Film, FolderTree, Globe2, Hammer, Layers3, MemoryStick, MessageSquare, PanelLeft, Play, Plug, Plus, RotateCcw, Search, Send, Settings2, ShieldCheck, Sparkles, TerminalSquare, Trash2, Upload, WandSparkles } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { useStudio } from '@/lib/store';
import { skills } from '@/lib/skills';
import { explainDeepThink, runPredictCore } from '@/lib/predict-core';
import { orchestrateBuild, type BuildPhase } from '@/lib/build-orchestrator';
import { buildRunnableProject } from '@/lib/project-packager';
import { enhanceBuildPrompt, promptPresets, type PromptPreset } from '@/lib/prompt-enhancer';
import { resolveBuildTurn } from '@/lib/build-turn';
import { answerLocally } from '@/lib/browser-brain';
import { runLocal, runPuter, runServer } from '@/lib/providers';
import { buildPreview } from '@/lib/preview';
import { runLocalCouncil } from '@/lib/council';
import { CouncilPanel } from '@/components/CouncilPanel';
import { GraphPanel } from '@/components/GraphPanel';
import { ResearchPanel } from '@/components/ResearchPanel';
import { BrowserToolsPanel, ConnectorsToolsPanel, MediaToolsPanel, SettingsToolsPanel } from '@/components/UtilityPanels';
import { languageFromPath } from '@/lib/local-tools';
import type { PanelId, ProviderId, StudioMode } from '@/lib/types';

const panels: {id:PanelId;label:string;icon:any}[] = [
  {id:'agent',label:'Agent',icon:Bot},
  {id:'explorer',label:'Files',icon:FolderTree},
  {id:'research',label:'Research',icon:Search},
  {id:'council',label:'Council',icon:ShieldCheck},
  {id:'graph',label:'Graph',icon:Layers3},
  {id:'browser',label:'Browser',icon:Globe2},
  {id:'skills',label:'Skills',icon:Sparkles},
  {id:'memory',label:'Memory',icon:Brain},
  {id:'media',label:'Media',icon:Film},
  {id:'connectors',label:'Connectors',icon:Plug},
  {id:'settings',label:'Settings',icon:Settings2}
];
const providers: {id:ProviderId;label:string;desc:string}[] = [
  {id:'predict-core',label:'Predict DeepThink',desc:'Zero API · zero Ollama · funcional'},
  {id:'puter',label:'Cloud Boost · Puter',desc:'Opcional · sessão do usuário'},
  {id:'server',label:'Cloud API',desc:'Opcional · env do Vercel'}
];
const modes: StudioMode[] = ['build','plan','review','research','media'];

export function StudioShell({onExitToChat}:{onExitToChat?:()=>void}){
  const s = useStudio();
  const [prompt,setPrompt]=useState('');
  const [providerOpen,setProviderOpen]=useState(false);
  const [previewKey,setPreviewKey]=useState(0);
  const [memoryQuery,setMemoryQuery]=useState('');
  const [memoryDraft,setMemoryDraft]=useState('');
  const [skillQuery,setSkillQuery]=useState('');
  const [inspectMode,setInspectMode]=useState(false);
  const [selectedElement,setSelectedElement]=useState<{tag:string;id:string;classes:string[];text:string;rect:{x:number;y:number;width:number;height:number}}|null>(null);
  const [buildPhases,setBuildPhases]=useState<BuildPhase[]>([]);
  const iframeRef=useRef<HTMLIFrameElement>(null);
  const importRef=useRef<HTMLInputElement>(null);
  const files = Object.values(s.files);
  const active = s.files[s.activeFile];
  const preview = useMemo(()=>buildPreview(files),[files]);
  const filteredNotes=s.notes.filter(n=>`${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(memoryQuery.toLowerCase()));
  const filteredSkills=skills.filter(k=>(k.name+' '+k.category+' '+k.description+' '+k.source).toLowerCase().includes(skillQuery.toLowerCase()));
  const council=useMemo(()=>runLocalCouncil(files),[files]);
  const currentProvider=providers.find(p=>p.id===s.provider)||providers[0];

  useEffect(()=>{
    if(s.provider==='local')s.setProvider('predict-core');
  },[s.provider]);

  useEffect(()=>{
    const handler=(event:MessageEvent)=>{
      if(event.source!==iframeRef.current?.contentWindow)return;
      if(event.data?.type==='predictlm:inspect')setSelectedElement(event.data.payload);
    };
    window.addEventListener('message',handler);
    return ()=>window.removeEventListener('message',handler);
  },[]);

  useEffect(()=>{
    const frame=iframeRef.current;
    if(!frame)return;
    const send=()=>frame.contentWindow?.postMessage({type:'predictlm:set-inspect',enabled:inspectMode},'*');
    frame.addEventListener('load',send);
    send();
    return ()=>frame.removeEventListener('load',send);
  },[inspectMode,previewKey,preview]);

  function selectMode(mode:StudioMode){
    s.setMode(mode);
    if(mode==='review')s.setPanel('council');
    else if(mode==='research')s.setPanel('research');
    else if(mode==='media')s.setPanel('media');
    else s.setPanel('agent');
  }

  function createFile(){
    const path=window.prompt('Nome do novo arquivo (ex.: components/Card.tsx)');
    if(!path?.trim())return;
    const clean=path.trim().replace(/^\/+/, '');
    if(s.files[clean]){s.setActiveFile(clean);return;}
    s.addFile(clean,'',languageFromPath(clean));
  }

  function deleteActive(){
    if(!active)return;
    if(!window.confirm('Excluir '+active.path+' do workspace local?'))return;
    s.removeFile(active.path);
  }

  async function importZipFile(file:File){
    try{
      const zip=await JSZip.loadAsync(file);
      const entries=Object.values(zip.files)
        .filter(x=>!x.dir)
        .filter(x=>!/(^|\/)(node_modules|\.git|\.next|dist|build)(\/|$)/.test(x.name))
        .filter(x=>/\.(tsx?|jsx?|css|json|md|mdx|html|txt)$|(^|\/)\.env\.example$/.test(x.name))
        .slice(0,250);
      const imported=[];
      for(const entry of entries){
        const body=await entry.async('string');
        if(body.length>800000)continue;
        imported.push({path:entry.name.replace(/^\.\//,''),content:body,language:languageFromPath(entry.name)});
      }
      if(!imported.length)throw new Error('Nenhum arquivo de texto compatível encontrado no ZIP.');
      s.replaceFiles(imported);
      const meta=zip.file('predictlm.json');
      if(meta){
        try{const parsed=JSON.parse(await meta.async('string'));if(parsed?.project)s.setProjectName(String(parsed.project)+' Imported');}catch{}
      }else s.setProjectName(file.name.replace(/\.zip$/i,'')||'Imported Project');
      s.addNote({title:'Project imported',body:imported.length+' arquivo(s) restaurados de '+file.name+'.',tags:['import','snapshot'],kind:'run'});
      s.addMessage({role:'assistant',content:'Projeto importado: '+imported.length+' arquivo(s). O preview foi reconstruído localmente.'});
      setPreviewKey(x=>x+1);
    }catch(err:any){s.addMessage({role:'assistant',content:'Falha ao importar ZIP: '+(err?.message||'erro desconhecido')});}
    finally{if(importRef.current)importRef.current.value='';}
  }

  async function run(){
    if(!prompt.trim()||s.isRunning)return;
    const task=prompt.trim();
    const turn=resolveBuildTurn(task,files,s.messages);
    setPrompt('');
    s.addMessage({role:'user',content:task});

    if(turn.kind==='conversation'){
      s.setRunning(true);
      setBuildPhases([]);
      try{
        const history=s.messages.slice(-10).map(m=>({role:m.role,content:m.content}));
        const reply=await answerLocally(task+'\n\n'+(turn.context||''),history,{preferNative:true,knowledge:true});
        s.addMessage({role:'assistant',content:reply.content});
      }catch(err:any){
        s.addMessage({role:'assistant',content:'Posso continuar conversando sem alterar o projeto. '+(err?.message||'')});
      }finally{s.setRunning(false)}
      return;
    }

    const effectiveTask=turn.effectivePrompt;
    s.setRunning(true);
    setBuildPhases([{id:'intent',label:'Intent & context',status:'done',detail:turn.kind==='continue'?'Continuing the active project from current files…':'Starting multi-pass analysis…'}]);
    const recall=s.notes.filter(n=>effectiveTask.toLowerCase().split(/\s+/).some(w=>w.length>4&&(`${n.title} ${n.body}`).toLowerCase().includes(w))).slice(0,4);

    try{
      let result:any;
      if(s.mode==='review'&&s.provider==='predict-core'){
        const review=runLocalCouncil(files);
        result={explanation:'Council local: '+review.score+'/100. '+review.consensus.join(' '),plan:review.consensus,files:[],phases:[{id:'review',label:'Council & security',status:review.score>=75?'done':'warn',detail:review.score+'/100'}]};
      }else if(s.mode==='plan'&&s.provider==='predict-core'){
        const info=explainDeepThink(effectiveTask);
        const planned=orchestrateBuild(effectiveTask,files,s.deepThinkLevel);
        result={explanation:'Plano multi-pass preparado para o projeto atual (“'+(turn.activeIntent||info.intent)+'”). Nenhum arquivo foi aplicado porque você está em PLAN.',plan:planned.plan,files:[],phases:planned.phases};
      }else if(s.provider==='predict-core'){
        result=orchestrateBuild(effectiveTask,files,s.deepThinkLevel);
      }else{
        try{
          if(s.provider==='puter')result=await runPuter(effectiveTask+'\nMemory recall: '+JSON.stringify(recall),files);
          else if(s.provider==='local')result=await runLocal(effectiveTask+'\nMemory recall: '+JSON.stringify(recall),files,s.localEndpoint,s.localModel);
          else result=await runServer(effectiveTask+'\nMemory recall: '+JSON.stringify(recall),files,s.mode);
        }catch(externalError:any){
          if(!s.autoFallback)throw externalError;
          const fallback=orchestrateBuild(effectiveTask,files,s.deepThinkLevel);
          result={...fallback,explanation:'Provider opcional indisponível ('+(externalError?.message||'erro')+'). O Build continuou localmente. '+fallback.explanation};
          s.setProvider('predict-core');
        }
      }

      if(result.phases)setBuildPhases(result.phases);
      if(result.files?.length){
        if(result.packageFiles)s.replaceFiles(result.files);
        else s.mergeFiles(result.files);
      }

      const phaseText=result.phases?.length?'\n\nExecution\n'+result.phases.map((p:any)=>'['+String(p.status).toUpperCase()+'] '+p.label+' — '+p.detail).join('\n'):'';
      const planText=result.plan?.length?'\n\nPlan\n'+result.plan.map((x:string,i:number)=>(i+1)+'. '+x).join('\n'):'';
      const body=String(result.explanation||'Tarefa concluída.')+phaseText+planText;
      s.addMessage({role:'assistant',content:body});
      s.addRun({title:task,status:'done',steps:result.plan||result.phases?.map((p:any)=>p.label)||[]});
      s.addNote({title:'Run: '+task.slice(0,50),body:'Provider: '+s.provider+'\nMode: '+s.mode+'\nTurn: '+turn.kind+'\n'+String(result.explanation||''),tags:['run',s.mode,s.provider,turn.kind],kind:'run'});
      setPreviewKey(x=>x+1);
    }catch(err:any){
      s.addMessage({role:'assistant',content:'Erro: '+(err?.message||'falha desconhecida')});
      s.addRun({title:task,status:'error',steps:[err?.message||'error']});
      setBuildPhases(p=>[...p,{id:'error',label:'Execution stopped',status:'warn',detail:err?.message||'Unknown error'}]);
    }finally{s.setRunning(false)}
  }

  async function exportZip(){
    const packageFiles=buildRunnableProject(files);
    const zip=new JSZip();
    packageFiles.forEach(f=>zip.file(f.path,f.content));
    zip.file('predictlm.json',JSON.stringify({project:s.projectName,provider:s.provider,deepThink:s.deepThinkLevel,sourceFiles:files.map(f=>f.path),packagedFiles:packageFiles.map(f=>f.path),exportedAt:new Date().toISOString()},null,2));
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=(s.projectName.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'predict-app')+'.zip';
    a.click();
    URL.revokeObjectURL(a.href);
    s.addNote({title:'Runnable ZIP exported',body:packageFiles.length+' file(s) packaged with Vite, tests and setup instructions.',tags:['export','zip','runnable'],kind:'run'});
  }

  return <div className="studio-root">
    <header className="studio-topbar">
      <div className="brand-mark"><div className="brand-orb"><WandSparkles size={16}/></div><div><b>PredictLM</b><span>Studio</span></div></div>
      <div className="build-surface-switch"><button onClick={onExitToChat}><MessageSquare size={12}/> Chat</button><button className="active"><Code2 size={12}/> Build</button></div>
      <div className="project-chip"><span className="dot online"/><input value={s.projectName} onChange={e=>s.setProjectName(e.target.value)}/><span className="branch">main</span></div>
      <div className="mode-switch">{modes.map(m=><button key={m} className={s.mode===m?'active':''} onClick={()=>selectMode(m)}>{m}</button>)}</div>
      <div className="top-actions"><input ref={importRef} type="file" accept=".zip" hidden onChange={e=>e.target.files?.[0]&&importZipFile(e.target.files[0])}/><button className="icon-btn" onClick={()=>setPreviewKey(x=>x+1)} title="Refresh preview"><RotateCcw size={15}/></button><button className="secondary" onClick={()=>importRef.current?.click()}><Upload size={14}/> Import</button><button className="secondary" onClick={exportZip}><Download size={14}/> Export</button><button className="primary" onClick={run} disabled={s.isRunning||!prompt.trim()}><Play size={14}/>{s.isRunning?'Running':'Run agent'}</button></div>
    </header>

    <div className="studio-body">
      <aside className="rail"><div className="rail-group">{panels.map(({id,label,icon:Icon})=><button key={id} className={s.activePanel===id?'active':''} onClick={()=>s.setPanel(id)} title={label}><Icon size={19}/><span>{label}</span></button>)}</div><div className="rail-bottom"><span className="status-dot"/>local-first</div></aside>

      <section className="left-panel">
        {s.activePanel==='agent' && <><PanelTitle icon={Bot} title="Agent" subtitle="build with context"/><div className="provider-wrap"><button className="provider-btn" onClick={()=>setProviderOpen(!providerOpen)}><div><b>{currentProvider.label}</b><span>{currentProvider.desc} · depth {s.deepThinkLevel}</span></div><ChevronDown size={15}/></button>{providerOpen&&<div className="provider-menu">{providers.map(p=><button key={p.id} onClick={()=>{s.setProvider(p.id);setProviderOpen(false)}}><b>{p.label}</b><span>{p.desc}</span></button>)}</div>}</div><div className="chat-list">{s.messages.length===0?<EmptyAgent setPrompt={setPrompt}/>:s.messages.map(m=><div className={`msg ${m.role}`} key={m.id}><span>{m.role==='user'?'YOU':'AI'}</span><p>{m.content}</p></div>)}{s.isRunning&&<div className="thinking"><span/><span/><span/> executing tools</div>}</div><PromptBox value={prompt} setValue={setPrompt} run={run} disabled={s.isRunning} files={files}/></>}
        {s.activePanel==='explorer' && <><PanelTitle icon={FolderTree} title="Explorer" subtitle={files.length+' files'}/><div className="file-actions"><button onClick={createFile}><Plus size={12}/> Novo</button><button onClick={s.cloneProject}>Clonar</button><button onClick={deleteActive} disabled={!active}><Trash2 size={12}/> Excluir</button></div><div className="file-list">{files.map(f=><button key={f.path} className={s.activeFile===f.path?'active':''} onClick={()=>s.setActiveFile(f.path)}><FileCode2 size={14}/><span>{f.path}</span><small>{Math.ceil(f.content.length/1024)}k</small></button>)}</div></>}
        {s.activePanel==='research' && <><PanelTitle icon={Search} title="Research" subtitle="web · news · images"/><ResearchPanel/></>}
        {s.activePanel==='council' && <><PanelTitle icon={ShieldCheck} title="Council" subtitle="review before ship"/><CouncilPanel/></>}
        {s.activePanel==='graph' && <><PanelTitle icon={Layers3} title="Knowledge Graph" subtitle="codebase relationships"/><GraphPanel/></>}
        {s.activePanel==='browser' && <><PanelTitle icon={Globe2} title="Browser Lab" subtitle="zero-api preview tools"/><BrowserToolsPanel inspectMode={inspectMode} setInspectMode={setInspectMode} onRefresh={()=>setPreviewKey(x=>x+1)}/></>}
        {s.activePanel==='skills' && <><PanelTitle icon={Sparkles} title="Skills" subtitle={filteredSkills.length+' / '+skills.length+' capabilities'}/><div className="searchbox"><Search size={14}/><input value={skillQuery} onChange={e=>setSkillQuery(e.target.value)} placeholder="Filtrar skills, fontes ou categorias"/></div><div className="skill-list">{filteredSkills.map(k=><div className="skill" key={k.id}><div><b>{k.name}</b><span>{k.description}</span><em>{k.source}</em></div><div className="skill-actions"><small>{k.runtime}</small><button onClick={()=>{setPrompt('Use a skill '+k.name+': '+k.description+'. Aplique ao projeto atual sem remover funcionalidades existentes.');s.setMode('build');s.setPanel('agent')}}>Usar</button></div></div>)}</div></>}
        {s.activePanel==='memory' && <><PanelTitle icon={Brain} title="Second Brain" subtitle="recall → capture"/><div className="memory-compose"><textarea value={memoryDraft} onChange={e=>setMemoryDraft(e.target.value)} placeholder="Registre uma decisão, regra ou contexto que o agente deve lembrar..."/><button onClick={()=>{const v=memoryDraft.trim();if(!v)return;s.addNote({title:v.slice(0,48),body:v,tags:['manual','memory'],kind:'note'});setMemoryDraft('')}}>Salvar memória</button></div><div className="searchbox"><Search size={14}/><input value={memoryQuery} onChange={e=>setMemoryQuery(e.target.value)} placeholder="Buscar memória"/></div><div className="memory-list">{filteredNotes.length===0?<div className="empty-small">Nenhuma memória encontrada.</div>:filteredNotes.map(n=><article key={n.id}><div><b>{n.title}</b><small>{n.kind}</small></div><p>{n.body}</p><div>{n.tags.map(t=><span key={t}>#{t}</span>)}</div></article>)}</div></>}
        {s.activePanel==='media' && <><PanelTitle icon={Film} title="Media Studio" subtitle="local pre-production"/><MediaToolsPanel/></>}
        {s.activePanel==='connectors' && <><PanelTitle icon={Plug} title="Connectors" subtitle="local-first capability status"/><ConnectorsToolsPanel/></>}
        {s.activePanel==='settings' && <><PanelTitle icon={Settings2} title="Settings" subtitle="DeepThink first"/><SettingsToolsPanel/></>}
      </section>

      <main className="workbench">
        <div className="editor-pane"><div className="pane-head"><div><Code2 size={14}/><b>{active?.path||'No file'}</b></div><span>{active?.language}</span></div><div className="editor-area">{active&&<CodeMirror value={active.content} theme={oneDark} height="100%" extensions={[active.language==='css'?css():javascript({jsx:true,typescript:true})]} onChange={v=>s.updateFile(active.path,v)} basicSetup={{lineNumbers:true,foldGutter:true,highlightActiveLine:true}}/>}</div><div className="terminal-strip"><TerminalSquare size={13}/><span>Terminal bridge</span><code>desktop runtime required for shell access</code></div></div>
        <div className="preview-pane"><div className="pane-head"><div><Globe2 size={14}/><b>Preview</b></div><div className="preview-badges"><button className={inspectMode?'active':''} onClick={()=>{setInspectMode(v=>!v);setSelectedElement(null)}}>Inspect</button><span>responsive</span><span>sandbox</span></div></div><iframe ref={iframeRef} key={previewKey} srcDoc={preview} sandbox="allow-scripts allow-forms allow-modals allow-popups" title="Predict preview"/></div>
      </main>

      <aside className="context-panel"><PanelTitle icon={Layers3} title="Context" subtitle="live run state"/><div className="context-stats"><Stat icon={FileCode2} label="Files" value={String(files.length)}/><Stat icon={MemoryStick} label="Memory" value={String(s.notes.length)}/><Stat icon={ShieldCheck} label="Ship score" value={String(council.score)}/><Stat icon={Hammer} label="Runs" value={String(s.runs.length)}/></div>{selectedElement&&<><h4>Inspected element</h4><div className="inspect-card"><b>{selectedElement.tag}{selectedElement.id?'#'+selectedElement.id:''}</b><span>{selectedElement.classes.join(' · ')||'no classes'}</span><p>{selectedElement.text||'No text content'}</p><small>{selectedElement.rect.width}×{selectedElement.rect.height} at {selectedElement.rect.x},{selectedElement.rect.y}</small></div></>}{buildPhases.length>0&&<><h4>Build orchestration</h4><div className="phase-list">{buildPhases.map(p=><div className={'phase '+p.status} key={p.id}><span>{p.status==='done'?'✓':p.status==='skip'?'–':'!'}</span><div><b>{p.label}</b><small>{p.detail}</small></div></div>)}</div></>}<h4>Recent runs</h4><div className="runs">{s.runs.slice(0,7).map(r=><div key={r.id}><span className={`run-dot ${r.status}`}/><div><b>{r.title}</b><small>{r.steps.length} steps · {r.status}</small></div></div>)}</div><h4>Quality gates</h4><ul className="checks"><li><ShieldCheck/> secrets isolated</li><li><PanelLeft/> responsive shell</li><li><Sparkles/> design audit ready</li><li><Brain/> memory capture on runs</li></ul></aside>
    </div>
  </div>
}

function PanelTitle({icon:Icon,title,subtitle}:{icon:any,title:string,subtitle:string}){return <div className="panel-title"><Icon size={15}/><div><b>{title}</b><span>{subtitle}</span></div></div>}
function EmptyAgent({setPrompt}:{setPrompt:(v:string)=>void}){const ideas=['Crie uma calculadora premium','Crie um CRM com pipeline funcional','Crie um dashboard executivo','Crie um timer Pomodoro premium'];return <div className="empty-agent"><div className="empty-logo"><WandSparkles size={22}/></div><h3>Build with DeepThink,<br/>sem API e sem Ollama.</h3><p>O modo padrão classifica o pedido, escolhe um blueprint funcional, conecta estado e ações e gera arquivos editáveis.</p><div className="suggestions">{ideas.map(x=><button key={x} onClick={()=>setPrompt(x)}>{x}</button>)}</div></div>}
function PromptBox({value,setValue,run,disabled,files}:{value:string,setValue:(v:string)=>void,run:()=>void,disabled:boolean,files:any[]}){
  const [open,setOpen]=useState(false);
  const apply=(preset:PromptPreset)=>{setValue(enhanceBuildPrompt(value,preset,files));setOpen(false)};
  const quick=promptPresets.filter(p=>['enhance','fullstack','setup-repo','test-ship','security'].includes(p.id));
  return <div className="prompt-area">
    {open&&<div className="prompt-enhancer"><div className="enhancer-head"><div><Sparkles size={13}/><b>Aprimorar prompt</b></div><span>Transforma uma frase em instrução de agente multi-etapas</span></div><div className="enhancer-grid">{promptPresets.map(p=><button key={p.id} onClick={()=>apply(p.id)}><b>{p.label}</b><span>{p.hint}</span></button>)}</div></div>}
    <div className="prompt-quick">{quick.map(p=><button key={p.id} onClick={()=>apply(p.id)} title={p.hint}>{p.label}</button>)}</div>
    <div className="prompt-box"><textarea value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run()}}} placeholder="Descreva o app ou continue de onde parou…"/><div><button className="enhance-trigger" onClick={()=>setOpen(v=>!v)}><Sparkles size={13}/> Mais opções</button><span>preserva contexto + spec + quality gates</span><button onClick={run} disabled={disabled||!value.trim()}><Send size={14}/></button></div></div>
  </div>
}
function InfoCard({icon:Icon,title,text}:{icon:any,title:string,text:string}){return <div className="info-card"><Icon size={17}/><div><b>{title}</b><p>{text}</p></div></div>}
function Stat({icon:Icon,label,value}:{icon:any,label:string,value:string}){return <div><Icon size={14}/><span>{label}</span><b>{value}</b></div>}
