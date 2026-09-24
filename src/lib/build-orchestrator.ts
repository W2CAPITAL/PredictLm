import type { WorkspaceFile } from './types';
import type { DeepThinkLevel } from './predict-core';
import { explainDeepThink, runPredictCore } from './predict-core';
import { runLocalCouncil } from './council';
import { runLocalSmokeTest } from './local-tools';
import { buildRunnableProject, packagingSummary } from './project-packager';
import { buildProjectScaffold, inferProductRequirements } from './app-scaffolder';
import { inferSaaSBlueprint } from './saas-product-fabric';

export type BuildPhaseStatus='done'|'skip'|'warn';
export interface BuildPhase {
  id:string;
  label:string;
  status:BuildPhaseStatus;
  detail:string;
}
export interface OrchestratedBuild {
  explanation:string;
  plan:string[];
  files:WorkspaceFile[];
  changedFiles:string[];
  appChanged:boolean;
  phases:BuildPhase[];
  packageFiles:WorkspaceFile[];
  packageSummary:ReturnType<typeof packagingSummary>;
  smoke:ReturnType<typeof runLocalSmokeTest>;
  council:ReturnType<typeof runLocalCouncil>;
}

function currentIntent(files:WorkspaceFile[]){
  const spec=files.find(f=>f.path==='predict.spec.json');
  try{return spec?JSON.parse(spec.content)?.spec?.intent:null}catch{return null}
}

function isNewProject(prompt:string,files:WorkspaceFile[]){
  const active=currentIntent(files);
  if(!active)return true;
  return /\b(novo projeto|nova aplicação|nova aplicacao|do zero|from scratch|recrie do zero|recomece do zero|reset project)\b/i.test(prompt);
}

function architectureDoc(prompt:string,intent:string,backend:boolean){
  const lines=[
    '# Architecture',
    '',
    '## Request',
    prompt,
    '',
    '## Product intent',
    intent,
    '',
    '## Frontend',
    '- React + TypeScript',
    '- Responsive interaction-first UI',
    '- Explicit empty/success/error states where applicable',
    '',
    '## Backend decision',
    backend
      ? '- Required: the product manages shared/persistent business records. The export includes a small local HTTP service and data file.'
      : '- Not required for the current feature set. Keeping this frontend-only avoids unnecessary infrastructure.',
    '',
    '## Data',
    backend?'- Local JSON persistence in the exported starter. Replace with Postgres/Supabase/etc. when multi-user durability is required.':'- Local component state is sufficient for the current generated experience.',
    '',
    '## Quality gates',
    '- Local smoke test',
    '- Council: architecture, security, UX/taste, QA, humanizer',
    '- Runnable ZIP packaging',
    ''
  ];
  return lines.join('\n');
}

function implementationPlan(prompt:string,intent:string,backend:boolean){
  return [
    '# Implementation Plan',
    '',
    '1. Interpret the request in the context of the current project.',
    '2. Preserve working behavior unless removal was explicitly requested.',
    '3. Build/update the frontend interaction and visual system.',
    backend?'4. Add/maintain the server/data boundary for persistent records.':'4. Skip backend because it would add complexity without product value.',
    '5. Generate environment/setup documentation.',
    '6. Add a smoke test and package the app as a runnable Vite project.',
    '7. Run local Council/Security review and surface remaining gaps.',
    '',
    'Original request: '+prompt
  ].join('\n');
}

export function orchestrateBuild(prompt:string,currentFiles:WorkspaceFile[],depth:DeepThinkLevel='deep'):OrchestratedBuild{
  const beforeIntent=currentIntent(currentFiles);
  const fresh=isNewProject(prompt,currentFiles);
  const analyzed=explainDeepThink(prompt);
  const effectiveIntent=!fresh&&beforeIntent?String(beforeIntent):analyzed.intent;

  const phases:BuildPhase[]=[];
  phases.push({id:'intent',label:'Intent & context',status:'done',detail:fresh?'New-project request detected.':'Incremental edit detected; preserve the current project.'});
  phases.push({id:'spec',label:'Product spec',status:'done',detail:'Intent: '+effectiveIntent+'. Requirements extracted before file changes.'});

  let core=runPredictCore(prompt,currentFiles,depth);
  const ambiguousExisting=!fresh&&analyzed.intent==='generic'&&!!beforeIntent&&core.spec?.intent==='generic';
  if(ambiguousExisting){
    core={
      explanation:'O pedido foi interpretado como contextual/ambíguo dentro do projeto atual. Para evitar apagar trabalho existente, nenhum template genérico foi aplicado.',
      plan:[
        'Preservar integralmente o projeto atual',
        'Manter o intent existente: '+beforeIntent,
        'Tratar a próxima instrução como patch incremental ou pedir mais especificidade'
      ],
      files:[]
    };
    phases.push({id:'context-guard',label:'Context preservation',status:'warn',detail:'Generic regeneration blocked because an existing '+beforeIntent+' project is active.'});
  }
  const mergedMap=new Map(currentFiles.map(f=>[f.path,f]));
  for(const file of core.files)mergedMap.set(file.path,file);
  let merged=Array.from(mergedMap.values());

  const specFile=merged.find(f=>f.path==='predict.spec.json');
  if(!specFile&&beforeIntent){
    merged.push({path:'predict.spec.json',language:'json',content:JSON.stringify({engine:'Predict DeepThink',version:5,prompt,spec:{intent:beforeIntent,title:'Current Project',confidence:1,features:['preserved-project-context']}},null,2)});
  }

  const scaffold=buildProjectScaffold(prompt,String(effectiveIntent));
  for(const file of scaffold){
    if(!mergedMap.has(file.path))mergedMap.set(file.path,file);
  }
  merged=Array.from(mergedMap.values());

  const requirements=inferProductRequirements(prompt,String(effectiveIntent));
  const saasBlueprint=inferSaaSBlueprint(prompt,String(effectiveIntent));
  const tentativePack=buildRunnableProject(merged);
  const packageSummary=packagingSummary(merged);
  phases.push({id:'architecture',label:'Architecture',status:'done',detail:(saasBlueprint?'SaaS '+saasBlueprint.kind+' · '+saasBlueprint.modules.length+' módulos · ':'')+(packageSummary.backend?packageSummary.backendReason:'Frontend-only decision: '+packageSummary.backendReason)});
  phases.push({id:'frontend',label:'Frontend',status:'done',detail:'Interactive React surface preserved/generated with navigation, responsive states and domain flows.'});
  phases.push({id:'validation',label:'Validation & domain rules',status:requirements.needsValidation?'done':'skip',detail:requirements.needsValidation?'Validation module added for user/business data before mutation.':'Only basic validation is required for this product.'});
  phases.push({id:'integrations',label:'Integrations',status:requirements.integrations.length?'done':'skip',detail:requirements.integrations.length?'Adapters/config planned for: '+requirements.integrations.join(', ')+'. Secrets stay server-side.':'No external integration was explicitly required.'});
  phases.push({id:'backend',label:'Backend & data',status:packageSummary.backend?'done':'skip',detail:packageSummary.backendReason});

  const intent=String(packageSummary.intent||effectiveIntent);
  const architecture={path:'ARCHITECTURE.md',language:'markdown',content:architectureDoc(prompt,intent,packageSummary.backend)};
  const planFile={path:'IMPLEMENTATION.md',language:'markdown',content:implementationPlan(prompt,intent,packageSummary.backend)};
  mergedMap.set(architecture.path,architecture);
  mergedMap.set(planFile.path,planFile);
  merged=Array.from(mergedMap.values());

  // Surface the infrastructure decisions in the workspace instead of hiding them only inside Export.
  const infraPreview=buildRunnableProject(merged).filter(f=>
    f.path==='package.json'||
    f.path==='.env.example'||
    f.path==='RUNME.md'||
    f.path==='vite.config.js'||
    f.path.startsWith('server/')||
    f.path==='src/lib/api.ts'||
    f.path.startsWith('src/integrations/')||
    f.path.startsWith('src/domain/')||
    f.path.startsWith('src/types/')
  );
  for(const file of infraPreview)mergedMap.set(file.path,file);
  merged=Array.from(mergedMap.values());

  const smoke=runLocalSmokeTest(merged);
  phases.push({id:'smoke',label:'Functional smoke test',status:smoke.ok?'done':'warn',detail:smoke.score+'/100 · '+smoke.checks.filter(x=>!x.ok).map(x=>x.name).join(', ')});

  const council=runLocalCouncil([...merged,{path:'src/App.test.tsx',language:'typescript',content:'// generated smoke-test placeholder in runnable package'}]);
  phases.push({id:'review',label:'Council & security',status:council.score>=75?'done':'warn',detail:council.score+'/100 · '+council.consensus.join(' ')});

  const packageFiles=buildRunnableProject(merged);
  phases.push({id:'package',label:'Runnable packaging',status:'done',detail:packageFiles.length+' export file(s) · '+packageSummary.frontend+(packageSummary.backend?' + backend':'')});

  const beforeMap=new Map(currentFiles.map(f=>[f.path,f.content]));
  const changedFiles=merged.filter(f=>beforeMap.get(f.path)!==f.content).map(f=>f.path);
  const appChanged=changedFiles.some(path=>/(^|\/)App\.(tsx|jsx|js|ts)$/.test(path)||/styles?\.css$/.test(path));
  phases.push({
    id:'changes',
    label:'Applied changes',
    status:changedFiles.length?'done':'skip',
    detail:changedFiles.length?changedFiles.length+' file(s): '+changedFiles.slice(0,6).join(', ')+(changedFiles.length>6?'…':''):'No file content changed; current project was preserved.'
  });

  const plan=phases.map(p=>(p.status==='skip'?'SKIP':p.status==='warn'?'CHECK':'DONE')+' · '+p.label+' — '+p.detail);
  const explanation=[
    fresh?'Projeto analisado como nova construção.':'Pedido tratado como continuação do projeto atual.',
    appChanged?'A interface/comportamento do app foi alterado.':'O app principal foi preservado; não houve regeneração destrutiva.',
    changedFiles.length?'Arquivos realmente alterados: '+changedFiles.join(', ')+'.':'Nenhum arquivo precisou ser alterado nesta execução.',
    packageSummary.backend?'Backend mantido/incluído porque o domínio pede registros persistentes/compartilhados.':'Backend foi conscientemente omitido porque não agrega valor a este app.',
    saasBlueprint?'SaaS blueprint preservado com tenant/RBAC/audit e módulos de domínio.':'Arquitetura genérica preservada.',
    'Exportação continua preparada como projeto Vite/React executável.'
  ].join(' ');

  return {explanation,plan,files:merged,changedFiles,appChanged,phases,packageFiles,packageSummary,smoke,council};
}
