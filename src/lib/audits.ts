import type { WorkspaceFile } from './types';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export interface AuditFinding {
  id: string;
  severity: FindingSeverity;
  category: 'security' | 'quality' | 'accessibility' | 'testing' | 'performance';
  title: string;
  detail: string;
  path?: string;
}
export interface AuditReport {
  score: number;
  findings: AuditFinding[];
  counts: Record<FindingSeverity, number>;
}

const severityCost: Record<FindingSeverity, number> = { critical: 30, high: 18, medium: 9, low: 4, info: 0 };

export function auditProject(files: WorkspaceFile[]): AuditReport {
  const findings: AuditFinding[] = [];
  const codeFiles = files.filter(f => /\.(tsx?|jsx?|mjs|cjs)$/.test(f.path));
  const add = (finding: AuditFinding) => {
    if (!findings.some(f => f.id === finding.id && f.path === finding.path)) findings.push(finding);
  };

  for (const file of files) {
    const c = file.content || '';
    const safeEnv = c.replace(/process\.env\.[A-Z0-9_]+/g, 'ENV_VALUE').replace(/import\.meta\.env\.[A-Z0-9_]+/g, 'ENV_VALUE');

    if (/(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|fc-[A-Za-z0-9_-]{12,})/.test(safeEnv)) {
      add({id:'hardcoded-secret',severity:'critical',category:'security',title:'Possible hardcoded credential',detail:'Move credentials to server-side environment variables and rotate exposed values.',path:file.path});
    }
    if (/(?:api[_-]?key|client[_-]?secret|password|access[_-]?token)\s*[:=]\s*['"`][^'"`]{8,}['"`]/i.test(safeEnv)) {
      add({id:'credential-assignment',severity:'high',category:'security',title:'Credential-like value in source',detail:'Avoid embedding secrets in generated source or client bundles.',path:file.path});
    }
    if (/localStorage\.(?:setItem|getItem)\s*\(\s*['"`](?:token|jwt|session|auth)/i.test(c)) {
      add({id:'token-localstorage',severity:'high',category:'security',title:'Auth token stored in localStorage',detail:'Prefer secure, HttpOnly, SameSite cookies for authentication tokens.',path:file.path});
    }
    if (/dangerouslySetInnerHTML/.test(c)) {
      add({id:'unsafe-html',severity:'high',category:'security',title:'Unsafe HTML rendering surface',detail:'Sanitize untrusted HTML and avoid dangerouslySetInnerHTML where possible.',path:file.path});
    }
    if (/\beval\s*\(|new\s+Function\s*\(/.test(c)) {
      add({id:'dynamic-code',severity:'high',category:'security',title:'Dynamic code execution',detail:'eval/new Function can enable code injection. Replace with explicit parsing/execution.',path:file.path});
    }
    if (/fetch\s*\(\s*['"`]http:\/\//.test(c)) {
      add({id:'insecure-http',severity:'medium',category:'security',title:'Insecure HTTP request',detail:'Use HTTPS for remote requests.',path:file.path});
    }
    if (/target=['"]_blank['"]/.test(c) && !/rel=['"][^'"]*noopener/.test(c)) {
      add({id:'blank-noopener',severity:'medium',category:'security',title:'External tab without noopener',detail:'Add rel="noopener noreferrer" to target="_blank" links.',path:file.path});
    }
    if (/\$queryRawUnsafe|\$executeRawUnsafe/.test(c)) {
      add({id:'unsafe-query',severity:'critical',category:'security',title:'Potential unsafe database query',detail:'Use parameterized queries and validated input.',path:file.path});
    }
    if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(c)) {
      add({id:'img-alt',severity:'low',category:'accessibility',title:'Image without alt text',detail:'Add useful alt text or alt="" for decorative images.',path:file.path});
    }
    if (/setInterval\s*\(/.test(c) && !/clearInterval\s*\(/.test(c)) {
      add({id:'interval-cleanup',severity:'low',category:'performance',title:'Interval may not be cleaned up',detail:'Clean intervals in effect teardown to avoid leaks.',path:file.path});
    }
  }

  const hasTests = files.some(f => /(?:\.test\.|\.spec\.|\/tests?\/|__tests__)/i.test(f.path));
  if (codeFiles.length >= 3 && !hasTests) {
    add({id:'no-tests',severity:'medium',category:'testing',title:'No tests detected',detail:'Add at least smoke tests for critical flows and generated components.'});
  }
  if (!files.some(f => /README\.md$/i.test(f.path))) {
    add({id:'no-readme',severity:'low',category:'quality',title:'Project documentation missing',detail:'Add a README with setup, architecture and known constraints.'});
  }

  const counts = { critical:0, high:0, medium:0, low:0, info:0 } as Record<FindingSeverity, number>;
  for (const f of findings) counts[f.severity]++;
  const penalty = findings.reduce((sum,f)=>sum+severityCost[f.severity],0);
  return { score: Math.max(0, 100 - penalty), findings, counts };
}
