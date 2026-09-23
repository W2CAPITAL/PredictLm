import type { WorkspaceFile } from './types';
import type { DeepThinkLevel } from './predict-core';
import { explainDeepThink, runPredictCore } from './predict-core';
import { runLocalCouncil } from './council';
import { runLocalSmokeTest } from './local-tools';
import { buildRunnableProject, packagingSummary } from './project-packager';

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
  if(!files.some(f=>/App\.(tsx|jsx|ts|js)$/.test(f.path)))return true;
  const p=prompt.trim();
  if(/do zero|from scratch|novo projeto|new project/i.test(p))return true;
  if(/^(crie|criar|gere|gerar|construa)\s+(ela|ele|isso|isto|este|esta|esse|essa)\b/i.test(p))return false;
  if(/^(crie|criar|gere|gerar|construa)\b/i.test(p))return true;
  if(/^(faça|faca)\s+(um|uma|novo|nova)\s+(app|aplicativo|site|calculadora|crm|dashboard|loja|store|timer|conversor|portfolio|portfólio|sistema)\b/i.test(p))return true;
  return false;
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
  const effectiveIntent=!fresh&&analyzed.intent==='generic'&&beforeIntent?String(beforeIntent):analyzed.intent;

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

  const tentativePack=buildRunnableProject(merged);
  const packageSummary=packagingSummary(merged);
  phases.push({id:'architecture',label:'Architecture',status:'done',detail:packageSummary.backend?packageSummary.backendReason:'Frontend-only decision: '+packageSummary.backendReason});
  phases.push({id:'frontend',label:'Frontend',status:'done',detail:'Interactive React surface preserved/generated and prepared for Vite export.'});
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
    f.path==='src/lib/api.ts'
  );
  for(const file of infraPreview)mergedMap.set(file.path,file);
  merged=Array.from(mergedMap.values());

  const smoke=runLocalSmokeTest(merged);
  phases.push({id:'smoke',label:'Functional smoke test',status:smoke.ok?'done':'warn',detail:smoke.score+'/100 · '+smoke.checks.filter(x=>!x.ok).map(x=>x.name).join(', ')});

  const council=runLocalCouncil([...merged,{path:'src/App.test.tsx',language:'typescript',content:'// generated smoke-test placeholder in runnable package'}]);
  phases.push({id:'review',label:'Council & security',status:council.score>=75?'done':'warn',detail:council.score+'/100 · '+council.consensus.join(' ')});

  const packageFiles=buildRunnableProject(merged);
  phases.push({id:'package',label:'Runnable packaging',status:'done',detail:packageFiles.length+' export file(s) · '+packageSummary.frontend+(packageSummary.backend?' + backend':'')});

  const plan=phases.map(p=>(p.status==='skip'?'SKIP':p.status==='warn'?'CHECK':'DONE')+' · '+p.label+' — '+p.detail);
  const explanation=[
    fresh?'Projeto analisado como nova construção.':'Pedido tratado como edição incremental do projeto atual.',
    'Não apliquei uma resposta de uma passada: o fluxo avaliou produto, arquitetura, frontend, backend/dados, testes, review e empacotamento.',
    packageSummary.backend?'Backend incluído porque o domínio pede registros persistentes/compartilhados.':'Backend foi conscientemente omitido porque não agrega valor a este app.',
    'Exportação preparada como projeto Vite/React executável.'
  ].join(' ');

  return {explanation,plan,files:merged,phases,packageFiles,packageSummary,smoke,council};
}
