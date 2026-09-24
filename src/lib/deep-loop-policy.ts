export type DeepLoopRisk='normal'|'complex'|'high';

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export function deepLoopRisk(prompt:string):DeepLoopRisk{
  const p=normalize(prompt);
  if(/\b(juridic|legal|seguranc|security|fraud|fraude|migrac|migration|arquitet|architecture|producao|production|deploy|auth|permiss|privacidade|privacy|pagamento|financeir|processo|contrato)\b/.test(p))return 'high';
  if(/\b(compare|comparar|debug|corrigir|otimiz|optimiz|refator|refactor|estrateg|strategy|planej|plan|analise|análise|investig|pesquis|research|codigo|código|app|sistema)\b/.test(p))return 'complex';
  return 'normal';
}

export function deepLoopContext(prompt:string){
  const risk=deepLoopRisk(prompt);
  const budget=risk==='high'?3:risk==='complex'?2:1;
  return [
    'DEEP LOOP POLICY',
    'Risk: '+risk+'. Iteration budget: '+budget+'.',
    'Use the smallest number of internal passes that materially improves the answer.',
    'Each pass must find a concrete missing fact, contradiction, failure mode or implementation defect.',
    'Stop early when a new pass adds no concrete correction.',
    'Do not expose private chain-of-thought; return only the final concise result and necessary evidence.',
    'If a revision is worse, less grounded or less relevant than the previous candidate, rollback to the better candidate.',
    risk==='high'
      ? 'High-risk gate: verify assumptions, evidence/provenance, destructive effects, permissions, rollback and residual risk before finalizing.'
      : 'Verify relevance and the requested deliverable before finalizing.'
  ].join('\n');
}
