import globalData from '@/data/global-lessons.json';
import {globalLearningContext} from '@/lib/global-learning';
import {runtimeAutoLearningContext,runtimeAutoLearningLessons} from '@/lib/server/auto-learning';
import {TRAINING_KNOWLEDGE} from './learned-lessons';
import {trainingContext} from './context';

type PortableTrainingLesson={
  id:string;
  title:string;
  tags:string[];
  source:string;
  body:string;
};

type PortableGlobalLesson={
  id:string;
  instruction:string;
  tags:string[];
  source:string;
  updatedAt:string|null;
};

export interface PredictLearningPack{
  version:string;
  generatedAt:string;
  policy:string;
  counts:{training:number;global:number;runtime:number;total:number;evidence:number};
  training:PortableTrainingLesson[];
  global:PortableGlobalLesson[];
  runtime:Array<{
    id:string;
    category:string;
    surface:string;
    instruction:string;
    tags:string[];
    evidenceCount:number;
    confidence:number;
    lastSeen:string|null;
  }>;
}

function globalLessons():PortableGlobalLesson[]{
  const raw=Array.isArray((globalData as any)?.lessons)?(globalData as any).lessons:[];
  return raw.map((x:any)=>({
    id:String(x?.id||''),
    instruction:String(x?.instruction||'').slice(0,1200),
    tags:Array.isArray(x?.tags)?x.tags.map(String).slice(0,24):[],
    source:String(x?.source||'versioned-global-learning').slice(0,240),
    updatedAt:x?.updatedAt?String(x.updatedAt):null
  })).filter((x:PortableGlobalLesson)=>x.id&&x.instruction);
}

export async function exportLearningPack():Promise<PredictLearningPack>{
  const runtime=await runtimeAutoLearningLessons();
  const training=TRAINING_KNOWLEDGE.map(entry=>({
    id:String(entry.id||''),
    title:String(entry.title||'').slice(0,240),
    tags:Array.isArray(entry.tags)?entry.tags.map(String).slice(0,24):[],
    source:String(entry.source||'').slice(0,280),
    body:String(entry.body||'').slice(0,1800)
  })).filter(entry=>entry.id&&entry.body);
  const global=globalLessons();
  const runtimePortable=runtime.map(lesson=>({
    id:lesson.id,
    category:lesson.category,
    surface:lesson.surface,
    instruction:lesson.instruction,
    tags:lesson.tags,
    evidenceCount:lesson.evidence_count,
    confidence:lesson.confidence,
    lastSeen:lesson.last_seen
  }));
  const evidence=runtimePortable.reduce((n,x)=>n+x.evidenceCount,0);
  return {
    version:[
      'training-'+training.length,
      'global-'+global.length,
      'runtime-'+runtimePortable.map(x=>x.id+':'+x.evidenceCount).join(',')
    ].join('|'),
    generatedAt:new Date().toISOString(),
    policy:'Portable learning contains curated technical lessons, approved global lessons and promoted aggregate runtime lessons only. Raw feedback, credentials and personal data are excluded.',
    counts:{
      training:training.length,
      global:global.length,
      runtime:runtimePortable.length,
      total:training.length+global.length+runtimePortable.length,
      evidence
    },
    training,
    global,
    runtime:runtimePortable
  };
}

export async function learningPackContext(query:string,surface='chat',limit=5){
  const bounded=Math.max(1,Math.min(8,limit));
  const [runtime,trained,global]=await Promise.all([
    runtimeAutoLearningContext(query,bounded,surface),
    Promise.resolve(trainingContext(query,bounded)),
    Promise.resolve(globalLearningContext(query,bounded))
  ]);
  return [
    trained&&('CURATED LEARNING\n'+trained),
    global&&('GLOBAL LEARNING\n'+global),
    runtime&&('PROMOTED RUNTIME LEARNING\n'+runtime)
  ].filter(Boolean).join('\n\n');
}
