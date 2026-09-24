'use client';

import React,{useEffect,useMemo,useState} from 'react';
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
import { runLocalSmokeTest } from '@/lib/local-tools';
import { runLocalCouncil } from '@/lib/council';
import { runBuildDiffReview } from '@/lib/build-diff-review';
import { repairWorkspaceFiles } from '@/lib/workspace-repair';

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
  const [previewError,setPreviewError]=useState('');

  useEffect(()=>{
    const onMessage=(event:MessageEvent)=>{
      if(event.data?.type==='predictlm:preview-error')setPreviewError(String(event.data?.payload?.message||'Erro de preview'));
    };
    window.addEventListener('message',onMessage);
    return()=>window.removeEventListener('message',onMessage);
  },[]);

  async function callChatApi(task:string){
    const response=await fetch('/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        mode:'clean-chat',
        prompt:task,
        language:'pt-BR',
        messages:s.messages.slice(-8).map(m=>({role:m.role,content:m.content})),
        useHistory:true
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data?.content)throw new Error(data?.error||'A API de Chat não produziu uma resposta.');
    return String(data.content);
  }

  async function callBuildApi(task:string,currentFiles:any[],mode:string){
    const response=await fetch('/api/agent',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt:task,files:currentFiles,mode})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!Array.isArray(data?.files)||!data.files.length){
      throw new Error(data?.error||'A API de Build não produziu alterações estruturadas.');
    }
    return data;
  }

  async function run(){
    const task=prompt.trim(); if(!task||busy)return;
    setPrompt('');setBusy(true);setPreviewError('');
    s.addMessage({role:'user',content:task});
    const turn=resolveBuildTurn(task,files,s.messages);
    try{
      if(turn.kind==='conversation'){
        const reply=await callChatApi(task);
        s.addMessage({role:'assistant',content:reply});
        return;
      }

      setPhases([
        {id:'api-explore',label:'API · exploração do codebase',status:'warn',detail:'Mapeando arquivos, regras e padrões relevantes.'},
        {id:'api-architect',label:'API · arquitetura',status:'warn',detail:'Planejando alterações antes de escrever código.'},
        {id:'api-implement',label:'API · implementação + review',status:'warn',detail:'Agents/skills server-side estão gerando e revisando o patch.'}
      ]);

      let apiResult:any=null;
      let usedFallback=false;
      try{
        apiResult=await callBuildApi(turn.effectivePrompt,files,s.deepThinkLevel);
      }catch(apiError:any){
        usedFallback=true;
        const fallback=orchestrateBuild(turn.effectivePrompt,files,s.deepThinkLevel);
        apiResult={
          explanation:fallback.explanation+' API indisponível nesta execução: '+String(apiError?.message||apiError)+'.',
          plan:fallback.plan,
          files:fallback.files,
          fallbackPhases:fallback.phases
        };
      }

      const mergedMap=new Map(files.map(file=>[file.path,file]));
      for(const file of repairWorkspaceFiles(apiResult.files||[]))mergedMap.set(file.path,file);
      let finalFiles=repairWorkspaceFiles(Array.from(mergedMap.values()));
      const agentic=apiResult.agentic||{};
      const finalPhases:BuildPhase[]=usedFallback
        ? [
            {id:'api-unavailable',label:'API-first',status:'warn',detail:'Provider/API indisponível; scaffold determinístico usado como contingência.'},
            ...((apiResult.fallbackPhases||[]) as BuildPhase[])
          ]
        : [
            {id:'api-explore',label:'API · exploração do codebase',status:'done',detail:(agentic.providers?.explorers||[]).length+' explorer(s) · instruções de projeto e manifest analisados.'},
            {id:'api-architect',label:'API · arquitetura',status:'done',detail:'Plano gerado por '+String(agentic.providers?.architect||'provider')+'.'},
            {id:'api-implement',label:'API · implementação',status:'done',detail:'Código gerado por '+String(agentic.providers?.implementer||'provider')+'.'},
            {id:'api-review',label:'API · review independente',status:agentic.review?.approved===false?'warn':'done',detail:
              String(agentic.providers?.reviewer||'provider')+' · '+String(agentic.review?.issues?.length||0)+' finding(s)'+
              (agentic.providers?.repair?' · reparado por '+String(agentic.providers.repair):'')
            }
          ];
      const finalPlan=[...(Array.isArray(apiResult.plan)?apiResult.plan:[])];

      let finalSmoke=runLocalSmokeTest(finalFiles);
      let finalCouncil=runLocalCouncil(finalFiles);
      let finalReview=runBuildDiffReview(files,finalFiles);
      const reviewPhase:BuildPhase={
        id:'diff-review',
        label:'Validação determinística dos arquivos alterados',
        status:finalReview.ok?'done':'warn',
        detail:finalReview.score+'/100 review · '+finalReview.changedPaths.length+' changed · '+finalReview.findings.length+' finding(s)'
      };
      finalPhases.push(reviewPhase);
      const verifyPhase:BuildPhase={
        id:'final-verify',
        label:'Verificação final',
        status:finalSmoke.ok&&finalCouncil.score>=75&&finalReview.ok?'done':'warn',
        detail:finalSmoke.score+'/100 smoke · '+finalCouncil.score+'/100 static council · '+finalReview.score+'/100 review'
      };
      finalPhases.push(verifyPhase);

      const needsApiRepair=!usedFallback&&(
        finalReview.blocking||
        !finalSmoke.ok||
        finalCouncil.score<75||
        (agentic.review?.approved===false)
      );
      if(needsApiRepair&&s.deepThinkLevel!=='fast'){
        const repairTask=[
          'Repair the existing project after independent verification.',
          'Original request: '+turn.effectivePrompt,
          'Smoke failures: '+finalSmoke.checks.filter(x=>!x.ok).map(x=>x.name+': '+x.detail).join('; '),
          'Static review findings: '+finalReview.findings.slice(0,8).map(x=>x.severity.toUpperCase()+' '+x.path+': '+x.title).join('; '),
          'Static council: '+finalCouncil.consensus.join(' '),
          'Fix validated behavior problems only. Preserve working code and return focused file changes.'
        ].join('\n');
        try{
          finalPhases.push({id:'api-repair',label:'API · repair pass',status:'warn',detail:'Enviando falhas verificadas de volta aos agents/skills da API.'});
          const repair=await callBuildApi(repairTask,finalFiles,s.deepThinkLevel);
          const map=new Map(finalFiles.map(file=>[file.path,file]));
          for(const file of repairWorkspaceFiles(repair.files||[]))map.set(file.path,file);
          finalFiles=repairWorkspaceFiles(Array.from(map.values()));
          finalSmoke=runLocalSmokeTest(finalFiles);
          finalCouncil=runLocalCouncil(finalFiles);
          finalReview=runBuildDiffReview(files,finalFiles);
          const phase=finalPhases.find(x=>x.id==='api-repair');
          if(phase){phase.status='done';phase.detail='Repair produzido pela API e revalidado localmente.'}
          reviewPhase.status=finalReview.ok?'done':'warn';
          reviewPhase.detail=finalReview.score+'/100 review · '+finalReview.changedPaths.length+' changed · '+finalReview.findings.length+' finding(s)';
          verifyPhase.status=finalSmoke.ok&&finalCouncil.score>=75&&finalReview.ok?'done':'warn';
          verifyPhase.detail='Após API repair · '+finalSmoke.score+'/100 smoke · '+finalCouncil.score+'/100 static council · '+finalReview.score+'/100 review';
          finalPlan.push('DONE · API repair pass executado e revalidado.');
        }catch(repairError:any){
          const phase=finalPhases.find(x=>x.id==='api-repair');
          if(phase){phase.status='warn';phase.detail='Repair API indisponível: '+String(repairError?.message||repairError)}
          finalPlan.push('CHECK · API repair indisponível; alterações anteriores foram preservadas.');
        }
      }

      if(finalReview.findings.length){
        finalPlan.push((finalReview.blocking?'BLOCK':'CHECK')+' · Changed-file review — '+finalReview.findings.slice(0,4).map(x=>x.severity.toUpperCase()+' '+x.path+': '+x.title).join(' · '));
      }else{
        finalPlan.push('DONE · Changed-file review — no deterministic findings');
      }
      finalPlan.push((verifyPhase.status==='done'?'DONE':'CHECK')+' · Final verification — '+verifyPhase.detail);

      if(finalFiles.length)s.mergeFiles(finalFiles);
      setPhases(finalPhases);
      s.addMessage({
        role:'assistant',
        content:String(apiResult.explanation||'Build concluído.')+'\n\n'+finalPlan.join('\n')
      });
      s.addRun({title:task,status:'done',steps:finalPlan});
    }catch(e:any){
      const message='Erro no Build: '+(e?.message||'falha desconhecida');
      s.addMessage({role:'assistant',content:message});
      fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'error',surface:'build',message,metadata:{task,project:s.projectName}})}).catch(()=>{});
    }finally{setBusy(false)}
  }

  async function exportZip(){
    const pkg=buildRunnableProject(Object.values(s.files));
    const zip=new JSZip();
    pkg.forEach(f=>zip.file(f.path,f.content));
    zip.file('predictlm.json',JSON.stringify({project:s.projectName,engine:'PredictLM Master',exportedAt:new Date().toISOString()},null,2));
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
        <p>Continuidade real · PredictLM Master · runnable export</p>
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
        <div className="twincore-badge"><Sparkles size={13}/><div><b>PredictLM Master</b><span>Build · FORGE + AEGIS · Council X10</span></div></div>
        <div className="gbuild-thread">
          {s.messages.slice(-8).map(m=><article className={m.role} key={m.id}><b>{m.role==='user'?'VOCÊ':'IA'}</b><p>{m.content}</p></article>)}
          {busy&&<div className="gbuild-running"><i/><i/><i/> executando sobre o projeto atual</div>}
        </div>
        {phases.length>0&&<div className="gbuild-phases">{phases.map(p=><div key={p.id} className={p.status}><span>{p.status==='done'?'✓':p.status==='skip'?'–':'!'}</span><div><b>{p.label}</b><small>{p.detail}</small></div></div>)}</div>}
        <div className="gbuild-presets">{promptPresets.filter(x=>['enhance','fullstack','setup-repo','test-ship','security'].includes(x.id)).map(x=><button key={x.id} onClick={()=>apply(x.id)}><WandSparkles size={11}/>{x.label}</button>)}</div>
        <div className="gbuild-composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run()}}} placeholder="Continue o projeto, corrija algo, adicione backend, teste, exporte…"/><button onClick={run} disabled={busy||!prompt.trim()}>{busy?<Play size={15}/>:<Send size={15}/>}</button></div>
      </aside>

      <main className="gbuild-workspace">
        <div className="gbuild-files">{files.map(f=><button key={f.path} className={s.activeFile===f.path?'active':''} onClick={()=>s.setActiveFile(f.path)}><FileCode2 size={12}/>{f.path}</button>)}</div>
        {view==='preview'
          ?<><iframe title="PredictLM Preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={preview}/>{previewError&&<div style={{position:'absolute',left:16,right:16,bottom:16,zIndex:20,padding:'10px 12px',borderRadius:10,background:'#2a1117',border:'1px solid #6b2d3b',color:'#ffd6dd',fontSize:12}}><b>Preview com erro:</b> {previewError}</div>}</>
          :<div className="gbuild-code">{active?<CodeMirror value={active.content} theme={oneDark} height="100%" extensions={[active.language==='css'?css():javascript({jsx:true,typescript:true})]} onChange={v=>s.updateFile(active.path,v)}/>:<div className="gbuild-empty">Selecione um arquivo.</div>}</div>}
      </main>
    </div>
  </section>
}
