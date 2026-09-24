import type { WorkspaceFile } from './types';

export type BuildReviewSeverity='blocker'|'high'|'medium'|'low';

export interface BuildReviewFinding{
  severity:BuildReviewSeverity;
  path:string;
  title:string;
  detail:string;
}

export interface BuildDiffReview{
  ok:boolean;
  blocking:boolean;
  score:number;
  changedPaths:string[];
  findings:BuildReviewFinding[];
}

const GENERATED_NOISE=/(^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|dist|build|coverage)(?:$|\/)/i;
const SOURCE_CODE=/\.(?:tsx?|jsx?|mjs|cjs|css|html)$/i;

function changedFiles(before:WorkspaceFile[],after:WorkspaceFile[]){
  const previous=new Map(before.map(file=>[file.path,file.content]));
  return after.filter(file=>previous.get(file.path)!==file.content);
}

function add(findings:BuildReviewFinding[],severity:BuildReviewSeverity,path:string,title:string,detail:string){
  if(!findings.some(x=>x.severity===severity&&x.path===path&&x.title===title)){
    findings.push({severity,path,title,detail});
  }
}

export function runBuildDiffReview(before:WorkspaceFile[],after:WorkspaceFile[]):BuildDiffReview{
  const changed=changedFiles(before,after).filter(file=>!GENERATED_NOISE.test(file.path));
  const findings:BuildReviewFinding[]=[];

  for(const file of changed){
    const path=file.path;
    const text=String(file.content||'');
    const isSource=SOURCE_CODE.test(path);
    const isExample=/\.env\.example$/i.test(path);

    if(!isExample&&/\b(?:sk-[A-Za-z0-9_-]{16,}|gsk_[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,}|sk-or-v1-[A-Za-z0-9_-]{12,})\b/.test(text)){
      add(findings,'blocker',path,'Hard-coded credential','A provider/token-shaped secret appears in a changed file. Remove it and use a server-side environment variable.');
    }

    if(isSource&&/\bVITE_(?:GEMINI|OPENAI|GROQ|OPENROUTER|[^\s"'=]*(?:SECRET|TOKEN|API_KEY))\b/.test(text)){
      add(findings,'high',path,'Provider secret exposed to browser','VITE_* values are bundled into the client. Provider API keys/tokens must stay behind a server route.');
    }

    if(isSource&&/dangerouslySetInnerHTML\s*=/.test(text)&&!/sanitize|dompurify|trustedhtml/i.test(text)){
      add(findings,'high',path,'Unsafe HTML rendering','dangerouslySetInnerHTML is used without an obvious sanitization boundary.');
    }

    if(isSource&&/localStorage[^\n]{0,120}(?:password|passwd|secret|token|api[_-]?key)/i.test(text)){
      add(findings,'high',path,'Sensitive data in localStorage','Do not persist passwords, provider secrets or long-lived access tokens in browser storage.');
    }

    if(isSource&&/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(text)){
      add(findings,'medium',path,'Swallowed exception','An empty catch hides a real failure. Surface, log or deliberately classify the error.');
    }

    if(isSource&&/\b(?:TODO|FIXME|HACK)\b/.test(text)){
      add(findings,'medium',path,'Unresolved implementation marker','A changed source file still contains TODO/FIXME/HACK markers.');
    }

    if(isSource&&/alert\s*\(\s*['"`][^'"`]*(?:todo|coming soon|em breve|not implemented|placeholder)/i.test(text)){
      add(findings,'medium',path,'Placeholder interaction','A visible action is still represented by a placeholder alert rather than real behavior.');
    }

    if(isSource&&/Authorization\s*[:=][^\n]{0,120}(?:VITE_|import\.meta\.env)/i.test(text)){
      add(findings,'high',path,'Client-side authorization secret','A browser-visible environment value is used to construct an Authorization header.');
    }
  }

  const changedCode=changed.some(file=>SOURCE_CODE.test(file.path));
  const hasTests=after.some(file=>/(?:^|\/)(?:__tests__\/|.*\.(?:test|spec)\.[jt]sx?$)/i.test(file.path));
  if(changedCode&&!hasTests){
    add(findings,'medium','(project)','Changed code has no tests','At least one source file changed but the project contains no test/spec file.');
  }

  const penalty=findings.reduce((sum,finding)=>sum+(
    finding.severity==='blocker'?35:
    finding.severity==='high'?22:
    finding.severity==='medium'?8:3
  ),0);
  const score=Math.max(0,100-penalty);
  const blocking=findings.some(x=>x.severity==='blocker'||x.severity==='high');
  return {
    ok:!blocking&&score>=75,
    blocking,
    score,
    changedPaths:changed.map(file=>file.path),
    findings
  };
}

export function formatBuildReview(review:BuildDiffReview){
  if(!review.findings.length)return 'No deterministic diff-review findings.';
  return review.findings
    .map(x=>x.severity.toUpperCase()+' · '+x.path+' · '+x.title+': '+x.detail)
    .join('\n');
}
