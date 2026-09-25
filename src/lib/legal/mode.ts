export type LegalDossierMode='standard'|'aggressive';

const normalize=(text:string)=>String(text||'')
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{M}/gu,'')
  .replace(/\s+/g,' ')
  .trim();

export function isLegalDossierRequest(prompt:string){
  const p=normalize(prompt);
  return /\b(dossie|relatorio processual|relatorio do processo|relatorio de processo)\b/.test(p);
}

export function isAggressiveLegalRequest(prompt:string){
  const p=normalize(prompt);
  return /\b(ataque|atacar|malicia|lado ruim|war room|pressure[- ]?test|stress[- ]?test|red[- ]?team|aegis total|destrua|destroi|destruir|fode|foder)\b/.test(p);
}

export function legalDossierMode(prompt:string):LegalDossierMode{
  return isAggressiveLegalRequest(prompt)?'aggressive':'standard';
}
