export type SourceTier='official'|'academic'|'primary'|'established'|'community'|'unknown'|'threat-reference';

export interface SourceQuality{
  score:number;
  tier:SourceTier;
  reasons:string[];
}

const THREAT_REPOS=[
  'github.com/hunters-sec/opencode',
  'github.com/gaur-avvv/wormxgpt',
  'github.com/tagore1344/crimegpt-ai',
  'github.com/kimik3moonshotai/kimi-k3-code-free-desktop',
  'github.com/chatgpt56freegpt/chatgpt-5.6-free-desktop',
  'github.com/rollermanor1/chatgpt-plus-prime',
  'github.com/lynxannihilate16/bxvdfsur',
  'github.com/techjarves/uncensored-local-ai-multiplatform'
];

const OFFICIAL_SUFFIXES=['.gov.br','.jus.br'];
const OFFICIAL_HOSTS=new Set([
  'gov.br','bcb.gov.br','cvm.gov.br','cnj.jus.br','stj.jus.br','stf.jus.br',
  'cert.br','nic.br','receita.economia.gov.br','planalto.gov.br',
  'nhtsa.gov','unece.org','eur-lex.europa.eu'
]);
const ACADEMIC_HOSTS=new Set([
  'arxiv.org','doi.org','dl.acm.org','ieeexplore.ieee.org','springer.com','nature.com','sciencedirect.com',
  'sae.org','iso.org'
]);
const ESTABLISHED_HOSTS=new Set([
  'wikipedia.org','pt.wikipedia.org','reuters.com','apnews.com','bbc.com','bbc.co.uk'
]);

export function sourceHost(url:string){
  try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'')}catch{return ''}
}

export function sourceQuality(url:string,source?:string):SourceQuality{
  const raw=String(url||'').toLowerCase();
  const host=sourceHost(url);
  const reasons:string[]=[];

  if(THREAT_REPOS.some(x=>raw.includes(x))){
    return {score:18,tier:'threat-reference',reasons:['repositório mantido apenas como referência adversarial/ameaça; não é fonte factual primária']};
  }

  if(OFFICIAL_HOSTS.has(host)||OFFICIAL_SUFFIXES.some(s=>host.endsWith(s))){
    reasons.push('domínio oficial/institucional');
    return {score:100,tier:'official',reasons};
  }

  if(ACADEMIC_HOSTS.has(host)||host.endsWith('.edu')||host.endsWith('.edu.br')){
    reasons.push('fonte acadêmica/técnica');
    return {score:90,tier:'academic',reasons};
  }

  if(host==='github.com'){
    reasons.push('fonte primária para o próprio software/repositório, não para fatos externos');
    return {score:70,tier:'primary',reasons};
  }

  if(ESTABLISHED_HOSTS.has(host)){
    reasons.push('fonte editorial/enciclopédica estabelecida');
    return {score:65,tier:'established',reasons};
  }

  if(/reddit|forum|community|blogspot|medium\.com/.test(host)){
    reasons.push('conteúdo comunitário/opinativo; requer confirmação independente');
    return {score:40,tier:'community',reasons};
  }

  if(source&&/datajud|djen|tribunal|banco central|bacen|cert\.br/i.test(source)){
    reasons.push('origem declarada como fonte institucional');
    return {score:85,tier:'primary',reasons};
  }

  reasons.push('autoridade não verificada');
  return {score:48,tier:'unknown',reasons};
}

export function isSensitiveResearchQuery(query:string){
  const q=String(query||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  return /\b(fraude|fraud|golpe|phishing|scam|lavagem|money laundering|crime|criminos|malware|ransomware|roubo|furto|otp|pix|banco|processo|juridic|tribunal|seguranca|security|vulnerab)\b/.test(q);
}

export function qualityLabel(score:number){
  if(score>=90)return 'forte';
  if(score>=70)return 'boa';
  if(score>=55)return 'média';
  return 'fraca';
}
