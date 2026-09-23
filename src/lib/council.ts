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
  const uxScore=[hasResponsive,hasLoading,hasEmpty,hasError].filter(Boolean).length*20+20;
  const qaScore=hasTests?92:58;
  const humanScore=Math.max(55,96-genericCopy*10);

  const members:CouncilMemberReport[]=[
    {id:'architect',name:'Architect',focus:'structure & maintainability',status:status(architectureScore),summary:graph.edges.length?graph.nodes.length+' files and '+graph.edges.length+' internal relationships mapped.':graph.nodes.length+' files mapped; dependency structure is still shallow.',recommendations:[graph.orphanCount?'Review '+graph.orphanCount+' disconnected file(s).':'File relationships look coherent.','Keep domain logic separate from UI and provider adapters.']},
    {id:'security',name:'Security',focus:'vibe-security gate',status:status(securityScore),summary:'Security/quality audit score '+securityScore+'/100 with '+audit.findings.length+' finding(s).',recommendations:audit.findings.slice(0,3).map(f=>f.severity.toUpperCase()+': '+f.title)},
    {id:'taste',name:'Taste',focus:'visual quality & interaction',status:status(uxScore),summary:'Interaction completeness '+uxScore+'/100 across responsive, loading, empty and error states.',recommendations:[!hasResponsive?'Add explicit responsive behavior.':'Responsive behavior detected.',!hasLoading?'Add loading/pending feedback.':'Loading feedback detected.',!hasEmpty?'Design empty states.':'Empty-state language detected.']},
    {id:'qa',name:'QA',focus:'tests & reproducibility',status:status(qaScore),summary:hasTests?'Tests were detected in the workspace.':'No test files detected in the current workspace.',recommendations:[hasTests?'Keep smoke tests tied to critical user flows.':'Add smoke tests before shipping generated apps.','Preserve deterministic build validation in CI.']},
    {id:'humanizer',name:'Humanizer',focus:'copy & clarity',status:status(humanScore),summary:genericCopy?'Detected '+genericCopy+' generic marketing phrase(s).':'Copy avoids the most common generic AI marketing phrases.',recommendations:[genericCopy?'Replace generic claims with concrete outcomes and evidence.':'Keep labels concise and concrete.','Prefer user language over agent jargon in product-facing copy.']}
  ];
  const score=Math.round((securityScore+architectureScore+uxScore+qaScore+humanScore)/5);
  const consensus=[
    audit.findings.some(f=>f.severity==='critical'||f.severity==='high')?'Resolve high-risk security findings before deploy.':'No blocking high-risk pattern detected by the local static gate.',
    hasTests?'Tests exist; keep them in the ship gate.':'Testing is the clearest remaining quality gap.',
    graph.orphanCount>2?'Consolidate disconnected files or make their role explicit.':'Project structure is compact enough for agent context.'
  ];
  return {score,members,consensus};
}
