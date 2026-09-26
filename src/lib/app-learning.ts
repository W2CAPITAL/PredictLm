import {advanceBioIntelligence,createBioIntelligenceState,fuseBioIntelligence,type BioIntelligenceState,type BioLearningEvent} from './biointelligence-fabric';
import {advanceBrowserDigitalBrainContext} from './digital-brain';

export type AppLearningEvent=BioLearningEvent;

export interface AppLearningLedger{
  version:1;
  total:number;
  failures:number;
  successes:number;
  lastUpdated:number;
  bio:BioIntelligenceState;
  events:Array<{
    at:number;
    surface:string;
    action:string;
    kind:AppLearningEvent['kind'];
    durationMs?:number;
    success?:boolean;
    priority:number;
    disagreement:number;
    metadata?:Record<string,string|number|boolean|null>;
  }>;
}

const KEY='predictlm-app-learning-v1';
const MAX_EVENTS=420;

function clean(value:unknown,max=120){
  return String(value??'')
    .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,'[redacted-key]')
    .replace(/\b(?:sk|gsk|ghp|github_pat|sk-or-v1)[-_A-Za-z0-9]{12,}\b/g,'[redacted-token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]')
    .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/g,'[redacted-phone]')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,max);
}

function safeMetadata(input:AppLearningEvent['metadata']){
  const out:Record<string,string|number|boolean|null>={};
  for(const [key,value] of Object.entries(input||{}).slice(0,16)){
    const k=clean(key,48);
    if(!k||/(password|senha|token|secret|authorization|cookie|value|content|prompt|message)/i.test(k))continue;
    if(typeof value==='number'||typeof value==='boolean'||value===null)out[k]=value;
    else out[k]=clean(value,100);
  }
  return out;
}

export function normalizeAppLearningEvent(input:AppLearningEvent):AppLearningEvent{
  return {
    ...input,
    at:Number(input.at||Date.now()),
    surface:clean(input.surface||'unknown',80),
    action:clean(input.action||'unknown-action',120),
    durationMs:input.durationMs===undefined?undefined:Math.max(0,Math.min(120000,Number(input.durationMs)||0)),
    novelty:input.novelty===undefined?undefined:Math.max(0,Math.min(1,Number(input.novelty)||0)),
    uncertainty:input.uncertainty===undefined?undefined:Math.max(0,Math.min(1,Number(input.uncertainty)||0)),
    salience:input.salience===undefined?undefined:Math.max(0,Math.min(1,Number(input.salience)||0)),
    metadata:safeMetadata(input.metadata)
  };
}

export function createAppLearningLedger():AppLearningLedger{
  return {version:1,total:0,failures:0,successes:0,lastUpdated:Date.now(),bio:createBioIntelligenceState(),events:[]};
}

export function readAppLearningLedger():AppLearningLedger{
  if(typeof window==='undefined')return createAppLearningLedger();
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'null');
    if(parsed?.version===1&&Array.isArray(parsed.events))return parsed as AppLearningLedger;
  }catch{}
  return createAppLearningLedger();
}

function save(ledger:AppLearningLedger){
  if(typeof window==='undefined')return;
  try{localStorage.setItem(KEY,JSON.stringify(ledger))}catch{}
}

export function recordAppLearningEvent(raw:AppLearningEvent){
  const event=normalizeAppLearningEvent(raw);
  const fusion=fuseBioIntelligence(event);
  if(typeof window==='undefined')return fusion;

  const previous=readAppLearningLedger();
  const row={
    at:event.at||Date.now(),
    surface:event.surface,
    action:event.action,
    kind:event.kind,
    durationMs:event.durationMs,
    success:event.success,
    priority:Number(fusion.learningPriority.toFixed(3)),
    disagreement:Number(fusion.disagreement.toFixed(3)),
    metadata:safeMetadata(event.metadata)
  };

  const duplicate=previous.events[0]
    && previous.events[0].surface===row.surface
    && previous.events[0].action===row.action
    && previous.events[0].kind===row.kind
    && Math.abs(previous.events[0].at-row.at)<500;

  const ledger:AppLearningLedger={
    version:1,
    total:previous.total+(duplicate?0:1),
    failures:previous.failures+(!duplicate&&event.success===false?1:0),
    successes:previous.successes+(!duplicate&&event.success===true?1:0),
    lastUpdated:Date.now(),
    bio:advanceBioIntelligence(previous.bio,event),
    events:duplicate?previous.events:[row,...previous.events].slice(0,MAX_EVENTS)
  };
  save(ledger);

  if(event.kind==='error'||event.success===false||fusion.learningPriority>=.72){
    try{
      advanceBrowserDigitalBrainContext([
        'aprendizado transversal do app',
        'superfície '+event.surface,
        'ação '+event.action,
        'resultado '+(event.success===false?'falha':event.success===true?'sucesso':'observação'),
        'prioridade '+Math.round(fusion.learningPriority*100)+'%',
        fusion.researchGap?'lacuna de pesquisa detectada':'sem lacuna forte'
      ].join(' · '));
    }catch{}
  }

  return fusion;
}

export function emitAppLearningEvent(event:AppLearningEvent){
  const fusion=recordAppLearningEvent(event);
  if(typeof window!=='undefined'){
    try{window.dispatchEvent(new CustomEvent('predictlm:learning-recorded',{detail:{event:normalizeAppLearningEvent(event),fusion}}))}catch{}
  }
  return fusion;
}


export interface AppImprovementCandidate{
  id:string;
  surface:string;
  action:string;
  occurrences:number;
  failures:number;
  meanPriority:number;
  meanDisagreement:number;
  rationale:string;
  status:'candidate';
  promotion:'proposal-only';
}

export function deriveAppImprovementCandidates(ledger=readAppLearningLedger(),limit=12):AppImprovementCandidate[]{
  const groups=new Map<string,{surface:string;action:string;rows:AppLearningLedger['events']}>();
  for(const row of ledger.events){
    if(row.success!==false&&row.priority<.68)continue;
    const key=row.surface+'|'+row.action;
    const group=groups.get(key)||{surface:row.surface,action:row.action,rows:[]};
    group.rows.push(row);
    groups.set(key,group);
  }
  return [...groups.values()].map(group=>{
    const failures=group.rows.filter(x=>x.success===false).length;
    const meanPriority=group.rows.reduce((sum,x)=>sum+x.priority,0)/Math.max(1,group.rows.length);
    const meanDisagreement=group.rows.reduce((sum,x)=>sum+x.disagreement,0)/Math.max(1,group.rows.length);
    const severity=failures>1?'repeated failure':failures===1?'observed failure':'high-priority cross-species disagreement';
    return {
      id:'app:'+group.surface+':'+group.action,
      surface:group.surface,
      action:group.action,
      occurrences:group.rows.length,
      failures,
      meanPriority:Number(meanPriority.toFixed(3)),
      meanDisagreement:Number(meanDisagreement.toFixed(3)),
      rationale:severity+'; inspect the responsible code path, reproduce, propose the smallest reversible patch, then run tests/build/security checks.',
      status:'candidate' as const,
      promotion:'proposal-only' as const
    };
  }).sort((a,b)=>b.failures-a.failures||b.meanPriority-a.meanPriority||b.occurrences-a.occurrences).slice(0,Math.max(1,Math.min(30,limit)));
}

export function appLearningContext(surface?:string,limit=8){
  const ledger=readAppLearningLedger();
  const rows=ledger.events
    .filter(x=>!surface||x.surface===surface)
    .sort((a,b)=>b.priority-a.priority||b.at-a.at)
    .slice(0,Math.max(1,Math.min(20,limit)));
  const candidates=deriveAppImprovementCandidates(ledger,4);
  if(!rows.length&&!candidates.length)return '';
  return [
    'APP-WIDE LEARNING LEDGER — behavioral telemetry with values/content redacted.',
    'Experiences '+ledger.total+' · successes '+ledger.successes+' · failures '+ledger.failures+'.',
    ...rows.map(x=>[
      x.kind.toUpperCase(),
      x.surface,
      x.action,
      'priority '+Math.round(x.priority*100)+'%',
      'disagreement '+Math.round(x.disagreement*100)+'%',
      x.success===undefined?'outcome unknown':x.success?'success':'failure'
    ].join(' · ')),
    ...candidates.map(x=>'IMPROVEMENT CANDIDATE · '+x.surface+' · '+x.action+' · failures '+x.failures+' · priority '+Math.round(x.meanPriority*100)+'% · proposal-only')
  ].join('\n');
}

export function appLearningStats(){
  const ledger=readAppLearningLedger();
  return {
    total:ledger.total,
    failures:ledger.failures,
    successes:ledger.successes,
    lastUpdated:ledger.lastUpdated,
    bioExperiences:ledger.bio.experiences,
    speciesUse:ledger.bio.speciesUse
  };
}
