'use client';

import React, { useState } from 'react';
import { useStudio } from '@/lib/store';
import { createEnvExample, createImagePrompts, createIntegrationManifest, createLaunchScript, createStoryboard, runLocalSmokeTest } from '@/lib/local-tools';

export function BrowserToolsPanel({inspectMode,setInspectMode,onRefresh}:{inspectMode:boolean;setInspectMode:(v:boolean)=>void;onRefresh:()=>void}){
  const files=Object.values(useStudio(s=>s.files));
  const addNote=useStudio(s=>s.addNote);
  const [report,setReport]=useState<ReturnType<typeof runLocalSmokeTest>|null>(null);

  function smoke(){
    const next=runLocalSmokeTest(files);
    setReport(next);
    addNote({title:'Smoke test · '+next.score+'/100',body:next.checks.map(x=>(x.ok?'PASS':'FAIL')+' · '+x.name+' — '+x.detail).join('\n'),tags:['smoke-test','browser','local'],kind:'run'});
  }

  function capture(){
    addNote({title:'Preview snapshot',body:'Captured locally with '+files.length+' workspace file(s). Inspect mode: '+(inspectMode?'on':'off')+'.',tags:['preview','snapshot'],kind:'note'});
  }

  return <div className="panel-scroll action-panel">
    <div className="action-card"><div><b>Visual Inspect</b><span>Selecione elementos reais no preview e envie o contexto de volta ao Studio.</span></div><button className={inspectMode?'active':''} onClick={()=>setInspectMode(!inspectMode)}>{inspectMode?'Desativar':'Ativar'}</button></div>
    <div className="action-card"><div><b>Smoke Test</b><span>Valida entrypoint, estilos, handlers, responsividade e ausência do CTA antigo sem ação.</span></div><button onClick={smoke}>Executar</button></div>
    <div className="action-card"><div><b>Refresh Preview</b><span>Recarrega o iframe sandbox com os arquivos atuais.</span></div><button onClick={onRefresh}>Atualizar</button></div>
    <div className="action-card"><div><b>Capture Snapshot</b><span>Registra o estado atual do preview no Segundo Cérebro.</span></div><button onClick={capture}>Capturar</button></div>
    {report&&<div className="tool-report"><header><b>{report.score}/100</b><span>{report.ok?'Tudo passou':'Atenção necessária'}</span></header>{report.checks.map(x=><div key={x.name} className={x.ok?'pass':'fail'}><b>{x.ok?'✓':'×'} {x.name}</b><span>{x.detail}</span></div>)}</div>}
  </div>
}

export function MediaToolsPanel(){
  const projectName=useStudio(s=>s.projectName);
  const addFile=useStudio(s=>s.addFile);
  const addNote=useStudio(s=>s.addNote);
  const [last,setLast]=useState('');

  function create(path:string,body:string,label:string){
    addFile(path,body,'markdown');
    addNote({title:label,body:'Gerado localmente em '+path+'.',tags:['media','local'],kind:'run'});
    setLast(path);
  }

  return <div className="panel-scroll action-panel">
    <p className="panel-copy">Sem API, esta aba gera os artefatos de pré-produção que normalmente seriam enviados ao HeyGen/DaVinci/geradores de imagem.</p>
    <div className="action-card"><div><b>Storyboard 25s</b><span>6 cenas, hook, prova funcional e fechamento.</span></div><button onClick={()=>create('media/storyboard.md',createStoryboard(projectName),'Storyboard criado')}>Gerar</button></div>
    <div className="action-card"><div><b>Launch Script</b><span>Roteiro curto para vídeo promocional do app.</span></div><button onClick={()=>create('media/launch-script.md',createLaunchScript(projectName),'Launch script criado')}>Gerar</button></div>
    <div className="action-card"><div><b>Image Prompt Pack</b><span>Prompts para hero, social launch e feature card.</span></div><button onClick={()=>create('media/image-prompts.md',createImagePrompts(projectName),'Image prompts criados')}>Gerar</button></div>
    {last&&<div className="success-banner">Criado: <b>{last}</b>. O arquivo foi aberto no editor.</div>}
  </div>
}

export function ConnectorsToolsPanel(){
  const addFile=useStudio(s=>s.addFile);
  const cloneProject=useStudio(s=>s.cloneProject);
  const [health,setHealth]=useState<any>(null);
  const [error,setError]=useState('');

  async function check(){
    setError('');
    try{
      const r=await fetch('/api/health');
      const data=await r.json();
      if(!r.ok)throw new Error('Health check failed');
      setHealth(data);
    }catch(e:any){setError(e.message)}
  }

  return <div className="panel-scroll action-panel">
    <p className="panel-copy">Os recursos essenciais são locais. Conectores externos são upgrades opcionais, não pré-requisitos.</p>
    <div className="action-card"><div><b>Capability Check</b><span>Mostra o que está ativo sem revelar chaves ou segredos.</span></div><button onClick={check}>Verificar</button></div>
    <div className="action-card"><div><b>Integration Manifest</b><span>Cria um mapa JSON de recursos locais, opcionais e bridges nativos.</span></div><button onClick={()=>addFile('predict.integrations.json',createIntegrationManifest(),'json')}>Criar</button></div>
    <div className="action-card"><div><b>.env.example</b><span>Gera somente placeholders opcionais; o app continua funcionando sem eles.</span></div><button onClick={()=>addFile('.env.example',createEnvExample(),'text')}>Criar</button></div>
    <div className="action-card"><div><b>Clone Project</b><span>Duplica o snapshot local do workspace, inspirado em workflows de clone de projetos.</span></div><button onClick={cloneProject}>Clonar</button></div>
    {error&&<div className="research-error">{error}</div>}
    {health&&<div className="health-grid">
      <div><b>DeepThink</b><span>{health.zeroApi?.deepThink?'ativo':'indisponível'}</span></div>
      <div><b>Research grátis</b><span>{health.zeroApi?.freeResearch?'ativo':'indisponível'}</span></div>
      <div><b>Firecrawl</b><span>{health.optional?.firecrawl?'configurado':'opcional'}</span></div>
      <div><b>Cloud AI</b><span>{health.optional?.serverAI?'configurado':'opcional'}</span></div>
    </div>}
  </div>
}

export function SettingsToolsPanel(){
  const level=useStudio(s=>s.deepThinkLevel);
  const setLevel=useStudio(s=>s.setDeepThinkLevel);
  const autoFallback=useStudio(s=>s.autoFallback);
  const setAutoFallback=useStudio(s=>s.setAutoFallback);
  const clearProject=useStudio(s=>s.clearProject);
  const localEndpoint=useStudio(s=>s.localEndpoint);
  const localModel=useStudio(s=>s.localModel);
  const setLocalEndpoint=useStudio(s=>s.setLocalEndpoint);
  const setLocalModel=useStudio(s=>s.setLocalModel);

  return <div className="panel-scroll settings-tools">
    <div className="setting-block"><span className="setting-label">DeepThink depth</span><div className="depth-switch">{(['fast','deep','max'] as const).map(x=><button key={x} className={level===x?'active':''} onClick={()=>setLevel(x)}>{x}</button>)}</div><p>Fast gera menos etapas; Deep é o padrão; Max executa a análise determinística mais completa.</p></div>
    <div className="setting-block row-setting"><div><b>Fallback automático</b><p>Se Puter ou Cloud falharem, o pedido volta para Predict DeepThink em vez de mostrar erro.</p></div><button className={'toggle '+(autoFallback?'on':'')} onClick={()=>setAutoFallback(!autoFallback)}><i/></button></div>
    <div className="setting-block"><b>Zero API first</b><p>Build, Plan, Review, Research Lite, Council, Graph, Inspect, import/export e ferramentas de mídia local não exigem Ollama nem chave.</p></div>
    <details className="advanced-settings"><summary>Providers locais avançados (opcional)</summary><label><span>Endpoint</span><input value={localEndpoint} onChange={e=>setLocalEndpoint(e.target.value)}/></label><label><span>Modelo</span><input value={localModel} onChange={e=>setLocalModel(e.target.value)}/></label><p>Você pode ignorar completamente esta seção.</p></details>
    <button className="danger-action" onClick={()=>{if(confirm('Resetar o workspace local?'))clearProject()}}>Resetar projeto local</button>
  </div>
}
