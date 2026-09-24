import type { WorkspaceFile } from './types';

export interface SaaSBlueprint {
  kind:'generic-saas'|'crm'|'erp'|'helpdesk'|'workspace'|'creator';
  modules:string[];
  entities:string[];
  qualities:string[];
  references:string[];
}

export function inferSaaSBlueprint(prompt:string,intent:string):SaaSBlueprint|null{
  const p=String(prompt||'').toLowerCase();
  const saas=/\bsaas\b|multi.?tenant|assinatura|subscription|workspace|equipe|tenant|rbac|plano|billing/.test(p);
  const crm=intent==='crm'||/\bcrm\b|lead|pipeline|oportunidade|vendas|cliente/.test(p);
  const erp=/\berp\b|estoque|compras|fornecedor|fatura|contabilidade|financeiro|ordem de venda/.test(p);
  const helpdesk=/ticket|helpdesk|service desk|suporte|chamado|sla/.test(p);
  const creator=/creator|conte[uú]do|media|campanha|portfolio|publica[cç][aã]o|social/.test(p);
  const workspace=/projeto|task|kanban|documento|chat|colabora[cç][aã]o|workspace/.test(p);
  if(!(saas||crm||erp||helpdesk||creator||workspace))return null;

  let kind:SaaSBlueprint['kind']='generic-saas';
  if(crm)kind='crm'; else if(erp)kind='erp'; else if(helpdesk)kind='helpdesk'; else if(creator)kind='creator'; else if(workspace)kind='workspace';

  const base=['Dashboard','Usuários & equipes','Permissões','Notificações','Integrações','Configurações'];
  const map:Record<SaaSBlueprint['kind'],string[]>={
    'generic-saas':['Visão geral','Workspaces','Planos & billing','Auditoria',...base],
    crm:['Dashboard','Pipeline','Empresas','Contatos','Leads','Oportunidades','Atividades','Relatórios',...base],
    erp:['Dashboard','Clientes','Fornecedores','Produtos','Estoque','Compras','Vendas','Financeiro','Relatórios',...base],
    helpdesk:['Dashboard','Tickets','Clientes','SLA','Base de conhecimento','Automação','Relatórios',...base],
    workspace:['Home','Projetos','Tarefas','Calendário','Documentos','Chat','Atividade',...base],
    creator:['Dashboard','Conteúdo','Campanhas','Assets','Calendário','Analytics','Monetização',...base]
  };
  const entityMap:Record<SaaSBlueprint['kind'],string[]>={
    'generic-saas':['Tenant','Workspace','User','Role','Permission','Plan','Subscription','AuditEvent'],
    crm:['Company','Contact','Lead','Opportunity','Activity','PipelineStage','Invoice','AgentRun','AuditEvent'],
    erp:['Customer','Supplier','Product','InventoryItem','PurchaseOrder','SalesOrder','Invoice','Payment','AuditEvent'],
    helpdesk:['Customer','Ticket','TicketMessage','SLA','KnowledgeArticle','Assignment','AutomationRule','AuditEvent'],
    workspace:['Workspace','Project','Task','Comment','Document','CalendarEvent','Member','AuditEvent'],
    creator:['Creator','Asset','Campaign','Post','Channel','Metric','RevenueEvent','AuditEvent']
  };

  return {
    kind,
    modules:Array.from(new Set(map[kind])),
    entities:entityMap[kind],
    qualities:[
      'tenant isolation on every persistent query',
      'RBAC with explicit role/permission matrix',
      'audit trail for high-impact mutations',
      'loading, empty, error and success states',
      'idempotent writes for background jobs/webhooks',
      'search/filter/sort/pagination for record-heavy screens',
      'responsive sidebar/subnavigation',
      'real CRUD and validation instead of decorative controls',
      'server-only secrets and integration health checks',
      'exportable setup with migrations/env/seed/test instructions'
    ],
    references:[
      'W1CAPITAL/LexisPredict','wasp-lang/open-saas','ixartz/SaaS-Boilerplate','twentyhq/twenty',
      'frappe/erpnext','hcengineering/platform','trycompai/crm','Peppermint-Lab/peppermint',
      'go2ismail/Free-CRM','JacobEvelyn/friends'
    ]
  };
}

export function buildSaaSBlueprintFiles(prompt:string,intent:string):WorkspaceFile[]{
  const bp=inferSaaSBlueprint(prompt,intent);
  if(!bp)return [];
  const md=[
    '# SaaS Product Blueprint','',
    'Kind: **'+bp.kind+'**','',
    '## Product modules',...bp.modules.map(x=>'- '+x),'',
    '## Domain entities',...bp.entities.map(x=>'- '+x),'',
    '## Production invariants',...bp.qualities.map(x=>'- '+x),'',
    '## Architecture references',...bp.references.map(x=>'- '+x),'',
    'References are architecture inputs; source reuse must respect each repository license.'
  ].join('\n');

  const tenant=[
    "export type TenantRole='owner'|'admin'|'manager'|'member'|'viewer';",
    'export interface TenantContext{tenantId:string;userId:string;role:TenantRole;permissions:string[]}',
    "export function assertTenant(recordTenantId:string,ctx:TenantContext){if(!ctx?.tenantId||recordTenantId!==ctx.tenantId)throw new Error('Tenant isolation violation')}",
    "export function can(ctx:TenantContext,permission:string){return ctx.role==='owner'||ctx.role==='admin'||ctx.permissions.includes(permission)}"
  ].join('\n');

  const audit=[
    'export interface AuditEvent{id:string;tenantId:string;actorId:string;action:string;entity:string;entityId?:string;before?:unknown;after?:unknown;createdAt:string}',
    "export function auditEvent(input:Omit<AuditEvent,'id'|'createdAt'>):AuditEvent{return {...input,id:crypto.randomUUID(),createdAt:new Date().toISOString()}}"
  ].join('\n');

  const modules='export const SAAS_MODULES='+JSON.stringify(bp.modules)+' as const;\nexport const SAAS_ENTITIES='+JSON.stringify(bp.entities)+' as const;\nexport const PRODUCT_GATES='+JSON.stringify({tenantIsolation:true,rbac:true,auditTrail:true,validation:true,asyncStates:true,integrationHealth:true,exportableSetup:true})+' as const;\n';

  return [
    {path:'SAAS_BLUEPRINT.md',language:'markdown',content:md},
    {path:'src/domain/tenant.ts',language:'typescript',content:tenant},
    {path:'src/domain/audit.ts',language:'typescript',content:audit},
    {path:'src/domain/saas-modules.ts',language:'typescript',content:modules}
  ];
}
