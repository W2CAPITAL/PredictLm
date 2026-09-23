import { runPredictCore } from '@/lib/predict-core';
import { runLocalSmokeTest } from '@/lib/local-tools';
import { buildRunnableProject, packagingSummary } from '@/lib/project-packager';
import { orchestrateBuild } from '@/lib/build-orchestrator';

export const runtime = 'nodejs';

export async function GET(){
  const calculator=orchestrateBuild('crie uma calculadora premium',[],'max');
  const calculatorSmoke=runLocalSmokeTest(calculator.files);
  const packaged=buildRunnableProject(calculator.files);
  const packageInfo=packagingSummary(calculator.files);
  const required=['package.json','index.html','src/main.jsx','src/App.jsx','src/styles.css','vite.config.js','RUNME.md'];
  const packageChecks=required.map(path=>({path,ok:packaged.some(f=>f.path===path)}));
  const crm=runPredictCore('faça um crm financeiro',[],'deep');
  const crmPackage=buildRunnableProject(crm.files);
  const crmBackend=crmPackage.some(f=>f.path==='server/index.mjs')&&crmPackage.some(f=>f.path==='server/data.json');
  const ok=calculatorSmoke.ok&&packageChecks.every(x=>x.ok)&&packageInfo.runnable&&crmBackend;

  return Response.json({
    ok,
    service:'predictlm-studio',
    version:5,
    surfaces:{chat:true,build:true},
    zeroApi:{
      deepThink:true,
      council:true,
      knowledgeGraph:true,
      visualInspect:true,
      projectImportExport:true,
      freeResearch:true,
      promptEnhancer:true,
      buildOrchestrator:true,
      browserNeural:true
    },
    selfTest:{
      calculatorIntent:calculator.packageSummary.intent,
      calculatorScore:calculatorSmoke.score,
      orchestratorPhases:calculator.phases.map(p=>({id:p.id,status:p.status})),
      runnablePackage:packageChecks,
      crmBackend,
      packagedFiles:packaged.length
    },
    optional:{
      firecrawl:Boolean(process.env.FIRECRAWL_API_KEY),
      serverAI:Boolean(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL)
    },
    time:new Date().toISOString()
  });
}
