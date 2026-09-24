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
import { answerLocally, generateNeuralBuildPatch, neuralStatus } from '@/lib/browser-brain';
import { runExecutableCouncilX10 } from '@/lib/council-runtime';
import { runLocalSmokeTest } from '@/lib/local-tools';
import { runLocalCouncil } from '@/lib/council';
import { formatBuildReview, runBuildDiffReview } from '@/lib/build-diff-review';
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

  async function run(){
    const task=prompt.trim(); if(!task||busy)return;
    setPrompt('');setBusy(true);setPreviewError('');
    s.addMessage({role:'user',content:task});
    const turn=resolveBuildTurn(task,files,s.messages);
    try{
      if(turn.kind==='conversation'){
        const reply=await answerLocally(task,s.messages.slice(-10).map(m=>({role:m.role,content:m.content})),{knowledge:true});
        s.addMessage({role:'assistant',content:reply.content});
        return;
      }
      const result=orchestrateBuild(turn.effectivePrompt,files,s.deepThinkLevel);
      let finalFiles=repairWorkspaceFiles(result.files);
      const finalPhases=[...result.phases];
      const finalPlan=[...result.plan];
      let refinement='';

      const local=neuralStatus();
      if(local.loaded&&s.deepThinkLevel!=='fast'){
        finalPhases.push({id:'neural-refine',label:'Refinamento local',status:'warn',detail:'Reviewing the generated architecture against the current project.'});
        const patch=await generateNeuralBuildPatch(turn.effectivePrompt,finalFiles);
        if(patch?.files?.length){
          const map=new Map(finalFiles.map(file=>[file.path,file]));
          for(const file of patch.files)map.set(file.path,file);
          finalFiles=repairWorkspaceFiles(Array.from(map.values()));
          const phase=finalPhases.find(x=>x.id==='neural-refine');
          if(phase){phase.status='done';phase.detail=patch.files.length+' focused file patch(es) applied without resetting the project.'}
          finalPlan.push('DONE · Local refinement — '+patch.files.map(x=>x.path).join(', '));
          refinement=' '+patch.explanation;
        }else{
          const phase=finalPhases.find(x=>x.id==='neural-refine');
          if(phase){phase.status='skip';phase.detail='No valid structured patch was produced; deterministic production scaffold was preserved.'}
        }
      }

      let finalSmoke=runLocalSmokeTest(finalFiles);
      let finalCouncil=runLocalCouncil(finalFiles);
      let finalReview=runBuildDiffReview(files,finalFiles);
      const reviewPhase:BuildPhase={
        id:'diff-review',
        label:'Revisão dos arquivos alterados',
        status:finalReview.ok?'done':'warn',
        detail:finalReview.score+'/100 review · '+finalReview.changedPaths.length+' changed · '+finalReview.findings.length+' finding(s)'
      };
      finalPhases.push(reviewPhase);
      const verifyPhase:BuildPhase={
        id:'final-verify',
        label:'Verificação final',
        status:finalSmoke.ok&&finalCouncil.score>=75&&finalReview.ok?'done':'warn',
        detail:finalSmoke.score+'/100 smoke · '+finalCouncil.score+'/100 Council · '+finalReview.score+'/100 review'
      };
      finalPhases.push(verifyPhase);

      if(s.deepThinkLevel==='max'&&local.loaded&&(!finalSmoke.ok||finalCouncil.score<75||!finalReview.ok)){
        const smokeFailures=finalSmoke.checks.filter(x=>!x.ok).map(x=>x.name+': '+x.detail).join('; ');
        const reviewFindings=formatBuildReview(finalReview);
        const repairTask=[
          'Repair the current project after final verification.',
          'Original task: '+turn.effectivePrompt,
          'Smoke failures: '+(smokeFailures||'none'),
          'Council findings: '+finalCouncil.consensus.join(' '),
          'Changed-file review: '+reviewFindings,
          'Fix blocker/high review findings first, then medium findings that affect real behavior.',
          'Apply only focused code changes that fix real behavior. Do not replace the project or add decorative docs instead of fixes.'
        ].join('\n');
        const repair=await generateNeuralBuildPatch(repairTask,finalFiles);
        if(repair?.files?.length){
          const map=new Map(finalFiles.map(file=>[file.path,file]));
          for(const file of repair.files)map.set(file.path,file);
          finalFiles=repairWorkspaceFiles(Array.from(map.values()));
          finalSmoke=runLocalSmokeTest(finalFiles);
          finalCouncil=runLocalCouncil(finalFiles);
          finalReview=runBuildDiffReview(files,finalFiles);
          reviewPhase.status=finalReview.ok?'done':'warn';
          reviewPhase.detail=finalReview.score+'/100 review · '+finalReview.changedPaths.length+' changed · '+finalReview.findings.length+' finding(s)';
          verifyPhase.status=finalSmoke.ok&&finalCouncil.score>=75&&finalReview.ok?'done':'warn';
          verifyPhase.detail='Repair applied to '+repair.files.length+' file(s) · '+finalSmoke.score+'/100 smoke · '+finalCouncil.score+'/100 Council · '+finalReview.score+'/100 review';
          finalPlan.push('DONE · Verification repair — '+repair.files.map(x=>x.path).join(', '));
        }else{
          verifyPhase.detail+=' · repair pass produced no safe structured patch';
          finalPlan.push('CHECK · Final verification — repair pass produced no safe patch');
        }
      }else{
        if(finalReview.findings.length){
          finalPlan.push((finalReview.blocking?'BLOCK':'CHECK')+' · Changed-file review — '+finalReview.findings.slice(0,4).map(x=>x.severity.toUpperCase()+' '+x.path+': '+x.title).join(' · '));
        }else{
          finalPlan.push('DONE · Changed-file review — no deterministic findings');
        }
        finalPlan.push((verifyPhase.status==='done'?'DONE':'CHECK')+' · Final verification — '+verifyPhase.detail);
      }

      const wantsCouncil=s.deepThinkLevel==='max'||/council\s*x?10|war\s*room|pressure.?test|red.?team/i.test(task);
      if(wantsCouncil){
        finalPhases.push({id:'council-x10-runtime',label:'Council X10 executável',status:'warn',detail:'Running independent review lenses and Chair.'});
        const council=await runExecutableCouncilX10(task,finalFiles);
        const phase=finalPhases.find(x=>x.id==='council-x10-runtime');
        if(council.executed){
          const report={path:'COUNCIL_X10.md',language:'markdown',content:council.markdown};
          const map=new Map(finalFiles.map(file=>[file.path,file]));
          map.set(report.path,report);
          finalFiles=Array.from(map.values());
          if(phase){phase.status='done';phase.detail='10 review lenses + Chair completed; report saved to COUNCIL_X10.md.'}
          finalPlan.push('DONE · Council X10 — executable review saved to COUNCIL_X10.md');
        }else{
          if(phase){phase.status='skip';phase.detail=council.reason||'Executable Council unavailable; static quality gate remains active.'}
          finalPlan.push('SKIP · Council X10 executable — '+(council.reason||'local model unavailable'));
        }
      }

      if(finalFiles?.length)s.mergeFiles(repairWorkspaceFiles(finalFiles));
      setPhases(finalPhases);
      s.addMessage({role:'assistant',content:result.explanation+refinement+'\n\n'+finalPlan.join('\n')});
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
    zip.file('predictlm.json',JSON.stringify({project:s.projectName,engine:'PredictLM Unified + TwinCore X10',exportedAt:new Date().toISOString()},null,2));
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
