export type LegalSource='DataJud'|'DJEN'|'e-SAJ TJSP';

export interface LegalMovement {
  date:string;
  code?:number|string;
  name:string;
  details?:string[];
  source:'DataJud'|'e-SAJ TJSP';
}

export interface LegalPublication {
  id:string;
  hash?:string;
  processNumber:string;
  type:string;
  availableAt:string;
  publishedAt?:string;
  recipient?:string;
  courtUnit?:string;
  tribunal?:string;
  text:string;
  certificateUrl?:string;
  source:'DJEN';
}

export interface LegalTimelineItem {
  id:string;
  date:string;
  type:'movement'|'publication';
  title:string;
  body?:string;
  source:LegalSource;
}

export interface LegalLens {
  id:'juridico'|'consumidor'|'financeiro'|'operacional'|'risco';
  title:string;
  level:'info'|'attention'|'high';
  findings:string[];
}

export interface LegalTraceStep {
  id:string;
  label:string;
  status:'done'|'warn'|'error'|'skip';
  detail:string;
  source?:string;
}

export interface LegalPortalResult {
  id:string;
  name:string;
  ok:boolean;
  found:boolean;
  endpoint:string;
  message?:string;
  metadata?:Record<string,string>;
  movements:LegalMovement[];
}

export interface LegalProcessInterpretation {
  confidence:'high'|'medium'|'low';
  posture:'favorable'|'unfavorable'|'mixed'|'neutral'|'unknown';
  postureLabel:string;
  currentState:string;
  whatHappened:string[];
  whyItMatters:string[];
  nextActions:string[];
  evidence:string[];
  inferredPartyRole?:'author'|'defendant'|'unknown';
  inferredPartyName?:string;
}

export interface LegalProcessBundle {
  query:string;
  processNumber:string;
  digits:string;
  validCnj:boolean;
  tribunalAlias:string|null;
  tribunalLabel:string;
  fetchedAt:string;
  datajud:{
    ok:boolean;
    error?:string;
    endpoint?:string;
    found:boolean;
    tribunal?:string;
    degree?:string;
    filedAt?:string;
    lastUpdate?:string;
    confidentiality?:number;
    format?:string;
    system?:string;
    class?:{code?:number|string;name?:string};
    subjects:{code?:number|string;name?:string}[];
    court?:{code?:number|string;name?:string;municipalityCode?:number|string};
    movements:LegalMovement[];
  };
  djen:{
    ok:boolean;
    error?:string;
    endpoint?:string;
    count:number;
    publications:LegalPublication[];
  };
  officialPortals:LegalPortalResult[];
  trace:LegalTraceStep[];
  timeline:LegalTimelineItem[];
  lenses:LegalLens[];
  interpretation:LegalProcessInterpretation;
  summary:{
    headline:string;
    status:string;
    latestEvent?:string;
    latestEventAt?:string;
    publicationCount:number;
    movementCount:number;
    caveats:string[];
    sourceSummary:string;
  };
}


export interface LegalSearchInput{
  tribunal:string;
  size?:number;
  offset?:number;
  processNumber?:string;
  degree?:string;
  classCode?:string|number;
  subjectCode?:string|number;
  municipalityCode?:string|number;
  filedFrom?:string;
  filedTo?:string;
}

export interface LegalSearchCase{
  processNumber:string;
  digits:string;
  tribunal:string;
  degree?:string;
  filedAt?:string;
  lastUpdate?:string;
  class?:{code?:number|string;name?:string};
  subjects:{code?:number|string;name?:string}[];
  court?:{code?:number|string;name?:string;municipalityCode?:number|string};
  format?:string;
  system?:string;
  confidentiality?:number;
  movementCount:number;
  latestMovement?:{date?:string;code?:number|string;name:string;details?:string[]};
}

export interface LegalSearchResult{
  tribunal:string;
  alias:string;
  total:number;
  size:number;
  offset:number;
  fetchedAt:string;
  items:LegalSearchCase[];
  source:'DataJud';
  caveat:string;
}

export interface DjenSearchInput{
  oab?:string;
  uf?:string;
  processNumber?:string;
  from?:string;
  to?:string;
  keyword?:string;
  tribunal?:string;
  page?:number;
  size?:number;
}

export interface DjenSearchResult{
  ok:boolean;
  endpoint:string;
  count:number;
  items:LegalPublication[];
  fetchedAt:string;
  caveat:string;
}
