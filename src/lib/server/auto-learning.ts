export interface RuntimeAutoLesson{
  id:string;
  category:string;
  surface:string;
  instruction:string;
  tags:string[];
  evidence_count:number;
  confidence:number;
  last_seen:string|null;
}

declare global{
  var __predictlmAutoLearningCache:{expires:number;lessons:RuntimeAutoLesson[]}|undefined;
}

const DEFAULT_SUPABASE_URL='https://yzfnfoowbcwrwhhvnypc.supabase.co';
const DEFAULT_PUBLISHABLE_KEY='sb_publishable_56kl1LgPEEv8wKpjO-mfcg_Qv94Mv2c';

function cfg(){
  const url=String(process.env.PREDICT_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL).replace(/\/$/,'');
  const key=String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||DEFAULT_PUBLISHABLE_KEY);
  return {url,key,enabled:!!url&&!!key};
}

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

function tokens(text:string){
  const stop=new Set(['para','como','uma','que','isso','essa','esse','com','sem','por','dos','das','predictlm','resposta','usuario','usuário']);
  return [...new Set(normalize(text).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!stop.has(x)))];
}

async function loadLessons(){
  const cached=globalThis.__predictlmAutoLearningCache;
  if(cached&&cached.expires>Date.now())return cached.lessons;
  const {url,key,enabled}=cfg();
  if(!enabled)return [];
  try{
    const q=new URLSearchParams({
      select:'id,category,surface,instruction,tags,evidence_count,confidence,last_seen',
      promoted:'eq.true',
      order:'confidence.desc,evidence_count.desc',
      limit:'50'
    });
    const r=await fetch(url+'/rest/v1/predict_auto_lessons?'+q.toString(),{
      headers:{apikey:key,Authorization:'Bearer '+key},
      cache:'no-store'
    });
    if(!r.ok)return [];
    const rows=await r.json();
    const lessons=(Array.isArray(rows)?rows:[]).map((x:any)=>({
      id:String(x.id||''),
      category:String(x.category||''),
      surface:String(x.surface||''),
      instruction:String(x.instruction||'').slice(0,900),
      tags:Array.isArray(x.tags)?x.tags.map(String).slice(0,20):[],
      evidence_count:Math.max(0,Number(x.evidence_count)||0),
      confidence:Math.max(0,Math.min(1,Number(x.confidence)||0)),
      last_seen:x.last_seen?String(x.last_seen):null
    })).filter((x:RuntimeAutoLesson)=>x.id&&x.instruction);
    globalThis.__predictlmAutoLearningCache={expires:Date.now()+60_000,lessons};
    return lessons;
  }catch{return []}
}

export async function runtimeAutoLearningLessons(){
  return loadLessons();
}

export async function runtimeAutoLearningContext(query:string,limit=4,surface='chat'){
  const lessons=await loadLessons();
  if(!lessons.length)return '';
  const q=tokens(query);
  const ranked=lessons.map(lesson=>{
    const tagSet=new Set(tokens(lesson.tags.join(' ')+' '+lesson.category));
    const overlap=q.reduce((n,t)=>n+(tagSet.has(t)?1:0),0);
    const surfaceBonus=lesson.surface===surface?2:0;
    const generalFailure=lesson.category.includes('relevance')||lesson.category.includes('failure')?1:0;
    const score=overlap*3+surfaceBonus+generalFailure+lesson.confidence;
    return {lesson,score};
  }).sort((a,b)=>b.score-a.score)
    .filter(x=>x.score>=1.5)
    .slice(0,Math.max(1,Math.min(8,limit)));
  if(!ranked.length)return '';
  return ranked.map(({lesson},i)=>
    'AUTO-LEARN['+(i+1)+'] '+lesson.instruction+
    ' (evidências='+lesson.evidence_count+', confiança='+lesson.confidence.toFixed(2)+')'
  ).join('\n');
}

export async function runtimeAutoLearningStats(){
  const lessons=await loadLessons();
  return {
    promoted:lessons.length,
    evidence:lessons.reduce((n,x)=>n+x.evidence_count,0),
    lessons:lessons.map(x=>({
      id:x.id,
      category:x.category,
      surface:x.surface,
      evidenceCount:x.evidence_count,
      confidence:x.confidence,
      lastSeen:x.last_seen
    }))
  };
}
