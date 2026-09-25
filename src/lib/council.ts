import type { WorkspaceFile } from './types';
import { auditProject } from './audits';
import { buildKnowledgeGraph } from './knowledge';

export type CouncilStatus = 'pass' | 'warn' | 'fail';
export interface CouncilMemberReport {
  id: string;
  name: string;
  focus: string;
  status: CouncilStatus;
  summary: string;
  recommendations: string[];
}
export interface CouncilReport {
  score: number;
  members: CouncilMemberReport[];
  consensus: string[];
}

function status(score:number):CouncilStatus{return score>=85?'pass':score>=60?'warn':'fail';}

export function runLocalCouncil(files:WorkspaceFile[]):CouncilReport{
  const audit=auditProject(files);
  const graph=buildKnowledgeGraph(files);
  const code=files.filter(f=>/\.(tsx?|jsx?|css)$/.test(f.path)).map(f=>f.content).join('\n');
  const hasResponsive=/@media|max-width|min-width|grid-template|flex-wrap/.test(code);
  const hasLoading=/loading|isLoading|pending|skeleton|spinner/i.test(code);
  const hasEmpty=/empty|vazio|nenhum|no results|sem dados/i.test(code);
  const hasError=/error|erro|catch\s*\(/i.test(code);
  const hasTests=files.some(f=>/(test|spec|__tests__)/i.test(f.path));
  const genericCopy=(code.match(/lorem ipsum|your app|amazing|revolutionary|best solution|powerful platform/gi)||[]).length;

  const securityScore=audit.score;
  const architectureScore=Math.max(45,100-graph.orphanCount*8-(files.length>10&&graph.edges.length===0?25:0));
  const uxScore=Math.min(100,[hasResponsive,hasLoading,hasEmpty,hasError].filter(Boolean).length*20+20);
  const qaScore=hasTests?92:58;
  const humanScore=Math.max(55,96-genericCopy*10);
  const hasValidation=/validate|validation|schema|zod|required\(|validEmail|validPhone/i.test(code);
  const hasPersistence=/localStorage|indexedDB|postgres|supabase|firebase|data\.json|writeData|database/i.test(code+files.map(f=>f.path+' '+f.content).join('\n'));
  const hasIntegrations=files.some(f=>/integration|api\.ts|server\//i.test(f.path))||/fetch\(|webhook|api\//i.test(code);
  const hasSecretsBoundary=/\.env|process\.env|server-only|secret/i.test(files.map(f=>f.path+' '+f.content).join('\n'));
  const productScore=Math.min(100,62+(hasPersistence?10:0)+(hasValidation?10:0)+(hasIntegrations?8:0)+(hasEmpty?5:0)+(hasError?5:0));
  const domainScore=Math.min(100,60+(hasValidation?18:0)+(hasPersistence?12:0)+(hasIntegrations?10:0));
  const failureScore=Math.min(100,50+(hasError?18:0)+(hasLoading?10:0)+(hasTests?18:0)+(hasEmpty?4:0));
  const legalPrivacyScore=Math.min(100,70+(hasSecretsBoundary?15:0)+(hasValidation?10:0)-(audit.findings.some(f=>f.severity==='critical')?25:0));
  const operationsScore=Math.min(100,58+(hasPersistence?10:0)+(hasTests?12:0)+(hasSecretsBoundary?10:0)+(hasIntegrations?5:0));
  const counterScore=Math.min(100,60+(hasError?10:0)+(hasValidation?10:0)+(hasTests?10:0)+(audit.findings.length===0?10:0));

  const members:CouncilMemberReport[]=[
    {id:'product',name:'Product',focus:'north star & completeness',status:status(productScore),summary:'Product completeness '+productScore+'/100 across data, validation, integrations and state handling.',recommendations:[hasPersistence?'Persistence exists.':'Decide whether durable data is required.',hasValidation?'Domain validation exists.':'Add validation before business mutations.','Keep the primary workflow clearer than secondary features.']},
    {id:'architect',name:'Architecture',focus:'structure & maintainability',status:status(architectureScore),summary:graph.edges.length?graph.nodes.length+' files and '+graph.edges.length+' internal relationships mapped.':graph.nodes.length+' files mapped; dependency structure is still shallow.',recommendations:[graph.orphanCount?'Review '+graph.orphanCount+' disconnected file(s).':'File relationships look coherent.','Keep domain logic separate from UI and provider adapters.']},
    {id:'builder',name:'Builder',focus:'implementation depth',status:status(domainScore),summary:'Implementation depth '+domainScore+'/100.',recommendations:[hasValidation?'Validation layer detected.':'Add a validation/domain layer.',hasIntegrations?'Integration/API boundary detected.':'Avoid fake integration buttons; add adapters or mark them unavailable.',hasPersistence?'Persistence detected.':'Add persistence if records must survive refresh.']},
    {id:'taste',name:'UX / Taste',focus:'visual quality & interaction',status:status(uxScore),summary:'Interaction completeness '+uxScore+'/100 across responsive, loading, empty and error states.',recommendations:[!hasResponsive?'Add explicit responsive behavior.':'Responsive behavior detected.',!hasLoading?'Add loading/pending feedback.':'Loading feedback detected.',!hasEmpty?'Design empty states.':'Empty-state language detected.']},
    {id:'domain',name:'Research / Domain',focus:'domain fit & data rules',status:status(domainScore),summary:'Domain coverage '+domainScore+'/100 based on data model, validation and integration boundaries.',recommendations:[hasValidation?'Business input checks are represented.':'Model domain constraints explicitly.','Verify external API contracts before claiming an integration works.','Use realistic seed data and lifecycle states.']},
    {id:'security',name:'Security / Abuse',focus:'attack surface & secrets',status:status(securityScore),summary:'Security/quality audit score '+securityScore+'/100 with '+audit.findings.length+' finding(s).',recommendations:audit.findings.slice(0,3).map(f=>f.severity.toUpperCase()+': '+f.title)},
    {id:'failure',name:'Failure / QA',focus:'regression & failure modes',status:status(failureScore),summary:'Failure handling '+failureScore+'/100.',recommendations:[hasTests?'Tests detected.':'Add tests around the critical user flow.',hasError?'Error handling detected.':'Add recoverable error states.',hasLoading?'Loading feedback detected.':'Prevent duplicate actions while requests are pending.']},
    {id:'legal',name:'Legal / Privacy',focus:'privacy & compliance boundary',status:status(legalPrivacyScore),summary:'Privacy/compliance readiness '+legalPrivacyScore+'/100.',recommendations:[hasSecretsBoundary?'Secret boundary is visible.':'Keep provider credentials server-side.','Collect only data the product actually needs.','Document retention/deletion behavior for user data.']},
    {id:'operations',name:'Operations / Cost',focus:'reliability & operating cost',status:status(operationsScore),summary:'Operational readiness '+operationsScore+'/100.',recommendations:[hasPersistence?'Durable/local persistence is represented.':'Define persistence/recovery.',hasIntegrations?'External dependencies are explicit.':'List optional vs required dependencies.','Prefer bounded retries/timeouts over endless polling.']},
    {id:'counter',name:"Devil's Advocate",focus:'countercase & hidden failure',status:status(counterScore),summary:'Counter-case resilience '+counterScore+'/100.',recommendations:['Assume the main API is offline and verify the app still explains what failed.',hasValidation?'Invalid input has a defensive layer.':'Try malformed/empty/extreme input.',hasTests?'Use tests as backpressure before ship.':'Do not call the build complete without verification.']}
  ];
  const scores=[productScore,architectureScore,domainScore,uxScore,domainScore,securityScore,failureScore,legalPrivacyScore,operationsScore,counterScore];
  const score=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  const consensus=[
    audit.findings.some(f=>f.severity==='critical'||f.severity==='high')?'Resolve high-risk security findings before deploy.':'No blocking high-risk pattern detected by the local static gate.',
    hasTests?'Tests exist; keep them in the ship gate.':'Testing is a clear remaining quality gap.',
    hasValidation?'Input/domain validation is present.':'Validation is required before treating the app as production-ready.',
    hasIntegrations?'Integration boundaries exist; verify credentials and live contracts separately.':'No external integration boundary detected.',
    graph.orphanCount>2?'Consolidate disconnected files or make their role explicit.':'Project structure is compact enough for agent context.'
  ];
  return {score,members,consensus};
}
