import data from '@/data/global-lessons.json';

export interface GlobalLesson{
  id:string;
  instruction:string;
  tags?:string[];
  source?:string;
  updatedAt?:string;
}

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

function terms(text:string){
  const stop=new Set(['para','como','uma','que','isso','essa','esse','sempre','predictlm','quando','deve','usar','use','fazer','faca','the','and','with']);
  return Array.from(new Set(normalize(text).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!stop.has(x))));
}

export function isGlobalLearningInstruction(text:string){
  const t=normalize(text);
  return /\b(aprenda|aprende|lembre|lembra|a partir de agora|daqui pra frente|daqui para frente|sempre que|nunca mais|use isso|use este|use essa|isso deve valer para todos|para todos|globalmente|treine a skill|atualize a skill)\b/.test(t);
}

export function sanitizeGlobalInstruction(text:string){
  return String(text||'')
    .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,'[redacted-key]')
    .replace(/\b(?:sk|gsk|ghp|github_pat|sk-or-v1)[-_A-Za-z0-9]{12,}\b/g,'[redacted-token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]')
    .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/g,'[redacted-phone]')
    .replace(/\b\d{7}-?\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g,'[redacted-case]')
    .replace(/https?:\/\/[^\s]+/gi,'[redacted-url]')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,1200);
}

export function globalLearningContext(query:string,limit=3){
  const lessons=(data.lessons||[]) as GlobalLesson[];
  const q=terms(query);
  if(!q.length||!lessons.length)return '';
  return lessons.map(lesson=>{
    const hay=new Set(terms((lesson.tags||[]).join(' ')+' '+lesson.instruction));
    const overlap=q.reduce((n,t)=>n+(hay.has(t)?1:0),0);
    return {lesson,score:overlap/Math.max(2,q.length)};
  }).filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,Math.max(1,Math.min(5,limit)))
    .map(x=>'Lição global versionada: '+x.lesson.instruction)
    .join('\n');
}

export function globalLearningStats(){
  return {
    version:String((data as any).version||'seed'),
    count:Array.isArray((data as any).lessons)?(data as any).lessons.length:0,
    generatedAt:(data as any).generatedAt||null
  };
}
