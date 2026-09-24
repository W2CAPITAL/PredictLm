import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const repo=process.env.PREDICTLM_GLOBAL_LEARNING_REPO||process.env.GITHUB_REPOSITORY||'W2CAPITAL/PredictLm';
const token=process.env.GITHUB_TOKEN||process.env.PREDICTLM_GLOBAL_LEARNING_GITHUB_TOKEN||'';
if(!token)throw new Error('Missing GitHub token');

async function gh(path){
  const r=await fetch('https://api.github.com'+path,{
    headers:{
      Accept:'application/vnd.github+json',
      Authorization:'Bearer '+token,
      'X-GitHub-Api-Version':'2022-11-28'
    }
  });
  if(!r.ok)throw new Error('GitHub '+r.status+' '+path);
  return r.json();
}

function sanitize(text=''){
  return String(text)
    .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,'[redacted-key]')
    .replace(/\b(?:sk|gsk|ghp|github_pat|sk-or-v1)[-_A-Za-z0-9]{12,}\b/g,'[redacted-token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]')
    .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/g,'[redacted-phone]')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,1200);
}

function extract(body=''){
  const m=String(body).match(/<!-- predictlm-learning:start -->([\s\S]*?)<!-- predictlm-learning:end -->/);
  if(!m)return '';
  return sanitize(m[1].match(/Lesson:\s*([^\n]+)/i)?.[1]||'');
}

const issues=await gh('/repos/'+repo+'/issues?state=all&labels=learning-approved&per_page=100');
const lessons=[];
for(const issue of issues){
  if(issue.pull_request)continue;
  const instruction=extract(issue.body||'');
  if(!instruction)continue;
  lessons.push({
    id:'issue-'+issue.number,
    instruction,
    tags:[],
    source:'github-issue-'+issue.number,
    updatedAt:issue.updated_at
  });
}
lessons.sort((a,b)=>a.id.localeCompare(b.id));
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(lessons)).digest('hex').slice(0,16);
const output={version:fingerprint,generatedAt:new Date().toISOString(),lessons};
await fs.mkdir('src/data',{recursive:true});
await fs.writeFile('src/data/global-lessons.json',JSON.stringify(output,null,2)+'\n');
console.log('Global lessons:',lessons.length,'version',fingerprint);
