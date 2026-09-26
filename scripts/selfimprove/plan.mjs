import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const feedbackPath=path.join(root,'reports','selfimprove','feedback.json');
const outDir=path.join(root,'reports','selfimprove');
fs.mkdirSync(outDir,{recursive:true});

const stop=new Set(['predictlm','resposta','erro','falha','usuario','usuário','para','como','uma','que','isso','esta','está','com','sem','por','dos','das']);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
const terms=s=>[...new Set(norm(s).split(/[^a-z0-9]+/).filter(x=>x.length>=4&&!stop.has(x)))];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,12);

let feedback={status:'missing',examples:[],counts:{}};
try{feedback=JSON.parse(fs.readFileSync(feedbackPath,'utf8'))}catch{}

const rows=Array.isArray(feedback.examples)?feedback.examples:[];
const groups=new Map();

for(const row of rows){
  const surface=String(row.surface||'unknown').slice(0,60);
  const kind=String(row.kind||'negative').slice(0,40);
  const excerpt=String(row.message_excerpt||'').slice(0,500);
  const signature=terms(excerpt).slice(0,5).join('-')||'generic';
  const key=surface+'|'+kind+'|'+signature;
  if(!groups.has(key))groups.set(key,{surface,kind,signature,count:0,examples:[]});
  const group=groups.get(key);
  group.count++;
  if(group.examples.length<5)group.examples.push(excerpt);
}

const baseline=process.env.GITHUB_SHA||process.env.VERCEL_GIT_COMMIT_SHA||'working-tree';
const experiments=[...groups.values()]
  .sort((a,b)=>b.count-a.count)
  .slice(0,40)
  .map((group,index)=>({
    id:'exp-'+hash(group.surface+'|'+group.kind+'|'+group.signature),
    rank:index+1,
    status:'proposed',
    surface:group.surface,
    failureKind:group.kind,
    occurrences:group.count,
    baselineCommit:baseline,
    hypothesis:'A focused change to routing/rule/prompt/skill/code for this repeated failure can improve the frozen benchmark without unrelated regressions.',
    evidence:group.examples,
    requiredBeforePromotion:[
      'reproduce failure against a frozen benchmark',
      'implement the smallest candidate patch',
      'run npm test',
      'run npm run build',
      'compare before/after metrics',
      'record regressions and rollback',
      'require configured merge/deploy gate'
    ],
    promotion:'blocked-until-evaluated'
  }));

const ledger={
  version:1,
  generatedAt:new Date().toISOString(),
  source:feedbackPath,
  feedbackStatus:feedback.status||'unknown',
  baselineCommit:baseline,
  policy:'proposal-only; no experiment is durable learning or production change until evaluated and promoted through the configured gate',
  experiments
};

fs.writeFileSync(path.join(outDir,'experiments.json'),JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({experiments:experiments.length,baselineCommit:baseline,output:'reports/selfimprove/experiments.json'},null,2));
