import fs from 'node:fs/promises';
import path from 'node:path';

const url=String(process.env.PREDICT_SUPABASE_URL||process.env.SUPABASE_URL||'https://yzfnfoowbcwrwhhvnypc.supabase.co').replace(/\/$/,'');
const key=String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_56kl1LgPEEv8wKpjO-mfcg_Qv94Mv2c');

const q=new URLSearchParams({
  select:'id,category,surface,instruction,tags,evidence_count,negative_count,error_count,confidence,promoted,first_seen,last_seen,updated_at',
  order:'evidence_count.desc,id.asc'
});
const r=await fetch(url+'/rest/v1/predict_auto_lessons?'+q.toString(),{
  headers:{apikey:key,Authorization:'Bearer '+key}
});
if(!r.ok)throw new Error('Auto-learning snapshot failed: '+r.status+' '+(await r.text()).slice(0,200));
const lessons=await r.json();
const promoted=(Array.isArray(lessons)?lessons:[]).filter(x=>x.promoted);
const report={
  generatedAt:new Date().toISOString(),
  source:'public.predict_auto_lessons',
  policy:'Only aggregated, fixed-template operational lessons are exposed. Raw feedback and personal data are not included.',
  totals:{
    lessons:Array.isArray(lessons)?lessons.length:0,
    promoted:promoted.length,
    evidence:promoted.reduce((n,x)=>n+(Number(x.evidence_count)||0),0)
  },
  lessons:promoted.map(x=>({
    id:String(x.id||''),
    category:String(x.category||''),
    surface:String(x.surface||''),
    instruction:String(x.instruction||''),
    tags:Array.isArray(x.tags)?x.tags:[],
    evidenceCount:Number(x.evidence_count)||0,
    negativeCount:Number(x.negative_count)||0,
    errorCount:Number(x.error_count)||0,
    confidence:Number(x.confidence)||0,
    firstSeen:x.first_seen||null,
    lastSeen:x.last_seen||null,
    updatedAt:x.updated_at||null
  }))
};
const out=path.join(process.cwd(),'reports','selfimprove','auto-learning.json');
await fs.mkdir(path.dirname(out),{recursive:true});
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.totals,null,2));
