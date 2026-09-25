import type { WorkspaceFile } from './types';

export type DomainEngineId='space-earth'|'math-quantum'|'finance-forensics'|'legal-graphrag'|'infra-observability';

export interface DomainEngineSpec{
  id:DomainEngineId;
  label:string;
  modules:string[];
  entities:string[];
  integrations:string[];
  rules:string[];
  references:string[];
}

const SPECS:Record<DomainEngineId,DomainEngineSpec>={
  'space-earth':{
    id:'space-earth',
    label:'Space / Earth / Satellite',
    modules:['Mission Control','Satellites','Telemetry','Earth Imagery','Events','Alerts','Data Sources'],
    entities:['Satellite','Mission','Launch','TelemetrySample','ImageryLayer','Observation','Alert','GroundDevice'],
    integrations:['spacex-public','nasa-gibs','starlink-bridge'],
    rules:[
      'Distinguish public/historical launch data from live device telemetry.',
      'Starlink local-device access requires a local/server bridge; a browser/Vercel app must not pretend to reach private LAN hardware.',
      'Enterprise Starlink actions require explicit credentials and real provider responses before being shown as connected.',
      'NASA/GIBS imagery must preserve layer, timestamp, projection and source metadata.',
      'Use deterministic unit/math calculations for orbital, RF or telemetry arithmetic before asking an LLM to explain the result.'
    ],
    references:['gibme-npm/starlink','r-spacex/SpaceX-API','nasa-gibs/worldview','Starlink/starlink','Baptajck/space']
  },
  'math-quantum':{
    id:'math-quantum',
    label:'Mathematics / Quantum',
    modules:['Solver','Formulas','Linear Algebra','Statistics','Quantum Circuits','Experiments','Lessons'],
    entities:['Problem','Formula','Dataset','Matrix','QuantumCircuit','Gate','Experiment','Result'],
    integrations:[],
    rules:[
      'Deterministic arithmetic/statistics is computed locally when possible; the LLM explains rather than invents the number.',
      'Keep units, assumptions, precision and intermediate definitions explicit.',
      'Separate theorem/formula, symbolic manipulation, numerical approximation and empirical measurement.',
      'Quantum answers must distinguish theory/simulation from measurements on actual hardware.',
      'Use progressive difficulty/curriculum patterns for tutoring and test understanding with generated checks.'
    ],
    references:['Kitsunp/kistmath-ai','Universidade-Livre/matematica','TechTastic/Advanced-Math','adjs/am-cq','quantumgercom/Link-Layer-Schudeling','krissiazawadzki/informacao_computacao_quantica','smendoncabruna/ComputacaoQuantica']
  },
  'finance-forensics':{
    id:'finance-forensics',
    label:'Finance / Forensics',
    modules:['Market Data','BCB SGS','Calculations','Cases','Evidence','Reports','Data Sources'],
    entities:['Series','RateObservation','Instrument','Calculation','Case','Evidence','Report'],
    integrations:['bcb-sgs','ftshare'],
    rules:[
      'Prefer official BCB/SGS series for Brazilian forensic rate calculations when that is the requested reference.',
      'Never substitute a different credit modality because its series is easier to find.',
      'Store series code, observation date, unit and source with every calculated result.',
      'FTShare results must preserve pagination/truncation/warnings metadata and remain data context, not an investment recommendation.',
      'Narrative conclusions must be reproducible from the underlying data.'
    ],
    references:['edilsonaguiais/sgs-peritos','FTShare-Lab/FTShare-MCP','FTShare-Lab/FTShare-skill']
  },
  'legal-graphrag':{
    id:'legal-graphrag',
    label:'Legal / GraphRAG / Lexis',
    modules:['Cases','Documents','Timeline','DataJud','DJEN','Knowledge Graph','Tasks','KPIs','Reports','Dossiers'],
    entities:['Company','User','Case','CaseEvent','Publication','Document','LegalEntity','Relation','Task','Attendance','AuditEvent','Dossier'],
    integrations:['datajud','djen'],
    rules:[
      'KPI, ownership, save, tenant scope and deadlines from stored data are deterministic product logic, not LLM guesses.',
      'DataJud and DJEN are independent evidence sources; an API error is not zero results.',
      'GraphRAG may connect entities/relations but every material claim must trace back to a source chunk/event/document.',
      'created_by is ownership; atendido_por is attendance credit and must not silently replace ownership.',
      'Client-facing drafts never invent deadline, value, movement or party data missing from evidence.'
    ],
    references:['W1CAPITAL/LexisPredict','protonspy/JusChat']
  },
  'infra-observability':{
    id:'infra-observability',
    label:'Infrastructure / Deploy / Observability',
    modules:['Services','Deployments','Health','Metrics','Logs','Alerts','Integrations','Runbooks'],
    entities:['Service','Deployment','HealthCheck','Metric','LogEvent','Alert','Runbook','Environment'],
    integrations:['vercel','netdata'],
    rules:[
      'A deployment, service or integration is healthy only after a real probe/check succeeds.',
      'Keep secrets server-side and never write provider/service tokens into generated client bundles.',
      'Use explicit ports, health checks, retry/backoff and failure states for local service orchestration.',
      'Do not expose database/admin ports publicly by default.',
      'Observability should connect symptom -> metric/log -> probable component -> verification step; do not invent root cause.'
    ],
    references:['vercel/vercel','netdata/netdata','ronilsondesouza045-beep/wotlk-local-server-kit','FTShare-Lab/FTShare-MCP']
  }
};

export function classifyDomainEngines(text:string):DomainEngineSpec[]{
  const p=String(text||'').toLowerCase();
  const ids:DomainEngineId[]=[];
  if(/starlink|spacex|sat[eé]lite|orbital|foguete|miss[aã]o espacial|nasa|worldview|gibs|earth observation|telemetria.*dish|dish(y)?/.test(p))ids.push('space-earth');
  if(/matem[aá]tic|c[aá]lculo|[áa]lgebra|matriz|estat[ií]stic|equa[cç][aã]o|quant|qubit|qbit|circuito qu[aâ]nt|hilbert|fourier|derivad|integral/.test(p))ids.push('math-quantum');
  if(/sgs|banco central|bacen|bcb|taxa.*juros|per[ií]cia.*finance|ftshare|mercado|a[cç][aã]o|etf|futuro|bond|renda fixa/.test(p))ids.push('finance-forensics');
  if(/datajud|djen|cnj|jur[ií]dic|processo|peti[cç][aã]o|dossi[eê]|graphrag|juschat|tribunal|carteira.*process/.test(p))ids.push('legal-graphrag');
  if(/vercel|deploy|observab|netdata|monitor|health.?check|log(s)?\b|servidor local|docker|porta\s*\d+|mcp|runbook|infraestrutura/.test(p))ids.push('infra-observability');
  return Array.from(new Set(ids)).map(id=>SPECS[id]);
}

export function domainEngineContext(text:string){
  const engines=classifyDomainEngines(text);
  if(!engines.length)return '';
  return [
    'DOMAIN ENGINE FABRIC',
    ...engines.flatMap(engine=>[
      '['+engine.label+']',
      ...engine.rules.map(rule=>'- '+rule)
    ])
  ].join('\n');
}

export function inferDomainAppBlueprint(prompt:string){
  const engines=classifyDomainEngines(prompt);
  if(!engines.length)return null;
  return {
    engines,
    modules:Array.from(new Set(engines.flatMap(x=>x.modules))),
    entities:Array.from(new Set(engines.flatMap(x=>x.entities))),
    integrations:Array.from(new Set(engines.flatMap(x=>x.integrations))),
    references:Array.from(new Set(engines.flatMap(x=>x.references)))
  };
}

export function buildDomainAppFiles(prompt:string):WorkspaceFile[]{
  const bp=inferDomainAppBlueprint(prompt);
  if(!bp)return [];
  const markdown=[
    '# Domain Engine Blueprint',
    '',
    '## Active engines',
    ...bp.engines.map(x=>'- **'+x.label+'** ('+x.id+')'),
    '',
    '## Modules',
    ...bp.modules.map(x=>'- '+x),
    '',
    '## Entities',
    ...bp.entities.map(x=>'- '+x),
    '',
    '## Integrations',
    ...(bp.integrations.length?bp.integrations.map(x=>'- '+x):['- none required by default']),
    '',
    '## Runtime invariants',
    ...bp.engines.flatMap(x=>x.rules.map(r=>'- '+r)),
    '',
    '## Architecture references',
    ...bp.references.map(x=>'- '+x),
    '',
    'References are pattern/evidence sources. Generated code must respect each source license and must not claim a live integration without a successful probe.'
  ].join('\n');

  const engineTs=[
    'export const DOMAIN_ENGINES='+JSON.stringify(bp.engines.map(x=>x.id))+' as const;',
    'export const DOMAIN_MODULES='+JSON.stringify(bp.modules)+' as const;',
    'export const DOMAIN_ENTITIES='+JSON.stringify(bp.entities)+' as const;',
    'export const DOMAIN_INTEGRATIONS='+JSON.stringify(bp.integrations)+' as const;',
    '',
    "export type SourceState='configured'|'reachable'|'degraded'|'missing';",
    "export interface SourceHealth{id:string;state:SourceState;checkedAt?:string;detail?:string}",
    "export function isOperational(x:SourceHealth){return x.state==='reachable'}"
  ].join('\n');

  return [
    {path:'DOMAIN_ENGINE_BLUEPRINT.md',language:'markdown',content:markdown},
    {path:'src/domain/domain-engines.ts',language:'typescript',content:engineTs}
  ];
}
