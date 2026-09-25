export type LegalAttentionLevel='info'|'attention'|'high'|'critical';

export interface LegalTextSignal{
  id:string;
  label:string;
  level:LegalAttentionLevel;
  evidence:string;
}

export interface MentionedDeadline{
  raw:string;
  value:number;
  unit:'dias'|'horas';
  businessDays:boolean;
}

const RULES:Array<{id:string;label:string;level:LegalAttentionLevel;pattern:RegExp}>=[
  {id:'bloqueio',label:'Bloqueio',level:'critical',pattern:/\b(bloqueio|bloquead[oa]|sisbajud|bacenjud)\b/i},
  {id:'penhora',label:'Penhora',level:'critical',pattern:/\b(penhora|penhorad[oa]|arresto)\b/i},
  {id:'liminar',label:'Liminar / tutela',level:'high',pattern:/\b(liminar|tutela de urg[eê]ncia|tutela antecipada)\b/i},
  {id:'leilao',label:'Leilão / praça',level:'high',pattern:/\b(leil[aã]o|pra[cç]a|hasta p[uú]blica)\b/i},
  {id:'sentenca',label:'Sentença',level:'attention',pattern:/\b(sent[ée]n[cç]a|julgado procedente|julgado improcedente)\b/i},
  {id:'acordao',label:'Acórdão',level:'attention',pattern:/\b(ac[oó]rd[aã]o)\b/i},
  {id:'citacao',label:'Citação',level:'attention',pattern:/\b(cita[cç][aã]o|citado|citada)\b/i},
  {id:'audiencia',label:'Audiência',level:'attention',pattern:/\b(audi[eê]ncia|sess[aã]o de julgamento)\b/i},
  {id:'pericia',label:'Perícia',level:'attention',pattern:/\b(per[ií]cia|perito|laudo pericial)\b/i},
  {id:'recurso',label:'Recurso',level:'attention',pattern:/\b(apela[cç][aã]o|agravo|recurso|embargos)\b/i},
  {id:'transito',label:'Trânsito em julgado',level:'high',pattern:/\btr[aâ]nsito em julgado\b/i},
  {id:'extincao',label:'Extinção / baixa',level:'attention',pattern:/\b(extin[cç][aã]o|arquivamento|baixa definitiva)\b/i},
  {id:'prazo',label:'Prazo mencionado',level:'attention',pattern:/\bprazo\b/i}
];

export function scanLegalText(text:string):LegalTextSignal[]{
  const source=String(text||'').replace(/\s+/g,' ').trim();
  if(!source)return [];
  return RULES.filter(rule=>rule.pattern.test(source)).map(rule=>{
    const match=source.match(rule.pattern)?.[0]||rule.label;
    const idx=Math.max(0,source.toLowerCase().indexOf(match.toLowerCase()));
    const start=Math.max(0,idx-80),end=Math.min(source.length,idx+match.length+120);
    return {...rule,evidence:source.slice(start,end).trim()};
  });
}

export function mentionedDeadlines(text:string):MentionedDeadline[]{
  const source=String(text||'');
  const rows=[...source.matchAll(/\b(\d{1,3})\s*(dias?|horas?)(?:\s+(u[úu]teis?))?\b/gi)];
  const out:MentionedDeadline[]=[];
  const seen=new Set<string>();
  for(const row of rows){
    const value=Number(row[1]);
    if(!Number.isFinite(value)||value<=0||value>365)continue;
    const unit=/hora/i.test(row[2])?'horas':'dias';
    const businessDays=Boolean(row[3]);
    const raw=row[0].trim();
    const key=value+'|'+unit+'|'+businessDays;
    if(seen.has(key))continue;
    seen.add(key);
    out.push({raw,value,unit,businessDays});
  }
  return out.slice(0,5);
}

export function strongestLegalSignal(signals:LegalTextSignal[]){
  const rank:Record<LegalAttentionLevel,number>={info:0,attention:1,high:2,critical:3};
  return [...signals].sort((a,b)=>rank[b.level]-rank[a.level])[0]||null;
}

export function legalSignalCorpus(parts:Array<string|undefined|null>){
  return parts.filter(Boolean).join('\n');
}
