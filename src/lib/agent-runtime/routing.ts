import type { AgentPlan, PredictAgentId } from './types';

export function extractCnj(text:string){
  const m=String(text||'').match(/\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/);
  if(!m)return null;
  const d=m[0].replace(/\D/g,'');
  if(d.length!==20)return null;
  return d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13)+'.'+d.slice(13,14)+'.'+d.slice(14,16)+'.'+d.slice(16);
}

export function planTask(prompt:string):AgentPlan{
  const q=String(prompt||'').toLowerCase();
  const cnj=extractCnj(prompt);
  let route:PredictAgentId='predict-orchestrator';
  let reason='pedido geral';
  if(cnj||/datajud|djen|tribunal|processo judicial|publica[cç][aã]o/.test(q)){route='scanner-processual';reason=cnj?'CNJ detectado':'consulta processual detectada'}
  else if(/peti[cç][aã]o|recurso|contesta[cç][aã]o|estrat[eé]gia jur[ií]dica|ajuizar/.test(q)){route='legal-review';reason='análise jurídica/contenciosa'}
  else if(/erro|falhou|timeout|403|429|500|bug|exception/.test(q)){route='error-recovery';reason='falha detectada'}
  else if(/teste|e2e|regress[aã]o|qa|smoke|validar build/.test(q)){route='qa';reason='validação detectada'}
  else if(/repo|reposit[oó]rio|c[oó]digo|arquitetura|refator|depend[eê]ncia/.test(q)){route='codebase-investigator';reason='investigação de código'}
  else if(/imagem|v[ií]deo|storyboard|cinema|render|media/.test(q)){route='media';reason='tarefa multimídia'}
  else if(/pdf|documento|contrato|anexo|autos/.test(q)){route='document';reason='documento'}
  else if(/pesquis|fonte|web|jurisprud/.test(q)){route='research';reason='pesquisa'}

  const human=/protocol|ajuizar|assinar|peticionar|pagar|acordo|desistir/.test(q);
  const council=human||/council|x10|red.?team|risco|estrat[eé]gia|auditar/.test(q);
  const tools:Record<PredictAgentId,string[]>={
    'predict-orchestrator':['recall','route','prompt-os','verify'],
    'scanner-processual':['datajud','djen','official-portal','normalize','recover'],
    'legal-review':['facts','evidence','legal-lenses','council-x10'],
    'research':['search','cross-check','sources'],
    'document':['extract','ground','cite'],
    'codebase-investigator':['rules','dependency-map','hot-files','patch-plan'],
    'error-recovery':['classify-error','retry','fallback'],
    'qa':['typecheck','build','security','e2e'],
    'self-improve':['collect-feedback','cluster','patch','eval','pr'],
    'media':['prompt','generate','review','motion','export']
  };
  return {route,reason,tools:tools[route],risk:human?'high':route==='scanner-processual'||route==='error-recovery'?'medium':'low',requiresCouncil:council,requiresHumanGate:human};
}
