export type ChatTrustIssue=
  |''
  |'raw-external-payload'
  |'debug-log'
  |'internal-meta'
  |'malformed-structured-output';

const EXTERNAL_PAYLOAD_MARKERS=[
  /"heat_shield"s*:/i,
  /"payload_weights?"s*:/i,
  /"payload_mass(?:_kg|_lb)?"s*:/i,
  /"trunk"s*:s*{/i,
  /"trunk_volume"s*:/i,
  /"flickr_images"s*:/i,
  /"first_flight"s*:/i,
  /"height_w_trunk"s*:/i,
  /"diameter"s*:s*{[^}]*"meters"/i,
  /"launch_payload_mass"s*:/i,
  /"dry_mass_kg"s*:/i,
  /"type"s*:s*"Dragon/i,
  /api.spacexdata.com/i
];

const DEBUG_MARKERS=[
  /successs+responses+codes*:s*2dds*ok/i,
  /(?:^|
)s*contents+examples*:/i,
  /(?:^|
)s*(?:debug|trace|stderr|stdout|request id|response headers?)s*[:=-]/i,
  /(?:^|
)s*http/d(?:.d)?s+d{3}/i,
  /(?:^|
)s*(?:502|503|504)s+(?:bad gateway|service unavailable|gateway timeout)/i
];

const INTERNAL_META_MARKERS=[
  /segunda leitura independente/i,
  /piso pr[aá]tico/i,
  /lacunas antes da resposta final/i,
  /(?:RECALL|FORGE|AEGIS|PARALLAX|CENTUM|PREDICT ROUTER|PROMPT OS)/,
  /(?:provider mesh|FreeLLMAPI respondeu|knowledge fallback|runtime local)/i,
  /respondi diretamente ao pedido atual/i,
  /descartei contexto n[aã]o solicitado/i
];

export function structuredOutputRequested(prompt:string){
  const p=String(prompt||'').toLowerCase();
  return /(json|payload|schema|objeto json|resposta da api|api response|raw response|retorne somente json|retorna somente json)/.test(p);
}

function wholeAnswerParsesAsLargeJson(text:string){
  const value=String(text||'').trim();
  if(!(value.startsWith('{')||value.startsWith('[')))return false;
  if(value.length<120)return false;
  try{
    const parsed=JSON.parse(value);
    if(Array.isArray(parsed))return parsed.length>2;
    if(parsed&&typeof parsed==='object')return Object.keys(parsed).length>=5;
  }catch{}
  return false;
}

export function chatTrustIssue(prompt:string,text:string):ChatTrustIssue{
  const value=String(text||'').trim();
  if(!value)return '';
  if(DEBUG_MARKERS.some(re=>re.test(value)))return'debug-log';
  if(INTERNAL_META_MARKERS.some(re=>re.test(value)))return'internal-meta';
  if(!structuredOutputRequested(prompt)){
    if(EXTERNAL_PAYLOAD_MARKERS.filter(re=>re.test(value)).length>=2)return'raw-external-payload';
    if(wholeAnswerParsesAsLargeJson(value))return'raw-external-payload';
    const fenced=value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
    if(fenced&&wholeAnswerParsesAsLargeJson(fenced))return'raw-external-payload';
  }
  return'';
}

export function sanitizeUntrustedContext(prompt:string,input:string,maxChars=12000){
  let value=String(input||'').replace(/\u0000/g,'').trim();
  if(!value)return'';
  if(chatTrustIssue(prompt,value)==='raw-external-payload')return'';
  value=value
    .split(/\r?\n/)
    .filter(line=>!DEBUG_MARKERS.some(re=>re.test(line))&&!INTERNAL_META_MARKERS.some(re=>re.test(line)))
    .join('\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
  return value.slice(0,maxChars);
}

export function safeHistoryForModel(content:string){
  const value=String(content||'').replace(/\u0000/g,'').trim();
  if(!value)return'';
  const issue=chatTrustIssue('',value);
  if(issue)return'';
  return value.slice(0,5000);
}

export function safeSessionScope(input:unknown){
  const raw=String(input||'').trim();
  if(!raw)return'';
  return raw.replace(/[^a-zA-Z0-9:_-]/g,'').slice(0,120);
}

export function providerEndpointAllowed(base:string,isVercel=Boolean(process.env.VERCEL)){
  try{
    const url=new URL(base);
    if(url.protocol!=='https:'&&url.protocol!=='http:')return false;
    const host=url.hostname.toLowerCase();
    if(!isVercel)return true;
    if(url.protocol!=='https:')return false;
    if(host==='localhost'||host==='0.0.0.0'||host==='::1'||host.endsWith('.local'))return false;
    if(/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^169\.254\./.test(host))return false;
    const private172=host.match(/^172\.(\d{1,2})\./);
    if(private172&&Number(private172[1])>=16&&Number(private172[1])<=31)return false;
    if(host==='metadata.google.internal'||host==='metadata.google')return false;
    return true;
  }catch{return false}
}

export function classifyPublicFailure(error:unknown){
  const text=String((error as any)?.message||error||'').toLowerCase();
  if(/abort|timeout|timed out/.test(text))return'TIMEOUT';
  if(/429|rate.?limit|quota/.test(text))return'RATE_LIMITED';
  if(/401|403|auth|unauthor|forbidden/.test(text))return'UPSTREAM_AUTH';
  if(/502|503|504|fetch failed|network|econn/.test(text))return'UPSTREAM_UNAVAILABLE';
  if(/raw-external-payload|debug-log|internal-meta|off-topic|rejected/.test(text))return'ANSWER_REJECTED';
  return'CHAT_FAILURE';
}

export function publicFailurePayload(correlationId:string,code='CHAT_TEMPORARY_FAILURE'){
  return{
    error:'Não foi possível concluir esta resposta com segurança.',
    message:'Houve um problema técnico ao gerar a resposta. Tente novamente.',
    code,
    correlationId
  };
}
