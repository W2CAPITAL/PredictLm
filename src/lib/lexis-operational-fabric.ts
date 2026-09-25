import type { WorkspaceFile } from './types';

export type LexisEngineId=
  |'state-store'|'datajud'|'djen'|'scanner'|'dispatch'|'provider-mesh'
  |'kpi'|'case-ops'|'attendance'|'document-flow'|'ocr'|'dossier'|'offline-sync'|'crm-finance';

export interface LexisEngineSpec{
  id:LexisEngineId;
  deterministic:boolean;
  purpose:string;
  rules:string[];
}

export const LEXIS_ENGINE_MAP:LexisEngineSpec[]=[
  {id:'state-store',deterministic:true,purpose:'Global case/UI/queue state',rules:['State stores orchestrate data and queues; they never invent client-facing text.']},
  {id:'datajud',deterministic:true,purpose:'CNJ process movements',rules:['Use actual API/portal return and last movement date.','Never invent movement when the source fails.']},
  {id:'djen',deterministic:true,purpose:'Official judicial publications',rules:['DJEN publication is independent from DataJud movement.','HTML/error responses are not zero results.']},
  {id:'scanner',deterministic:true,purpose:'Batch DataJud/DJEN queues',rules:['Progress counters must reflect real processed items.','Retry/rate-limit/idempotency are required.','Scanner must not overwrite ownership.']},
  {id:'dispatch',deterministic:false,purpose:'Internal/client messaging',rules:['WhatsApp is short, second person and recent-act focused.','Do not invent deadline/value absent from evidence.','Sanitize internal brand/engine terms.']},
  {id:'provider-mesh',deterministic:false,purpose:'Free-form analysis and drafting',rules:['Low-quality provider output is discarded.','Provider failure changes runtime, not the requested task.']},
  {id:'kpi',deterministic:true,purpose:'Portfolio and operations metrics',rules:['KPI values are derived from stored/query data, never LLM estimates.','Dashboard and list use the same base scope/query.']},
  {id:'case-ops',deterministic:true,purpose:'Case ownership/status/queues',rules:['created_by is owner.','Court closure signal is not automatically office/business status.','Tenant/company scope is mandatory.']},
  {id:'attendance',deterministic:true,purpose:'Human service log and return dates',rules:['atendido_por records who served; it never silently changes created_by.','Ranking is based on attendance logs, not mere edits.']},
  {id:'document-flow',deterministic:false,purpose:'Legal documents/powers/petitions/reports',rules:['Source → extract → normalize → validate → draft → review → artifact.','Missing facts remain marked missing.']},
  {id:'ocr',deterministic:true,purpose:'Document text extraction',rules:['Preserve raw text/confidence.','OCR may extract; it may not invent CPF/name/address/value.']},
  {id:'dossier',deterministic:false,purpose:'Evidence/timeline second brain',rules:['Aggregate facts, timeline, conflicts and evidence gaps.','Dossier is context for Predict Auto, not a replacement final-answer engine.']},
  {id:'offline-sync',deterministic:true,purpose:'Import/export/local-first/Plan B',rules:['Source of truth must be explicit.','Sync must be idempotent by canonical identifiers such as CNJ.','Back up before destructive batches.']},
  {id:'crm-finance',deterministic:true,purpose:'CRM, billing, suppliers and finance operations',rules:['Business records require validation/audit.','Lead/CRM concerns do not replace legal case ownership rules.']}
];

const map=new Map(LEXIS_ENGINE_MAP.map(x=>[x.id,x]));

export function isLexisOperationalPrompt(text:string){
  return /datajud|djen|cnj|processo|jur[ií]dic|carteira|atendimento|dossi[eê]|peti[cç][aã]o|procura[cç][aã]o|scanner|prazo|kpi|sup[eé]rvisor|operador|tribunal|b\.a\.|busca e apreens[aã]o/i.test(String(text||''));
}

export function routeLexisOperation(text:string):LexisEngineSpec[]{
  if(!isLexisOperationalPrompt(text))return [];
  const p=String(text||'').toLowerCase();
  const ids:LexisEngineId[]=[];
  if(/kpi|quantos|ranking|meta|atendidos|vencidos|dashboard|painel/.test(p))ids.push('kpi');
  if(/andamento|movimento|datajud|cnj/.test(p))ids.push('datajud');
  if(/djen|di[aá]rio|publica[cç][aã]o/.test(p))ids.push('djen');
  if(/lote|scanner|fila|parados|auto.?encerrar/.test(p))ids.push('scanner');
  if(/whatsapp|mensagem|cliente|despacho/.test(p))ids.push('dispatch');
  if(/peti[cç][aã]o|procura[cç][aã]o|substabelecimento|habilita[cç][aã]o|pe[cç]a|documento/.test(p))ids.push('document-flow');
  if(/ocr|extrair.*pdf|imagem.*texto/.test(p))ids.push('ocr');
  if(/dossi[eê]|timeline|evid[eê]ncia/.test(p))ids.push('dossier');
  if(/offline|import|export|csv|xlsx|planilha|sync|plano b/.test(p))ids.push('offline-sync');
  if(/crm|lead|finance|cobran[cç]a|fornecedor/.test(p))ids.push('crm-finance');
  if(/atendimento|retorno|atendido_por/.test(p))ids.push('attendance');
  if(/dono|created_by|status|empresa|supervisor|operador/.test(p))ids.push('case-ops');
  if(/analise|an[aá]lise|tese|resumo|redigir|rascunho/.test(p))ids.push('provider-mesh');
  if(!ids.length)ids.push('case-ops','provider-mesh');
  return Array.from(new Set(ids)).map(id=>map.get(id)!).filter(Boolean);
}

export function lexisOperationalContext(text:string){
  const engines=routeLexisOperation(text);
  if(!engines.length)return '';
  return [
    'LEXIS OPERATIONAL ROUTER',
    ...engines.flatMap(engine=>[
      '['+engine.id+' · '+(engine.deterministic?'deterministic':'AI-assisted')+'] '+engine.purpose,
      ...engine.rules.map(rule=>'- '+rule)
    ]),
    '- Never expose internal engine names unless the user explicitly asks how routing worked.'
  ].join('\n');
}

export function buildLexisOperationalFiles(prompt:string):WorkspaceFile[]{
  if(!isLexisOperationalPrompt(prompt))return [];
  const engines=routeLexisOperation(prompt);
  const operating=[
    '# Lexis Operating Model',
    '',
    '## Routed engines for this product/request',
    ...engines.map(x=>'- '+x.id+' — '+x.purpose+' — '+(x.deterministic?'deterministic':'AI-assisted')),
    '',
    '## Global invariants',
    '- tenant/company scope on every business query;',
    '- created_by (owner) is separate from atendido_por (attendance);',
    '- KPI/save/deadline/ownership logic is deterministic;',
    '- DataJud and DJEN are independent evidence sources;',
    '- scanner progress and provider/integration status must be honest;',
    '- dashboard and list derive from the same scoped data model;',
    '- service-role/secrets remain server-side;',
    '- legal/client drafts never invent missing facts;',
    '- build/typecheck/test failures block “ready”;',
    '- offline/sync uses explicit source-of-truth and idempotency.',
    '',
    '## Product coverage',
    'Cases · company processes · tasks · returns · WhatsApp/messages · agenda · notifications · scanner · stopped cases · closed review · compliance/procedural queues · CRM · finance · documents · OCR · reports · analytics · onboarding · plans · team · superadmin · offline/import/sync · audit.'
  ].join('\n');

  const runtime=[
    'export const LEXIS_RUNTIME_ENGINES='+JSON.stringify(LEXIS_ENGINE_MAP.map(x=>({id:x.id,deterministic:x.deterministic,purpose:x.purpose})))+' as const;',
    "export const OWNERSHIP_FIELD='created_by' as const;",
    "export const ATTENDANCE_FIELD='atendido_por' as const;",
    "export const RETURN_FIELD='proximo_retorno' as const;",
    "export const TENANT_FIELD='empresa_id' as const;",
    "export function preserveOwnerOnAttendance<T extends {created_by?:unknown}>(before:T,patch:Partial<T>){return {...patch,created_by:before.created_by}}"
  ].join('\n');

  return [
    {path:'LEXIS_OPERATING_MODEL.md',language:'markdown',content:operating},
    {path:'src/domain/lexis-engine-map.ts',language:'typescript',content:runtime}
  ];
}
