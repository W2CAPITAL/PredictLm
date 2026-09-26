import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  buildCodeProposals,
  buildResearchGaps,
  classifyRecord,
  evidenceTrust,
  extractXmlEntries,
  mergeRecords,
  sanitizeExternalText,
  selectRoundRobin,
  stableId
} from './core.mjs';

const ROOT=process.cwd();
const CONFIG=JSON.parse(await fs.readFile(path.join(ROOT,'config','continuous-learning.json'),'utf8'));
const GH_SOURCES=JSON.parse(await fs.readFile(path.join(ROOT,'config','github-knowledge-sources.json'),'utf8'));
const NOW=new Date();
const NOW_ISO=NOW.toISOString();
const RUN_NUMBER=Math.floor(NOW.getTime()/3600000);
const REPO=String(process.env.GITHUB_REPOSITORY||'W2CAPITAL/PredictLm');
const TOKEN=String(process.env.GITHUB_TOKEN||'').trim();
const PUBLISH_BRANCH=String(process.env.PREDICTLM_PUBLISH_BRANCH||CONFIG.publish.branch||'continuous-learning');
const LIVE_URL=String(process.env.PREDICTLM_CONTINUOUS_INDEX_URL||CONFIG.publish.liveUrl||'');
const MAX_NEW=Number(CONFIG.policy.maxNewRecordsPerRun||60);
const USER_AGENT='PredictLM-Continuous-Learning/1.0 (+https://github.com/W2CAPITAL/PredictLm)';
const GH_HEADERS={
  Accept:'application/vnd.github+json',
  'User-Agent':USER_AGENT,
  ...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})
};

function hostOf(url=''){
  try{return new URL(url).hostname.toLowerCase()}catch{return ''}
}

function inferTopic(domains=[],repo=''){
  const text=(domains.join(' ')+' '+repo).toLowerCase();
  if(/neuro|connectome|brain|synap/.test(text))return 'neuroscience';
  if(/security|fraud|phish|vulnerab|threat/.test(text))return 'cybersecurity';
  if(/legal|law|datajud|djen|jurid/.test(text))return 'legal-tech';
  if(/image|video|media|vision|comfy|diffusion/.test(text))return 'media-ai';
  if(/simulation|game|voxel|minecraft|world/.test(text))return 'simulation';
  if(/local|inference|webgpu|wasm|gguf|llm|model-router/.test(text))return 'local-ai';
  if(/agent|memory|orchestrat|rag|council/.test(text))return 'ai-agents';
  if(/react|next|web|vercel|browser|frontend/.test(text))return 'web-platform';
  if(/automation|workflow|mcp|integration/.test(text))return 'automation';
  return 'programming';
}

async function fetchText(url,init={},timeoutMs=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{
      ...init,
      signal:controller.signal,
      headers:{'User-Agent':USER_AGENT,...(init.headers||{})}
    });
    if(!response.ok)throw new Error('HTTP '+response.status+' '+url);
    return response.text();
  }finally{clearTimeout(timer)}
}

async function ghJson(endpoint){
  const response=await fetch('https://api.github.com'+endpoint,{headers:GH_HEADERS});
  if(!response.ok)throw new Error('GitHub '+response.status+' '+endpoint);
  return response.json();
}

async function readPrevious(){
  if(LIVE_URL){
    try{
      const response=await fetch(LIVE_URL,{headers:{'User-Agent':USER_AGENT},cache:'no-store'});
      if(response.ok){
        const data=await response.json();
        if(Array.isArray(data?.records))return data;
      }
    }catch{}
  }
  return {schemaVersion:1,generatedAt:null,records:[],gaps:[],codeProposals:[],skillProposals:[],audit:null};
}

async function collectAllowlistedGithub(){
  const allowed=(GH_SOURCES.sources||[]).filter(x=>x.mode==='allow');
  const selected=selectRoundRobin(allowed,RUN_NUMBER,Number(CONFIG.policy.githubReposPerRun||8));
  const rows=[];
  for(const src of selected){
    try{
      const commit=await ghJson('/repos/'+src.repo+'/commits/'+encodeURIComponent(src.branch||'main'));
      const docs=(src.include||[]).filter(file=>/\.(?:md|mdx|txt)$/i.test(file)||/(?:^|\/)README(?:\.|$)/i.test(file));
      const docPath=docs[0]||'README.md';
      let summary='';
      try{
        const raw=await fetchText('https://raw.githubusercontent.com/'+src.repo+'/'+commit.sha+'/'+docPath,{headers:TOKEN?{Authorization:'Bearer '+TOKEN}:{}},12000);
        const headings=(raw.match(/^#{1,3}\s+.+$/gm)||[]).slice(0,8).map(x=>x.replace(/^#+\s*/,'')).join(' · ');
        const body=sanitizeExternalText(raw.replace(/^#{1,6}\s+/gm,''),Number(CONFIG.policy.maxSummaryChars||1100));
        summary=sanitizeExternalText((headings?headings+'. ':'')+body,Number(CONFIG.policy.maxSummaryChars||1100));
      }catch{
        summary='Atualização detectada em fonte GitHub allowlisted; conteúdo textual principal indisponível nesta rodada.';
      }
      const topic=inferTopic(src.domains||[],src.repo);
      const confidence=evidenceTrust({kind:'github-allowlist',allowlisted:true,licenseMode:src.mode,host:'github.com'});
      const record={
        id:stableId('github-allowlist',src.repo,commit.sha,docPath),
        observedAt:NOW_ISO,
        publishedAt:commit?.commit?.committer?.date||commit?.commit?.author?.date||null,
        topic,
        kind:'github-allowlist',
        title:src.repo+' · '+docPath,
        summary,
        source:src.repo,
        url:'https://github.com/'+src.repo+'/blob/'+commit.sha+'/'+docPath,
        ref:String(commit.sha||'').slice(0,12),
        path:docPath,
        domains:src.domains||[],
        license:src.license||'NOASSERTION',
        evidenceLevel:'versioned-open-source-primary',
        confidence,
        allowlisted:true,
        official:false,
        quarantined:false
      };
      record.status=classifyRecord(record,CONFIG.policy);
      rows.push(record);
    }catch(error){
      rows.push({
        id:stableId('github-error',src.repo,NOW.toISOString().slice(0,13)),
        observedAt:NOW_ISO,
        publishedAt:null,
        topic:inferTopic(src.domains||[],src.repo),
        kind:'source-error',
        title:'Falha temporária ao verificar '+src.repo,
        summary:sanitizeExternalText(String(error?.message||error),500),
        source:src.repo,
        url:'https://github.com/'+src.repo,
        domains:src.domains||[],
        license:src.license||'NOASSERTION',
        evidenceLevel:'collection-error',
        confidence:0,
        allowlisted:true,
        quarantined:false,
        status:'rejected'
      });
    }
  }
  return rows;
}

async function collectGithubDiscovery(){
  const topic=CONFIG.topics[RUN_NUMBER%CONFIG.topics.length];
  const queries=topic.githubQueries||[];
  if(!queries.length)return [];
  const query=queries[RUN_NUMBER%queries.length];
  try{
    const q=encodeURIComponent(query+' archived:false');
    const data=await ghJson('/search/repositories?q='+q+'&sort=updated&order=desc&per_page='+Math.max(1,Number(CONFIG.policy.githubDiscoveriesPerRun||6)));
    const allowset=new Set((GH_SOURCES.sources||[]).map(x=>String(x.repo).toLowerCase()));
    const trustedOwners=new Set(['github','microsoft','google','googleapis','vercel','nodejs','facebook','meta-llama','huggingface','supabase','mlc-ai','openai']);
    return (data.items||[]).map(item=>{
      const repo=String(item.full_name||'');
      const allowlisted=allowset.has(repo.toLowerCase());
      const official=trustedOwners.has(String(item.owner?.login||'').toLowerCase());
      const confidence=evidenceTrust({kind:'github-discovery',official,allowlisted,host:'github.com'});
      const record={
        id:stableId('github-discovery',repo,String(item.pushed_at||item.updated_at||'')),
        observedAt:NOW_ISO,
        publishedAt:item.pushed_at||item.updated_at||null,
        topic:topic.id,
        kind:'github-discovery',
        title:repo,
        summary:sanitizeExternalText([
          item.description||'',
          Array.isArray(item.topics)&&item.topics.length?'Tópicos: '+item.topics.join(', '):'',
          'Stars: '+Number(item.stargazers_count||0)
        ].filter(Boolean).join('. '),900),
        source:repo,
        url:item.html_url||('https://github.com/'+repo),
        domains:[topic.id,...(item.topics||[]).slice(0,8)],
        license:item.license?.spdx_id||'NOASSERTION',
        evidenceLevel:'github-discovery-metadata',
        confidence,
        allowlisted,
        official,
        quarantined:false
      };
      record.status=classifyRecord(record,CONFIG.policy);
      return record;
    });
  }catch{return []}
}

async function collectFeeds(){
  const feeds=(CONFIG.feeds||[]).filter(x=>x.url);
  const selected=selectRoundRobin(feeds,RUN_NUMBER,Number(CONFIG.policy.feedsPerRun||2));
  const rows=[];
  for(const feed of selected){
    try{
      const xml=await fetchText(feed.url,{},15000);
      const entries=extractXmlEntries(xml).slice(0,6);
      const confidence=evidenceTrust({kind:feed.kind||'rss',official:Boolean(feed.official),host:hostOf(feed.url)});
      for(const entry of entries){
        const record={
          id:stableId('feed',feed.id,entry.link||entry.title,entry.published||''),
          observedAt:NOW_ISO,
          publishedAt:entry.published||null,
          topic:feed.topic,
          kind:feed.kind||'rss',
          title:entry.title||feed.name,
          summary:sanitizeExternalText(entry.summary,Number(CONFIG.policy.maxSummaryChars||1100)),
          source:feed.name,
          url:entry.link||feed.url,
          domains:[feed.topic],
          license:'source-terms',
          evidenceLevel:feed.evidenceLevel||'primary-feed',
          confidence,
          allowlisted:true,
          official:Boolean(feed.official),
          quarantined:false
        };
        record.status=classifyRecord(record,CONFIG.policy);
        rows.push(record);
      }
    }catch(error){
      rows.push({
        id:stableId('feed-error',feed.id,NOW.toISOString().slice(0,13)),
        observedAt:NOW_ISO,
        publishedAt:null,
        topic:feed.topic,
        kind:'source-error',
        title:'Falha temporária em '+feed.name,
        summary:sanitizeExternalText(String(error?.message||error),500),
        source:feed.name,
        url:feed.url,
        domains:[feed.topic],
        license:'source-terms',
        evidenceLevel:'collection-error',
        confidence:0,
        allowlisted:true,
        official:Boolean(feed.official),
        quarantined:false,
        status:'rejected'
      });
    }
  }
  return rows;
}

async function collectArxiv(){
  const topics=(CONFIG.topics||[]).filter(x=>x.arxivQuery);
  const selected=selectRoundRobin(topics,RUN_NUMBER,Number(CONFIG.policy.academicTopicsPerRun||1));
  const rows=[];
  for(const topic of selected){
    try{
      const query=encodeURIComponent('all:'+topic.arxivQuery);
      const xml=await fetchText('https://export.arxiv.org/api/query?search_query='+query+'&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending',{},20000);
      const entries=extractXmlEntries(xml).slice(0,5);
      const confidence=evidenceTrust({kind:'academic-preprint',official:true,host:'arxiv.org'});
      for(const entry of entries){
        const record={
          id:stableId('arxiv',entry.link||entry.title,entry.published||''),
          observedAt:NOW_ISO,
          publishedAt:entry.published||null,
          topic:topic.id,
          kind:'academic-preprint',
          title:entry.title,
          summary:sanitizeExternalText(entry.summary,Number(CONFIG.policy.maxSummaryChars||1100)),
          source:'arXiv',
          url:entry.link||'https://arxiv.org/',
          domains:[topic.id],
          license:'paper-specific',
          evidenceLevel:'preprint-not-peer-reviewed',
          confidence,
          allowlisted:true,
          official:true,
          quarantined:false
        };
        record.status=classifyRecord(record,CONFIG.policy);
        rows.push(record);
      }
    }catch{}
  }
  return rows;
}

function skillProposals(codeProposals=[]){
  const seen=new Set();
  const rows=[];
  for(const proposal of codeProposals){
    for(const skill of proposal.suggestedSkills||[]){
      const key=skill+'|'+proposal.topic;
      if(seen.has(key))continue;
      seen.add(key);
      rows.push({
        id:stableId('skill-proposal',skill,proposal.topic),
        createdAt:proposal.createdAt,
        skill,
        topic:proposal.topic,
        action:'review-and-sync-skill-after-validated-runtime-change',
        evidenceIds:proposal.evidenceIds,
        status:'queued'
      });
    }
  }
  return rows;
}

function b64url(input){
  const raw=typeof input==='string'?input:JSON.stringify(input);
  return Buffer.from(raw).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

async function googleAccessToken(){
  const email=String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||'').trim();
  const privateKey=String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY||'').replace(/\\n/g,'\n').trim();
  if(!email||!privateKey)return null;
  const now=Math.floor(Date.now()/1000);
  const unsigned=b64url({alg:'RS256',typ:'JWT'})+'.'+b64url({
    iss:email,
    scope:'https://www.googleapis.com/auth/spreadsheets',
    aud:'https://oauth2.googleapis.com/token',
    iat:now,
    exp:now+3500
  });
  const signer=crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion=unsigned+'.'+b64url(signer.sign(privateKey));
  const body=new URLSearchParams({
    grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });
  const response=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  if(!response.ok)throw new Error('Google OAuth '+response.status);
  return String((await response.json()).access_token||'');
}

async function googleRequest(token,url,init={}){
  const response=await fetch(url,{
    ...init,
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(init.headers||{})}
  });
  if(!response.ok){
    const text=await response.text().catch(()=> '');
    throw new Error('Google Sheets '+response.status+' '+text.slice(0,300));
  }
  return response.status===204?{}:response.json();
}

async function ensureGoogleSheets(token,spreadsheetId,names){
  const meta=await googleRequest(token,'https://sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+'?fields=sheets.properties');
  const existing=new Set((meta.sheets||[]).map(x=>x.properties?.title).filter(Boolean));
  const missing=names.filter(name=>!existing.has(name));
  if(missing.length){
    await googleRequest(token,'https://sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+':batchUpdate',{
      method:'POST',
      body:JSON.stringify({requests:missing.map(title=>({addSheet:{properties:{title}}}))})
    });
  }
}

async function appendSheetRows(token,spreadsheetId,sheet,headers,rows){
  if(!rows.length)return 0;
  const range=encodeURIComponent(sheet+'!A1:Z1');
  const head=await googleRequest(token,'https://sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+'/values/'+range);
  if(!Array.isArray(head.values)||!head.values.length){
    await googleRequest(token,'https://sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+'/values/'+encodeURIComponent(sheet+'!A1')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{
      method:'POST',
      body:JSON.stringify({values:[headers]})
    });
  }
  await googleRequest(token,'https://sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+'/values/'+encodeURIComponent(sheet+'!A1')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{
    method:'POST',
    body:JSON.stringify({values:rows})
  });
  return rows.length;
}

async function syncSpreadsheet({newRecords,gaps,codeProposals,skillRows,audit}){
  const spreadsheetId=String(process.env.PREDICTLM_LEARNING_SPREADSHEET_ID||'').trim();
  if(!spreadsheetId)return {configured:false,status:'not-configured',rows:0};
  try{
    const token=await googleAccessToken();
    if(!token)return {configured:false,status:'missing-service-account',rows:0};
    const names=CONFIG.spreadsheet?.sheets||['APRENDIZADO','FONTES','GITHUB','SKILLS','CODIGO','PENDENCIAS','AUDITORIA'];
    await ensureGoogleSheets(token,spreadsheetId,names);
    let rows=0;
    rows+=await appendSheetRows(token,spreadsheetId,'APRENDIZADO',
      ['Data','ID','Tema','Tipo','Titulo','Resumo','Fonte','URL','Confianca','Evidencia','Licenca','Status'],
      newRecords.map(r=>[r.observedAt,r.id,r.topic,r.kind,r.title,r.summary,r.source,r.url,r.confidence,r.evidenceLevel,r.license,r.status]));
    const sourceMap=new Map();
    for(const r of newRecords)if(!sourceMap.has(r.source))sourceMap.set(r.source,r);
    rows+=await appendSheetRows(token,spreadsheetId,'FONTES',
      ['Data','Fonte','Host','Tipo','Confianca','Licenca','URL','Status'],
      [...sourceMap.values()].map(r=>[r.observedAt,r.source,hostOf(r.url),r.kind,r.confidence,r.license,r.url,r.status]));
    rows+=await appendSheetRows(token,spreadsheetId,'GITHUB',
      ['Data','Repositorio','Ref','Path','Tema','Dominios','Licenca','Confianca','Resumo','URL','Status'],
      newRecords.filter(r=>String(r.kind).startsWith('github-')).map(r=>[r.observedAt,r.source,r.ref||'',r.path||'',r.topic,(r.domains||[]).join(', '),r.license,r.confidence,r.summary,r.url,r.status]));
    rows+=await appendSheetRows(token,spreadsheetId,'SKILLS',
      ['Data','Skill','Tema','Acao','Evidencias','Status'],
      skillRows.map(x=>[x.createdAt,x.skill,x.topic,x.action,(x.evidenceIds||[]).join(', '),x.status]));
    rows+=await appendSheetRows(token,spreadsheetId,'CODIGO',
      ['Data','ID','Tema','Proposta','Area','Acao','Risco','Evidencias','Status'],
      codeProposals.map(x=>[x.createdAt,x.id,x.topic,x.title,x.area,x.action,x.risk,(x.evidenceIds||[]).join(', '),x.status]));
    rows+=await appendSheetRows(token,spreadsheetId,'PENDENCIAS',
      ['Data','Tema','Lacuna','Prioridade','RegistrosAceitos','UltimaPesquisa','ProximaConsulta','Status'],
      gaps.filter(x=>x.status==='open').slice(0,20).map(x=>[NOW_ISO,x.topic,x.label,x.priority,x.acceptedRecords,x.lastObservedAt||'',x.nextQuery,x.status]));
    rows+=await appendSheetRows(token,spreadsheetId,'AUDITORIA',
      ['Data','Run','Novos','Aceitos','Candidatos','Rejeitados','GapsAbertos','PropostasCodigo','Branch','Status'],
      [[NOW_ISO,audit.runId,audit.newRecords,audit.accepted,audit.candidates,audit.rejected,audit.openGaps,audit.codeProposals,PUBLISH_BRANCH,'ok']]);
    return {configured:true,status:'ok',rows};
  }catch(error){
    return {configured:true,status:'error',error:sanitizeExternalText(String(error?.message||error),500),rows:0};
  }
}

async function ensurePublishBranch(){
  if(!TOKEN)return false;
  const branchEndpoint='/repos/'+REPO+'/git/ref/heads/'+encodeURIComponent(PUBLISH_BRANCH);
  const response=await fetch('https://api.github.com'+branchEndpoint,{headers:GH_HEADERS});
  if(response.ok)return true;
  if(response.status!==404)throw new Error('GitHub branch check '+response.status);
  const base=await ghJson('/repos/'+REPO+'/git/ref/heads/main');
  const created=await fetch('https://api.github.com/repos/'+REPO+'/git/refs',{
    method:'POST',
    headers:{...GH_HEADERS,'Content-Type':'application/json'},
    body:JSON.stringify({ref:'refs/heads/'+PUBLISH_BRANCH,sha:base.object.sha})
  });
  if(!created.ok)throw new Error('GitHub branch create '+created.status);
  return true;
}

async function publishIndex(index){
  if(!TOKEN)return {status:'local-only'};
  await ensurePublishBranch();
  const filePath=CONFIG.publish.path||'learning-data/index.json';
  const endpoint='/repos/'+REPO+'/contents/'+filePath;
  let sha=null;
  const current=await fetch('https://api.github.com'+endpoint+'?ref='+encodeURIComponent(PUBLISH_BRANCH),{headers:GH_HEADERS});
  if(current.ok)sha=(await current.json()).sha||null;
  else if(current.status!==404)throw new Error('GitHub file read '+current.status);
  const payload={
    message:'chore(learning): refresh continuous knowledge '+NOW_ISO,
    content:Buffer.from(JSON.stringify(index,null,2)+'\n').toString('base64'),
    branch:PUBLISH_BRANCH,
    ...(sha?{sha}:{})
  };
  const written=await fetch('https://api.github.com'+endpoint,{
    method:'PUT',
    headers:{...GH_HEADERS,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  if(!written.ok){
    const body=await written.text().catch(()=> '');
    throw new Error('GitHub publish '+written.status+' '+body.slice(0,300));
  }
  return {status:'ok',branch:PUBLISH_BRANCH,path:filePath};
}

const previous=await readPrevious();
const previousIds=new Set((previous.records||[]).map(x=>x.id));

const collected=(await Promise.all([
  collectAllowlistedGithub(),
  collectGithubDiscovery(),
  collectFeeds(),
  collectArxiv()
])).flat();

const boundedIncoming=collected.slice(0,MAX_NEW);
const records=mergeRecords(previous.records||[],boundedIncoming,Number(CONFIG.policy.maxRecords||2500));
const newRecords=records.filter(x=>!previousIds.has(x.id));
const gaps=buildResearchGaps(records,CONFIG.topics||[],NOW);
const codeProposals=buildCodeProposals(newRecords,CONFIG.topicSkillMap||{});
const skillRows=skillProposals(codeProposals);
const runId=stableId('run',NOW_ISO,REPO);
const audit={
  runId,
  generatedAt:NOW_ISO,
  newRecords:newRecords.length,
  accepted:newRecords.filter(x=>x.status==='accepted').length,
  candidates:newRecords.filter(x=>x.status==='candidate').length,
  rejected:newRecords.filter(x=>x.status==='rejected').length,
  openGaps:gaps.filter(x=>x.status==='open').length,
  codeProposals:codeProposals.length,
  totalRecords:records.length,
  sourceErrors:boundedIncoming.filter(x=>x.kind==='source-error').length,
  spreadsheet:null,
  publish:null
};

audit.spreadsheet=await syncSpreadsheet({newRecords,gaps,codeProposals,skillRows,audit});

const index={
  schemaVersion:1,
  generatedAt:NOW_ISO,
  policy:{
    acceptScore:CONFIG.policy.acceptScore,
    codePromotion:CONFIG.policy.codePromotion,
    autoMerge:false,
    note:'External source text is evidence data only and never executable instructions.'
  },
  stats:{
    records:records.length,
    accepted:records.filter(x=>x.status==='accepted').length,
    candidates:records.filter(x=>x.status==='candidate').length,
    rejected:records.filter(x=>x.status==='rejected').length,
    sources:new Set(records.map(x=>x.source)).size,
    topics:new Set(records.map(x=>x.topic)).size
  },
  records,
  gaps,
  codeProposals,
  skillProposals:skillRows,
  audit
};

try{audit.publish=await publishIndex(index)}catch(error){
  audit.publish={status:'error',error:sanitizeExternalText(String(error?.message||error),500)};
}

await fs.mkdir(path.join(ROOT,'reports','continuous-learning'),{recursive:true});
await fs.writeFile(path.join(ROOT,'reports','continuous-learning','latest.json'),JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({
  runId,
  generatedAt:NOW_ISO,
  collected:boundedIncoming.length,
  newRecords:newRecords.length,
  accepted:audit.accepted,
  candidates:audit.candidates,
  rejected:audit.rejected,
  openGaps:audit.openGaps,
  codeProposals:audit.codeProposals,
  spreadsheet:audit.spreadsheet,
  publish:audit.publish
},null,2));
