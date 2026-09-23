import type { WorkspaceFile } from './types';

export type PromptPreset='enhance'|'fullstack'|'setup-repo'|'frontend'|'backend'|'database'|'test-ship'|'security';

function detectRepo(text:string){
  const gh=text.match(/(?:github\.com\/)?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
  return gh?.[1]||'the referenced repository';
}

export function enhanceBuildPrompt(input:string,preset:PromptPreset,currentFiles:WorkspaceFile[]=[]){
  const raw=input.trim()||'Build the requested application';
  const repo=detectRepo(raw);
  const hasProject=currentFiles.some(f=>/App\.(tsx|jsx|ts|js)$/.test(f.path));
  const context=hasProject?'Preserve the current working project and modify it incrementally; do not replace it with a generic starter.':'Create a new project.';
  const common=[
    context,
    'First inspect the current state and write a short implementation spec before changing files.',
    'Separate product requirements, frontend, backend/data needs, environment/configuration, tests, security and packaging.',
    'Only add a backend when the product actually needs persistence, authentication, shared data, background work or server-only secrets.',
    'Keep every existing working feature unless the request explicitly removes it.',
    'Validate the result and produce a runnable export, not a visual mockup.'
  ];
  const extra:Record<PromptPreset,string[]>={
    enhance:[
      'Clarify ambiguous requirements by making conservative product decisions and list those decisions.',
      'Implement complete interaction states: loading, empty, success and error where relevant.',
      'Review the final output against the original request.'
    ],
    fullstack:[
      'Design the frontend information architecture and interaction model.',
      'Design the server/API boundary, persistence model and validation when justified.',
      'Create a database/schema plan and seed data when persistence is required.',
      'Provide .env.example, setup commands and a production-ready packaging path.'
    ],
    'setup-repo':[
      'Set up '+repo+' as a real development project.',
      'Inspect package manifests and installation docs, install the correct dependencies, identify required runtime services and prepare local startup.',
      'If PostgreSQL or another service is required, document/start it through the project-supported workflow.',
      'Create .env from safe defaults and .env.example, never invent secrets.',
      'List exactly which keys or credentials are still missing, what each enables, and which features continue to work without them.',
      'Run the repository build/test/typecheck commands and report failures with concrete fixes.'
    ],
    frontend:[
      'Focus on information architecture, responsive layout, component states, accessibility and visual hierarchy.',
      'Avoid generic SaaS cards unless they directly serve the product workflow.',
      'Make every visible control functional and preserve domain-specific behavior.'
    ],
    backend:[
      'Define API resources, validation, error contracts, auth boundary, server-only secrets and background jobs if needed.',
      'Prefer simple durable data flows over fake in-memory endpoints when the product requires persistence.',
      'Document how the frontend connects to the server.'
    ],
    database:[
      'Model entities, relationships, indexes, constraints, lifecycle timestamps and deletion semantics.',
      'Include seed/demo data and explain migration strategy.',
      'Keep tenant/workspace isolation explicit when the product is multi-user.'
    ],
    'test-ship':[
      'Add smoke tests for the critical user flow, plus build/typecheck validation.',
      'Run quality/security review and fix blocking findings before packaging.',
      'Produce a runnable ZIP with setup instructions and no hidden local dependencies.'
    ],
    security:[
      'Threat-model the changed surface: secrets, auth, XSS/injection, unsafe URLs, data isolation and dependency risk.',
      'Do not expose server credentials in browser bundles.',
      'Add input validation and safe defaults, then re-run the security gate.'
    ]
  };
  return [raw,'',...common,...extra[preset]].map((x,i)=>i===0?x:'- '+x).join('\n');
}

export const promptPresets:{id:PromptPreset;label:string;hint:string}[]=[
  {id:'enhance',label:'Aprimorar',hint:'Spec + decisões + validação'},
  {id:'fullstack',label:'Full-stack',hint:'Front + back + dados + env'},
  {id:'setup-repo',label:'Setup repo',hint:'Dependências + serviços + chaves'},
  {id:'frontend',label:'Frontend',hint:'UX + responsive + estados'},
  {id:'backend',label:'Backend/API',hint:'API + validação + auth'},
  {id:'database',label:'Database',hint:'Schema + relações + migrations'},
  {id:'test-ship',label:'Test & Ship',hint:'Testes + build + ZIP'},
  {id:'security',label:'Security',hint:'Threat model + gate'}
];
