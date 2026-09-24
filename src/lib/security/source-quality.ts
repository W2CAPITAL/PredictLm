export type SourceTier='official'|'academic'|'primary'|'investigative'|'established'|'community'|'unknown'|'threat-reference';

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

const THREAT_HOSTS=new Set([
  'darkforums.as',
  'watchpeopledie.tv'
]);

const INVESTIGATIVE_HOSTS=new Set([
  'analyzer.vecert.io'
]);

const LOW_EVIDENCE_HOSTS=new Set([
  'tiktok.com','youtube.com','youtu.be','etsy.com','dreamina.capcut.com','pinterest.com'
]);

const OFFICIAL_SUFFIXES=['.gov.br','.jus.br','.gov'];
const OFFICIAL_HOSTS=new Set([
  'gov.br','bcb.gov.br','cvm.gov.br','cnj.jus.br','stj.jus.br','stf.jus.br',
  'cert.br','nic.br','receita.economia.gov.br','planalto.gov.br',
  'nhtsa.gov','unece.org','eur-lex.europa.eu','nasa.gov','earthdata.nasa.gov','gibs.earthdata.nasa.gov','api.bcb.gov.br',
  'ibge.gov.br','clinicaltrials.gov'
]);
const ACADEMIC_HOSTS=new Set([
  'arxiv.org','doi.org','dl.acm.org','ieeexplore.ieee.org','springer.com','nature.com','sciencedirect.com',
  'sae.org','iso.org','openalex.org','api.openalex.org','semanticscholar.org','api.semanticscholar.org',
  'pubmed.ncbi.nlm.nih.gov','ncbi.nlm.nih.gov','pmc.ncbi.nlm.nih.gov','cochranelibrary.com','scielo.br','redalyc.org','doaj.org'
]);
const PRIMARY_HOSTS=new Set([
  'vercel.com','docs.vercel.com','api.vercel.com','github.com','api.spacexdata.com','market.ft.tech','ftai.chat'
]);
const ESTABLISHED_HOSTS=new Set([
  'wikipedia.org','pt.wikipedia.org','reuters.com','apnews.com','bbc.com','bbc.co.uk','poynter.org','bndigital.bn.gov.br',
  'millerwelds.com','lincolnelectric.com','thefabricator.com'
]);

export function sourceHost(url:string){
  try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'')}catch{return ''}
}

export function sourceQuality(url:string,source?:string):SourceQuality{
  const raw=String(url||'').toLowerCase();
  const host=sourceHost(url);
  const reasons:string[]=[];

  if(THREAT_REPOS.some(x=>raw.includes(x))||THREAT_HOSTS.has(host)){
    return {score:18,tier:'threat-reference',reasons:['fonte adversarial/extrema mantida apenas para threat-model e sinais defensivos; conteúdo bruto não comprova fatos e não deve fornecer PII, credenciais ou mídia gráfica ao modelo']};
  }

  if(LOW_EVIDENCE_HOSTS.has(host)){
    reasons.push('fonte social/comercial útil apenas como exemplo ou pista; não deve superar documentação técnica, fonte oficial ou literatura especializada');
    return {score:34,tier:'community',reasons};
  }

  if(INVESTIGATIVE_HOSTS.has(host)){
    reasons.push('fonte de threat intelligence/investigação; útil como lead e contexto, exige corroboração oficial ou independente');
    return {score:72,tier:'investigative',reasons};
  }

  if(OFFICIAL_HOSTS.has(host)||OFFICIAL_SUFFIXES.some(s=>host.endsWith(s))){
    reasons.push('domínio oficial/institucional');
    return {score:100,tier:'official',reasons};
  }

  if(ACADEMIC_HOSTS.has(host)||host.endsWith('.edu')||host.endsWith('.edu.br')){
    reasons.push('fonte acadêmica/técnica');
    return {score:90,tier:'academic',reasons};
  }

  if(PRIMARY_HOSTS.has(host)){
    reasons.push(host==='github.com'?'fonte primária para o próprio software/repositório, não para fatos externos':'fonte primária do serviço/produto');
    return {score:78,tier:'primary',reasons};
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

export function isThreatReferenceUrl(url:string){
  const raw=String(url||'').toLowerCase();
  const host=sourceHost(url);
  return THREAT_HOSTS.has(host)||THREAT_REPOS.some(x=>raw.includes(x));
}

export function suppressRawResearchContent(url:string){
  const host=sourceHost(url);
  return host==='watchpeopledie.tv'||host==='darkforums.as';
}

export function isSensitiveResearchQuery(query:string){
  const q=String(query||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  return /\b(fraude|fraud|golpe|phishing|scam|lavagem|money laundering|crime|criminos|malware|ransomware|roubo|furto|otp|pix|banco|processo|juridic|tribunal|seguranca|security|vulnerab|amea[cç]a|threat|abuso|assedi|manipul|coerc|doxx|vazamento|leak|breach|dark web|darkweb)\b/.test(q);
}

export function qualityLabel(score:number){
  if(score>=90)return 'forte';
  if(score>=70)return 'boa';
  if(score>=55)return 'média';
  return 'fraca';
}
