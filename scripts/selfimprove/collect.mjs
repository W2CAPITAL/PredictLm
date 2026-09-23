import fs from 'node:fs';
import path from 'node:path';

const url=String(process.env.PREDICT_SUPABASE_URL||process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=String(process.env.PREDICT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'');
const out=path.join(process.cwd(),'reports/selfimprove');
fs.mkdirSync(out,{recursive:true});

const report={generatedAt:new Date().toISOString(),status:'no-backend',counts:{},examples:[]};
if(url&&key){
  const q=new URLSearchParams({select:'kind,surface,message_excerpt,metadata,created_at',order:'created_at.desc',limit:'500'});
  const response=await fetch(url+'/rest/v1/predict_feedback_events?'+q.toString(),{headers:{apikey:key,Authorization:'Bearer '+key}});
  if(response.ok){
    const rows=await response.json();
    report.status='ok';
    for(const row of rows){
      const bucket=row.surface+':'+row.kind;
      report.counts[bucket]=(report.counts[bucket]||0)+1;
    }
    report.examples=rows.filter(x=>x.kind==='negative'||x.kind==='error').slice(0,40);
  }else report.status='http-'+response.status;
}
fs.writeFileSync(path.join(out,'feedback.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,counts:report.counts,negativeExamples:report.examples.length},null,2));
