export type ResearchDepth='fast'|'balanced'|'comprehensive';

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

function unique(values:string[]){
  const seen=new Set<string>();
  return values.filter(value=>{
    const key=normalize(value);
    if(!key||seen.has(key))return false;
    seen.add(key);return true;
  });
}

export function inferResearchDepth(query:string):ResearchDepth{
  const q=normalize(query);
  if(/\b(completo|comprehensive|aprofund|deep research|investigue|dossie|dossiê|relatorio detalhado|relatório detalhado|compare fontes|estado da arte)\b/.test(q))return 'comprehensive';
  if(/\b(rapido|rápido|resumo|quick|breve)\b/.test(q))return 'fast';
  return 'balanced';
}

export function planResearchQueries(query:string,depth:ResearchDepth='balanced'){
  const q=String(query||'').trim();
  const nq=normalize(q);
  const planned=[q];

  if(depth!=='fast'){
    planned.push(q+' fonte oficial evidências');
    planned.push(q+' limitações críticas contra-argumentos');
  }
  if(depth==='comprehensive'){
    planned.push(q+' estudos dados metodologia');
    planned.push(q+' comparação alternativas');
  }

  const science=/\b(ciencia|ciência|fisica|física|astronomia|universo|quantum|quântico|quimica|química|biologia|evolucao|evolução|espaco|espaço)\b/.test(nq);
  if(science)planned.push(q+' site:youtube.com/@CienciaTodoDia');

  const learning=/\b(aprender|curso|aula|estudar|treinamento|tutorial|certificacao|certificação|carreira|skill|habilidade)\b/.test(nq);
  if(learning)planned.push(q+' site:linkedin.com/learning');

  const max=depth==='fast'?1:depth==='balanced'?4:6;
  return unique(planned).slice(0,max);
}

export function researchConcurrency(depth:ResearchDepth){
  return depth==='fast'?1:depth==='balanced'?2:3;
}

export function researchSourceBudget(depth:ResearchDepth){
  return depth==='fast'?6:depth==='balanced'?10:14;
}
