import { runPredictCore } from '@/lib/predict-core';
import { runLocalSmokeTest } from '@/lib/local-tools';
import { buildRunnableProject, packagingSummary } from '@/lib/project-packager';
import { orchestrateBuild } from '@/lib/build-orchestrator';
import { resolveBuildTurn } from '@/lib/build-turn';
import { classifyConversation, directConversationReply, filterRelevantResearchItems } from '@/lib/chat-intelligence';
import { datajudTribunal, findCnjNumber, isValidCnj, maskCnj, resolveCnjFromContext } from '@/lib/legal/cnj';
import { hasLegacyEscapedNewlines, repairLegacyEscapedNewlines } from '@/lib/workspace-repair';
import { createLegalDossier } from '@/lib/legal/dossier';
import { isAggressiveLegalRequest, isLegalDossierRequest } from '@/lib/legal/mode';

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
  const legacyCrm="function App(){\\n const csv='\\\\n';\\n return <main/>\\n}";
  const repairedLegacy=repairLegacyEscapedNewlines(legacyCrm);
  const crmTemplateSerialization={
    crmSmokePasses:crm.smoke.ok,
    realStructuralNewlines:crmApp.includes("function App(){\n const statuses="),
    noLegacyEncodedStructure:!hasLegacyEscapedNewlines(crmApp),
    legacyRepairWorks:!hasLegacyEscapedNewlines(repairedLegacy)&&repairedLegacy.includes("function App(){\n const csv='\\n';\n return <main/>")
  };

  const continuity={
    repeatPreservesApp:crmApp.length>0&&crmRepeatApp===crmApp&&!crmRepeat.appChanged,
    vagueCrieBecomesContinuation:vagueTurn.kind==='continue'&&vagueContinue.files.find(f=>f.path==='App.tsx')?.content===crmApp,
    greetingIsConversation:helloTurn.kind==='conversation',
    pinkIsPatch:pinkStyle.includes('#ec4899')&&!pink.files.some(f=>f.path==='App.tsx')&&originalCalcApp.length>0
  };

  const chatHistory:any[]=[
    {id:'1',role:'assistant',content:'Ative o Neural Local para respostas generativas.',createdAt:Date.now(),engine:'Predict Core'}
  ];
  const companyPrompt='como posso criar uma empresa do zero';
  const companyReply=directConversationReply(companyPrompt,[],{loaded:false,tier:null})||'';
  const relevanceFixture=[
    {title:'Como abrir uma empresa no Brasil',description:'Passos para formalização, CNPJ, registro empresarial e organização do negócio.',url:'https://example.test/empresa',source:'fixture'},
    {title:'Phantom Blade Zero',description:'Jogo de RPG de ação wuxia.',url:'https://example.test/game',source:'fixture'},
    {title:'Prova de conhecimento zero',description:'Protocolo criptográfico de zero knowledge.',url:'https://example.test/zkp',source:'fixture'},
    {title:'Criador de conteúdo e empresário',description:'Biografia de um youtuber brasileiro.',url:'https://example.test/youtuber',source:'fixture'}
  ];
  const relevantCompany=filterRelevantResearchItems(companyPrompt,relevanceFixture,6);

  const chatIntelligence={
    affectionIsCasual:classifyConversation('você me ama?',[])==='casual'&&!!directConversationReply('você me ama?',[],{loaded:false,tier:null}),
    activeIsContext:classifyConversation('já está ativo',chatHistory)==='context'&&!!directConversationReply('já está ativo',chatHistory,{loaded:true,tier:'lite'}),
    whoIsIsFactual:classifyConversation('quem é Elon Musk',[])==='factual',
    dossierIsContext:classifyConversation('gere um dossiê sobre isso',[{id:'p',role:'assistant',content:'Processo 4000338-89.2026.8.26.0002',createdAt:Date.now()}] as any)==='context',
    dossierContextResolvesCnj:resolveCnjFromContext('gere um dossiê sobre isso',['Processo 4000338-89.2026.8.26.0002'])==='4000338-89.2026.8.26.0002',
    companyHowToIsSpecific:companyReply.includes('CNPJ')&&companyReply.includes('clientes'),
    companyResearchRejectsNoise:relevantCompany.length===1&&relevantCompany[0]?.title==='Como abrir uma empresa no Brasil'
  };

  const legalModule={
    detectsCnj:findCnjNumber('fale sobre 4000338-89.2026.8.26.0002')==='4000338-89.2026.8.26.0002',
    validatesCnj:isValidCnj('4000338-89.2026.8.26.0002'),
    mapsTjsp:datajudTribunal('4000338-89.2026.8.26.0002')?.alias==='tjsp',
    masksDigits:maskCnj('40003388920268260002')==='4000338-89.2026.8.26.0002',
    exampleTjspForum:datajudTribunal('4000338-89.2026.8.26.0002')?.label==='TJSP'
  };

  const dossierFixture:any={
    query:'4000338-89.2026.8.26.0002',
    processNumber:'4000338-89.2026.8.26.0002',
    digits:'40003388920268260002',
    validCnj:true,
    tribunalAlias:'tjsp',
    tribunalLabel:'TJSP',
    fetchedAt:new Date().toISOString(),
    datajud:{ok:false,error:'DataJud excedeu o tempo de resposta após nova tentativa.',found:false,subjects:[],movements:[]},
    djen:{ok:false,error:'DJEN HTTP 403. O DJEN recusou o egress desta execução.',count:0,publications:[]},
    officialPortals:[],
    trace:[],
    timeline:[],
    lenses:[],
    interpretation:{
      confidence:'low',posture:'unknown',postureLabel:'Inconclusivo',
      currentState:'Sem dados públicos suficientes nesta execução.',
      whatHappened:[],whyItMatters:[],nextActions:['Tentar novamente e confirmar no sistema oficial.'],evidence:[]
    },
    summary:{
      headline:'Processo teste',status:'Sem dados públicos suficientes',publicationCount:0,movementCount:0,
      caveats:['Falhas de fonte devem permanecer explícitas.'],
      sourceSummary:'DataJud: falhou · DJEN: falhou'
    }
  };
  const standardDossier=createLegalDossier(dossierFixture,{mode:'standard'});
  const aggressiveDossier=createLegalDossier(dossierFixture,{mode:'aggressive'});
  const legalArtifactBehavior={
    dossierIntent:isLegalDossierRequest('gere um dossiê sobre isso'),
    normalStatusIsNotDossier:!isLegalDossierRequest('como está o processo?'),
    neutralDoesNotEnableAggressive:!isAggressiveLegalRequest('gere um dossiê completo'),
    explicitAttackEnablesAggressive:isAggressiveLegalRequest('ataque isso com AEGIS total'),
    standardOmitsAggressiveBlock:!standardDossier.includes('Revisão adversarial — pedido expresso'),
    aggressiveIncludesAggressiveBlock:aggressiveDossier.includes('Revisão adversarial — pedido expresso'),
    dossierKeepsLiteralSourceErrors:standardDossier.includes('DataJud excedeu o tempo')&&standardDossier.includes('DJEN HTTP 403')
  };

  const ok=calculatorSmoke.ok&&packageChecks.every(x=>x.ok)&&packageInfo.runnable&&crmBackend&&Object.values(crmTemplateSerialization).every(Boolean)&&Object.values(continuity).every(Boolean)&&Object.values(chatIntelligence).every(Boolean)&&Object.values(legalModule).every(Boolean)&&Object.values(legalArtifactBehavior).every(Boolean);

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
      crmTemplateSerialization,
      continuity,
      chatIntelligence,
      legalModule,
      legalArtifactBehavior,
      packagedFiles:packaged.length
    },
    optional:{
      firecrawl:Boolean(process.env.FIRECRAWL_API_KEY),
      serverAI:Boolean(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL)
    },
    time:new Date().toISOString()
  });
}
