import { runPredictCore } from '@/lib/predict-core';
import { runLocalSmokeTest } from '@/lib/local-tools';
import { buildRunnableProject, packagingSummary } from '@/lib/project-packager';
import { orchestrateBuild } from '@/lib/build-orchestrator';
import { resolveBuildTurn } from '@/lib/build-turn';
import { classifyConversation, directConversationReply } from '@/lib/chat-intelligence';
import { datajudTribunal, findCnjNumber, isValidCnj, maskCnj } from '@/lib/legal/cnj';

export const runtime = 'nodejs';

export async function GET(){
  const calculator=orchestrateBuild('crie uma calculadora premium',[],'max');
  const calculatorSmoke=runLocalSmokeTest(calculator.files);
  const packaged=buildRunnableProject(calculator.files);
  const packageInfo=packagingSummary(calculator.files);
  const required=['package.json','index.html','src/main.jsx','src/App.jsx','src/styles.css','vite.config.js','RUNME.md'];
  const packageChecks=required.map(path=>({path,ok:packaged.some(f=>f.path===path)}));

  const crm=orchestrateBuild('crie um crm financeiro',[],'deep');
  const crmApp=crm.files.find(f=>f.path==='App.tsx')?.content||'';
  const crmRepeat=orchestrateBuild('crie um crm financeiro',crm.files,'deep');
  const crmRepeatApp=crmRepeat.files.find(f=>f.path==='App.tsx')?.content||'';
  const vagueTurn=resolveBuildTurn('crie',crm.files,[]);
  const helloTurn=resolveBuildTurn('oi',crm.files,[]);
  const vagueContinue=orchestrateBuild(vagueTurn.effectivePrompt,crm.files,'deep');

  const pinkBase=orchestrateBuild('crie uma calculadora premium',[],'deep');
  const pink=runPredictCore('cor rosa',pinkBase.files,'deep');
  const pinkStyle=pink.files.find(f=>f.path==='styles.css')?.content||'';
  const originalCalcApp=pinkBase.files.find(f=>f.path==='App.tsx')?.content||'';

  const crmPackage=buildRunnableProject(crm.files);
  const crmBackend=crmPackage.some(f=>f.path==='server/index.mjs')&&crmPackage.some(f=>f.path==='server/data.json');

  const continuity={
    repeatPreservesApp:crmApp.length>0&&crmRepeatApp===crmApp&&!crmRepeat.appChanged,
    vagueCrieBecomesContinuation:vagueTurn.kind==='continue'&&vagueContinue.files.find(f=>f.path==='App.tsx')?.content===crmApp,
    greetingIsConversation:helloTurn.kind==='conversation',
    pinkIsPatch:pinkStyle.includes('#ec4899')&&!pink.files.some(f=>f.path==='App.tsx')&&originalCalcApp.length>0
  };

  const chatHistory:any[]=[
    {id:'1',role:'assistant',content:'Ative o Neural Local para respostas generativas.',createdAt:Date.now(),engine:'Predict Core'}
  ];
  const chatIntelligence={
    affectionIsCasual:classifyConversation('você me ama?',[])==='casual'&&!!directConversationReply('você me ama?',[],{loaded:false,tier:null}),
    activeIsContext:classifyConversation('já está ativo',chatHistory)==='context'&&!!directConversationReply('já está ativo',chatHistory,{loaded:true,tier:'lite'}),
    whoIsIsFactual:classifyConversation('quem é Elon Musk',[])==='factual'
  };

  const legalModule={
    detectsCnj:findCnjNumber('fale sobre 4000338-89.2026.8.26.0002')==='4000338-89.2026.8.26.0002',
    validatesCnj:isValidCnj('4000338-89.2026.8.26.0002'),
    mapsTjsp:datajudTribunal('4000338-89.2026.8.26.0002')?.alias==='tjsp',
    masksDigits:maskCnj('40003388920268260002')==='4000338-89.2026.8.26.0002',
    exampleTjspForum:datajudTribunal('4000338-89.2026.8.26.0002')?.label==='TJSP'
  };

  const ok=calculatorSmoke.ok&&packageChecks.every(x=>x.ok)&&packageInfo.runnable&&crmBackend&&Object.values(continuity).every(Boolean)&&Object.values(chatIntelligence).every(Boolean)&&Object.values(legalModule).every(Boolean);

  return Response.json({
    ok,
    service:'predictlm-studio',
    version:'5.3',
    surfaces:{chat:true,build:true,research:true,imagine:true,plugins:true,processos:true},
    zeroApi:{
      deepThink:true,
      council:true,
      knowledgeGraph:true,
      visualInspect:true,
      projectImportExport:true,
      freeResearch:true,
      promptEnhancer:true,
      buildOrchestrator:true,
      browserNeural:true,
      projectContinuity:true,
      datajudDjenModule:true,
      cnjAutoRouting:true,
      legalDossier:true,
      officialCourtFallback:true,
      twinCoreX10:true,
      grokUnifiedShell:true,
      saoPauloFunctions:true
    },
    selfTest:{
      calculatorIntent:calculator.packageSummary.intent,
      calculatorScore:calculatorSmoke.score,
      orchestratorPhases:calculator.phases.map(p=>({id:p.id,status:p.status})),
      runnablePackage:packageChecks,
      crmBackend,
      continuity,
      chatIntelligence,
      legalModule,
      packagedFiles:packaged.length
    },
    optional:{
      firecrawl:Boolean(process.env.FIRECRAWL_API_KEY),
      serverAI:Boolean(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL)
    },
    time:new Date().toISOString()
  });
}
