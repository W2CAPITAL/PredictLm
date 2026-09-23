import { runPredictCore } from '@/lib/predict-core';
import { runLocalSmokeTest } from '@/lib/local-tools';
import { buildRunnableProject, packagingSummary } from '@/lib/project-packager';
import { orchestrateBuild } from '@/lib/build-orchestrator';
import { resolveBuildTurn } from '@/lib/build-turn';
import { classifyConversation, directConversationReply, filterRelevantResearchItems, responseTopicAlignment } from '@/lib/chat-intelligence';
import { retrieveKnowledge } from '@/lib/assistant-knowledge';
import { datajudTribunal, findCnjNumber, isValidCnj, maskCnj, resolveCnjFromContext } from '@/lib/legal/cnj';
import { hasLegacyEscapedNewlines, repairLegacyEscapedNewlines } from '@/lib/workspace-repair';
import { createLegalDossier } from '@/lib/legal/dossier';
import { isAggressiveLegalRequest, isLegalDossierRequest } from '@/lib/legal/mode';
import { assessFraudRisk } from '@/lib/security/fraud-defense';
import { sourceQuality } from '@/lib/security/source-quality';

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
  const carPrompt='como posso criar um carro do zero';
  const carHowTo=directConversationReply(carPrompt,[],{loaded:false,tier:null})||'';
  const carKnowledge=retrieveKnowledge(carPrompt,6);
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
    companyResearchRejectsNoise:relevantCompany.length===1&&relevantCompany[0]?.title==='Como abrir uma empresa no Brasil',
    carHowToAnswersCar:carHowTo.includes('carro')&&carHowTo.includes('chassi')&&carHowTo.includes('homolog'),
    carRejectsAgentLifecycle:!carKnowledge.some(x=>x.id==='microsoft-agents'),
    carRejectsOffTopicAnswer:!responseTopicAlignment(carPrompt,'Production agents need a lifecycle with models, tools, memory and observability.').relevant
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
  const enrichedDossier=createLegalDossier(dossierFixture,{mode:'standard',evidence:{
    documents:[{title:'Contrato de prestação',source:'anexo do usuário',summary:'Contrato fornecido para cruzamento com o processo.',confidence:'high'}],
    favorable:['Documento contratual assinado disponível para análise.'],
    adverse:['Resultado processual público não demonstra vitória de mérito.'],
    failures:[{actor:'Operação',title:'Ponto documental a revisar',detail:'Conferir se obrigação contratual e execução efetiva coincidem.',basis:'Contrato fornecido'}],
    risks:[{title:'Decisão sem inventário documental',level:'high',detail:'Sem cruzar contrato e comprovantes, atribuição de responsabilidade é prematura.'}],
    recommendations:[{phase:'immediate',title:'Indexar anexos',detail:'Relacionar contrato, comprovantes e comunicações por data e origem.'}]
  }});
  const fraudFixture=assessFraudRisk({
    texts:['URGENTE: sua conta foi suspensa. Envie o OTP e faça o PIX para a nova chave agora.'],
    urls:['https://xn--banc-seguro-9za.example/login/verify'],
    transactions:[
      {from:'a',to:'hub',timestamp:'2026-09-23T10:00:00Z'},
      {from:'b',to:'hub',timestamp:'2026-09-23T10:01:00Z'},
      {from:'c',to:'hub',timestamp:'2026-09-23T10:02:00Z'},
      {from:'d',to:'hub',timestamp:'2026-09-23T10:03:00Z'},
      {from:'e',to:'hub',timestamp:'2026-09-23T10:04:00Z'},
      {from:'f',to:'hub',timestamp:'2026-09-23T10:05:00Z'}
    ]
  });
  const officialSource=sourceQuality('https://www.bcb.gov.br/estabilidadefinanceira/seguranca','Banco Central');
  const githubSource=sourceQuality('https://github.com/example/repo','GitHub');
  const threatSource=sourceQuality('https://github.com/gaur-avvv/wormxgpt','GitHub');
  const fraudSecurity={
    flagsCredentialTheft:fraudFixture.signals.some(x=>x.category==='credential-theft'),
    flagsPaymentDiversion:fraudFixture.signals.some(x=>x.category==='payment-diversion'),
    flagsGraphPattern:fraudFixture.signals.some(x=>x.category==='transaction-graph'),
    officialRanksAboveGithub:officialSource.score>githubSource.score,
    threatRepoIsReference:threatSource.tier==='threat-reference'&&threatSource.score<githubSource.score
  };

  const legalArtifactBehavior={
    dossierIntent:isLegalDossierRequest('gere um dossiê sobre isso'),
    normalStatusIsNotDossier:!isLegalDossierRequest('como está o processo?'),
    neutralDoesNotEnableAggressive:!isAggressiveLegalRequest('gere um dossiê completo'),
    explicitAttackEnablesAggressive:isAggressiveLegalRequest('ataque isso com AEGIS total'),
    standardOmitsAggressiveBlock:!standardDossier.includes('Revisão adversarial — pedido expresso'),
    aggressiveIncludesAggressiveBlock:aggressiveDossier.includes('Revisão adversarial — pedido expresso'),
    dossierKeepsLiteralSourceErrors:standardDossier.includes('DataJud excedeu o tempo')&&standardDossier.includes('DJEN HTTP 403'),
    dossierRichStructure:['Documentos e material suplementar','Balanço de forças','Pontos críticos','Mapa qualitativo de risco','Síntese do Chair','Próximos passos'].every(x=>standardDossier.includes(x)),
    dossierShowsEvidenceGap:standardDossier.includes('Lacunas de evidência')&&standardDossier.includes('não serão preenchidas por inferência'),
    dossierUsesSupplementalEvidence:enrichedDossier.includes('Contrato de prestação')&&enrichedDossier.includes('anexo do usuário')&&enrichedDossier.includes('Ponto documental a revisar'),
    dossierHasFraudSection:standardDossier.includes('FRAUDE / AUTENTICIDADE')&&standardDossier.includes('Sinal de risco não comprova fraude')
  };

  const ok=calculatorSmoke.ok&&packageChecks.every(x=>x.ok)&&packageInfo.runnable&&crmBackend&&Object.values(crmTemplateSerialization).every(Boolean)&&Object.values(continuity).every(Boolean)&&Object.values(chatIntelligence).every(Boolean)&&Object.values(legalModule).every(Boolean)&&Object.values(legalArtifactBehavior).every(Boolean)&&Object.values(fraudSecurity).every(Boolean);

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
      fraudShield:true,
      sourceProvenance:true,
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
      fraudSecurity,
      packagedFiles:packaged.length
    },
    optional:{
      firecrawl:Boolean(process.env.FIRECRAWL_API_KEY),
      serverAI:Boolean(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL)
    },
    time:new Date().toISOString()
  });
}
