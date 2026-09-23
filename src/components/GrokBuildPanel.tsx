'use client';

import React,{useMemo,useState} from 'react';
import JSZip from 'jszip';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { ChevronDown, Code2, Download, Eye, FileCode2, Play, Plus, Send, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { useStudio } from '@/lib/store';
import { resolveBuildTurn } from '@/lib/build-turn';
import { orchestrateBuild, type BuildPhase } from '@/lib/build-orchestrator';
import { buildPreview } from '@/lib/preview';
import { buildRunnableProject } from '@/lib/project-packager';
import { promptPresets, enhanceBuildPrompt, type PromptPreset } from '@/lib/prompt-enhancer';
import { answerLocally } from '@/lib/browser-brain';

export function GrokBuildPanel(){
  const s=useStudio();
  const files=Object.values(s.files);
  const active=s.files[s.activeFile];
  const preview=useMemo(()=>buildPreview(files),[files]);
  const [prompt,setPrompt]=useState('');
  const [phases,setPhases]=useState<BuildPhase[]>([]);
  const [view,setView]=useState<'preview'|'code'>('preview');
  const [busy,setBusy]=useState(false);
  const [buildMenu,setBuildMenu]=useState(false);

  async function run(){
    const task=prompt.trim(); if(!task||busy)return;
    setPrompt('');setBusy(true);
    s.addMessage({role:'user',content:task});
    const turn=resolveBuildTurn(task,files,s.messages);
    try{
      if(turn.kind==='conversation'){
        const reply=await answerLocally(task,s.messages.slice(-10).map(m=>({role:m.role,content:m.content})),{knowledge:true});
        s.addMessage({role:'assistant',content:reply.content});
        return;
      }
      const result=orchestrateBuild(turn.effectivePrompt,files,s.deepThinkLevel);
      if(result.files?.length)s.mergeFiles(result.files);
      setPhases(result.phases);
      s.addMessage({role:'assistant',content:result.explanation+'\n\n'+result.plan.join('\n')});
      s.addRun({title:task,status:'done',steps:result.plan});
    }catch(e:any){
      s.addMessage({role:'assistant',content:'Erro no Build: '+(e?.message||'falha desconhecida')});
    }finally{setBusy(false)}
  }

  async function exportZip(){
    const pkg=buildRunnableProject(Object.values(s.files));
    const zip=new JSZip();
    pkg.forEach(f=>zip.file(f.path,f.content));
    zip.file('predictlm.json',JSON.stringify({project:s.projectName,engine:'LEXIS TwinCore X10 v3.0',exportedAt:new Date().toISOString()},null,2));
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=(s.projectName.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'predict-app')+'.zip';
    a.click();URL.revokeObjectURL(a.href);
  }

  const apply=(id:PromptPreset)=>setPrompt(enhanceBuildPrompt(prompt,id,files));

  return <section className="gtool build-tool">
    <header className="gtool-head">
      <div className="gbuild-title">
        <span>Build Mode</span>
        <div className="gbuild-title-row">
          <h1>{s.projectName}</h1>
          <div className="gbuild-switcher">
            <button className="gbuild-switcher-trigger" onClick={()=>setBuildMenu(v=>!v)} title="Trocar build">
              {s.builds.length} build{s.builds.length===1?'':'s'} <ChevronDown size={13}/>
            </button>
            {buildMenu&&<div className="gbuild-switcher-menu">
              <div className="gbuild-switcher-head"><b>Suas builds</b><button onClick={()=>{s.newBuild();setBuildMenu(false)}}><Plus size={12}/>Nova</button></div>
              {s.builds.map(build=><div className={'gbuild-switcher-item '+(build.id===s.activeBuildId?'active':'')} key={build.id}>
                <button className="gbuild-open" onClick={()=>{s.switchBuild(build.id);setBuildMenu(false)}}>
                  <b>{build.name}</b><small>{Object.keys(build.files).length} arquivos · {build.messages.length} mensagens</small>
                </button>
                <button className="gbuild-delete" title="Apagar build" onClick={()=>{
                  if(window.confirm('Apagar a build “'+build.name+'”? Esta ação remove o projeto salvo deste navegador.'))s.deleteBuild(build.id);
                }}><Trash2 size={12}/></button>
              </div>)}
            </div>}
          </div>
        </div>
        <p>Continuidade real · TwinCore X10 · runnable export</p>
      </div>
      <div className="gtool-head-actions">
        <button onClick={()=>s.newBuild()}><Plus size={14}/>Nova build</button>
        <button className={view==='preview'?'active':''} onClick={()=>setView('preview')}><Eye size={14}/>Preview</button>
        <button className={view==='code'?'active':''} onClick={()=>setView('code')}><Code2 size={14}/>Code</button>
        <button onClick={exportZip}><Download size={14}/>Export ZIP</button>
      </div>
    </header>

    <div className="gbuild-grid">
      <aside className="gbuild-agent">
        <div className="twincore-badge"><Sparkles size={13}/><div><b>LEXIS TwinCore X10</b><span>FORGE + AEGIS · Council 10</span></div></div>
        <div className="gbuild-thread">
          {s.messages.slice(-8).map(m=><article className={m.role} key={m.id}><b>{m.role==='user'?'YOU':'AI'}</b><p>{m.content}</p></article>)}
          {busy&&<div className="gbuild-running"><i/><i/><i/> executando sobre o projeto atual</div>}
        </div>
        {phases.length>0&&<div className="gbuild-phases">{phases.map(p=><div key={p.id} className={p.status}><span>{p.status==='done'?'✓':p.status==='skip'?'–':'!'}</span><div><b>{p.label}</b><small>{p.detail}</small></div></div>)}</div>}
        <div className="gbuild-presets">{promptPresets.filter(x=>['enhance','fullstack','setup-repo','test-ship','security'].includes(x.id)).map(x=><button key={x.id} onClick={()=>apply(x.id)}><WandSparkles size={11}/>{x.label}</button>)}</div>
        <div className="gbuild-composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run()}}} placeholder="Continue o projeto, corrija algo, adicione backend, teste, exporte…"/><button onClick={run} disabled={busy||!prompt.trim()}>{busy?<Play size={15}/>:<Send size={15}/>}</button></div>
      </aside>

      <main className="gbuild-workspace">
        <div className="gbuild-files">{files.map(f=><button key={f.path} className={s.activeFile===f.path?'active':''} onClick={()=>s.setActiveFile(f.path)}><FileCode2 size={12}/>{f.path}</button>)}</div>
        {view==='preview'
          ?<iframe title="PredictLM Preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={preview}/>
          :<div className="gbuild-code">{active?<CodeMirror value={active.content} theme={oneDark} height="100%" extensions={[active.language==='css'?css():javascript({jsx:true,typescript:true})]} onChange={v=>s.updateFile(active.path,v)}/>:<div className="gbuild-empty">Selecione um arquivo.</div>}</div>}
      </main>
    </div>
  </section>
}
