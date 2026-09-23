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
