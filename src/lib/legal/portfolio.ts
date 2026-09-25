import type {LegalProcessBundle} from './types';

export type LegalRisk='low'|'medium'|'high'|'critical';
export type LegalPortfolioStatus='active'|'attention'|'silent'|'closed'|'unknown';

export interface LegalPortfolioTask{
  id:string;
  title:string;
  done:boolean;
  dueAt?:string;
  createdAt:string;
}

export interface LegalPortfolioMeta{
  client?:string;
  owner?:string;
  priority?:'low'|'medium'|'high';
  nextReturn?:string;
  lastReturn?:string;
  notes?:string;
  monitored?:boolean;
  tasks?:LegalPortfolioTask[];
  updatedAt?:string;
}

export interface LegalPortfolioCase{
  processNumber:string;
  digits:string;
  tribunal:string;
  degree?:string;
  className?:string;
  subject?:string;
  court?:string;
  municipality?:string;
  filedAt?:string;
  lastUpdate?:string;
  latestMovement?:string;
  latestMovementAt?:string;
  movementCount:number;
  djenCount:number;
  confidentiality?:number;
  daysSilent:number|null;
  risk:LegalRisk;
  status:LegalPortfolioStatus;
  source:'DataJud'|'DataJud+DJEN'|'DJEN'|'Local';
  meta:LegalPortfolioMeta;
  bundle?:LegalProcessBundle;
  snapshotKey:string;
}

function dateMs(value?:string){
  if(!value)return 0;
  const ms=new Date(value).getTime();
  return Number.isFinite(ms)?ms:0;
}

export function daysSince(value?:string,now=Date.now()){
  const ms=dateMs(value);
  return ms?Math.max(0,Math.floor((now-ms)/86400000)):null;
}

export function legalAttentionText(item:LegalPortfolioCase){
  if(item.meta.nextReturn){
    const due=new Date(item.meta.nextReturn).getTime();
    if(Number.isFinite(due)&&due<Date.now())return 'Retorno vencido';
  }
  if(item.risk==='critical')return 'Risco crítico';
  if(item.djenCount>0)return 'Publicação DJEN';
  if((item.daysSilent||0)>=45)return 'Sem andamento +45d';
  return 'Em acompanhamento';
}

export function riskFromSignals(input:{daysSilent:number|null;djenCount?:number;latestMovement?:string;status?:string;nextReturn?:string}):LegalRisk{
  const corpus=(input.latestMovement||'')+' '+(input.status||'');
  const due=input.nextReturn?new Date(input.nextReturn).getTime():0;
  if((due&&due<Date.now())||/penhora|bloque|liminar|senten|tr[aâ]nsito|extin|prazo/i.test(corpus))return 'critical';
  if((input.djenCount||0)>0||(input.daysSilent||0)>=180)return 'high';
  if((input.daysSilent||0)>=45)return 'medium';
  return 'low';
}

export function statusFromSignals(days:number|null,latest=''):LegalPortfolioStatus{
  if(/baix|arquiv|extin|tr[aâ]nsito em julgado/i.test(latest))return 'closed';
  if(days!==null&&days>=45)return 'silent';
  if(/senten|decis|despacho|intima|prazo|penhora|bloque|liminar/i.test(latest))return 'attention';
  return latest?'active':'unknown';
}

export function portfolioFromBundle(bundle:LegalProcessBundle,meta:LegalPortfolioMeta={}):LegalPortfolioCase{
  const latest=bundle.timeline?.[0];
  const lastAt=latest?.date||bundle.datajud.lastUpdate;
  const days=daysSince(lastAt);
  const status=statusFromSignals(days,latest?.title||bundle.summary.status);
  const risk=riskFromSignals({
    daysSilent:days,
    djenCount:bundle.djen.count,
    latestMovement:latest?.title,
    status:bundle.summary.status,
    nextReturn:meta.nextReturn
  });
  return {
    processNumber:bundle.processNumber,
    digits:bundle.digits,
    tribunal:bundle.tribunalLabel,
    degree:bundle.datajud.degree,
    className:bundle.datajud.class?.name,
    subject:bundle.datajud.subjects?.[0]?.name,
    court:bundle.datajud.court?.name,
    filedAt:bundle.datajud.filedAt,
    lastUpdate:bundle.datajud.lastUpdate,
    latestMovement:latest?.title,
    latestMovementAt:lastAt,
    movementCount:bundle.summary.movementCount,
    djenCount:bundle.summary.publicationCount,
    confidentiality:bundle.datajud.confidentiality,
    daysSilent:days,
    risk,status,
    source:bundle.djen.ok?'DataJud+DJEN':'DataJud',
    meta,
    bundle,
    snapshotKey:[bundle.digits,bundle.datajud.lastUpdate||'',bundle.summary.movementCount,bundle.summary.publicationCount].join(':')
  };
}
