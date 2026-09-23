'use client';

export type ExperienceSource='local-model'|'native-model'|'build'|'feedback';

export interface AdaptiveExperience{
  id:string;
  prompt:string;
  answer:string;
  terms:string[];
  source:ExperienceSource;
  confidence:number;
  uses:number;
  createdAt:number;
  updatedAt:number;
}

const KEY='predictlm-adaptive-memory-v1';
const LIMIT=120;

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
}
function terms(text:string){
  const stop=new Set(['para','como','uma','umas','uns','que','isso','essa','esse','the','and','with','from','this','that','you','your','app','predictlm']);
  const out=normalize(text).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!stop.has(x));
  return Array.from(new Set(out)).slice(0,60);
}
function hash(text:string){
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function safeToStore(text:string){
  const s=String(text||'');
  if(!s.trim())return false;
  if(/(?:api[_-]?key|secret|token|password|senha)\s*[:=]\s*\S+/i.test(s))return false;
  if(/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(s))return false;
  return true;
}
function load():AdaptiveExperience[]{
  if(typeof window==='undefined')return [];
  try{
    const raw=localStorage.getItem(KEY);
    const parsed=raw?JSON.parse(raw):[];
    return Array.isArray(parsed)?parsed:[];
  }catch{return []}
}
function save(rows:AdaptiveExperience[]){
  if(typeof window==='undefined')return;
  try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,LIMIT)))}catch{}
}
function similarity(queryTerms:string[],row:AdaptiveExperience){
  if(!queryTerms.length||!row.terms.length)return 0;
  const set=new Set(row.terms);
  let overlap=0;
  for(const t of queryTerms)if(set.has(t))overlap++;
  return overlap/Math.max(3,Math.min(queryTerms.length,row.terms.length));
}

export function captureAdaptiveExperience(prompt:string,answer:string,source:ExperienceSource='local-model'){
  if(typeof window==='undefined'||!safeToStore(prompt)||!safeToStore(answer))return;
  const p=String(prompt).trim().slice(0,1200);
  const a=String(answer).trim().slice(0,2200);
  if(a.length<40)return;

  const now=Date.now();
  const id=hash(normalize(p)+'|'+normalize(a.slice(0,700)));
  const rows=load();
  const existing=rows.find(x=>x.id===id);
  if(existing){
    existing.uses+=1;
    existing.updatedAt=now;
    existing.confidence=Math.min(.86,existing.confidence+.04);
    save(rows.sort((x,y)=>y.updatedAt-x.updatedAt));
    return;
  }
  rows.unshift({
    id,prompt:p,answer:a,terms:terms(p+' '+a),
    source,confidence:source==='feedback'?.78:.48,uses:1,createdAt:now,updatedAt:now
  });
  save(rows.sort((x,y)=>(y.confidence-y.confidence)||(y.updatedAt-x.updatedAt)));
}

export function adaptiveContext(query:string,limit=4){
  const q=terms(query);
  const now=Date.now();
  return load()
    .map(row=>{
      const ageDays=Math.max(0,(now-row.updatedAt)/86400000);
      const score=similarity(q,row)*2.2+row.confidence+Math.min(.3,row.uses*.03)-Math.min(.25,ageDays*.003);
      return {row,score};
    })
    .filter(x=>x.score>=.72)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit)
    .map(x=>'Experiência local relevante:\nPedido: '+x.row.prompt.slice(0,420)+'\nResultado útil: '+x.row.answer.slice(0,900))
    .join('\n\n');
}

export function rateAdaptiveAnswer(answer:string,positive:boolean){
  if(typeof window==='undefined'||!answer.trim())return;
  const needle=normalize(answer).slice(0,500);
  const rows=load();
  let touched=false;
  for(const row of rows){
    const candidate=normalize(row.answer).slice(0,500);
    const same=hash(candidate)===hash(needle)||candidate===needle;
    if(!same)continue;
    touched=true;
    row.updatedAt=Date.now();
    row.confidence=positive?Math.min(.98,row.confidence+.24):Math.max(0,row.confidence-.45);
    row.uses+=positive?1:0;
  }
  save(rows.filter(x=>x.confidence>.12).sort((a,b)=>b.updatedAt-a.updatedAt));
  return touched;
}

export function adaptiveMemoryStats(){
  const rows=load();
  return {
    count:rows.length,
    trusted:rows.filter(x=>x.confidence>=.7).length,
    lastUpdated:rows[0]?.updatedAt||null
  };
}
