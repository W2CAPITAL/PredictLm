import crypto from 'node:crypto';

export function normalizeText(value=''){
  return String(value||'')
    .normalize('NFKC')
    .replace(/\r/g,'')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export function stripMarkup(value=''){
  return normalizeText(String(value||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&#39;/gi,"'")
    .replace(/&quot;/gi,'"'));
}

export function sanitizeExternalText(value='',maxChars=1200){
  let text=stripMarkup(value)
    .replace(/\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|system|developer)\s+(instructions?|messages?|prompts?)\b/gi,'[source instruction removed]')
    .replace(/\b(system|developer|assistant)\s*prompt\s*:/gi,'[source prompt label removed]:')
    .replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g,match=>match.slice(0,240))
    .replace(/\b(?:sk|gsk|ghp|github_pat|sk-or-v1)[-_A-Za-z0-9]{12,}\b/g,'[redacted-token]');
  if(text.length>maxChars)text=text.slice(0,maxChars).trim()+'…';
  return text;
}

export function stableId(...parts){
  return crypto.createHash('sha256').update(parts.map(x=>normalizeText(x).toLowerCase()).join('|')).digest('hex').slice(0,24);
}

export function evidenceTrust({kind='',official=false,allowlisted=false,licenseMode='',host='' }={}){
  let score=0.5;
  if(kind==='official-feed'||kind==='official-docs')score=0.96;
  else if(kind==='github-allowlist')score=0.9;
  else if(kind==='academic-preprint')score=0.84;
  else if(kind==='github-discovery')score=0.56;
  else if(kind==='rss')score=0.72;
  if(official)score=Math.max(score,0.93);
  if(allowlisted)score=Math.max(score,0.88);
  if(licenseMode==='allow')score+=0.02;
  if(licenseMode==='quarantine')score=Math.min(score,0.2);
  if(/(?:github\.com|arxiv\.org|developer\.mozilla\.org|cisa\.gov)$/i.test(host||''))score+=0.01;
  return Math.max(0,Math.min(0.99,Number(score.toFixed(2))));
}

export function classifyRecord(record,policy={}){
  const threshold=Number(policy.acceptScore??0.74);
  if(record.quarantined)return 'rejected';
  if(record.kind==='github-discovery'&&!record.allowlisted)return 'candidate';
  if(Number(record.confidence||0)>=threshold)return 'accepted';
  return 'candidate';
}

export function mergeRecords(previous=[],incoming=[],maxRecords=2500){
  const map=new Map();
  for(const record of [...previous,...incoming]){
    if(!record?.id)continue;
    const old=map.get(record.id);
    if(!old||String(record.observedAt||'')>=String(old.observedAt||''))map.set(record.id,record);
  }
  return [...map.values()]
    .sort((a,b)=>String(b.observedAt||'').localeCompare(String(a.observedAt||'')))
    .slice(0,Math.max(100,maxRecords));
}

export function selectRoundRobin(items=[],runNumber=0,count=1){
  if(!items.length||count<=0)return [];
  const size=Math.min(items.length,Math.max(1,count));
  const start=Math.abs(Number(runNumber)||0)%items.length;
  const out=[];
  for(let i=0;i<size;i++)out.push(items[(start+i)%items.length]);
  return out;
}

export function extractXmlEntries(xml=''){
  const blocks=String(xml).match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)||[];
  return blocks.map(block=>{
    const read=(names)=>{
      for(const name of names){
        const m=block.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));
        if(m)return sanitizeExternalText(m[1],1600);
      }
      return '';
    };
    const href=block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]||read(['link']);
    return {
      title:read(['title']),
      summary:read(['summary','description','content']),
      published:read(['published','updated','pubDate']),
      link:sanitizeExternalText(href,700)
    };
  }).filter(x=>x.title||x.summary);
}

export function topicTokens(value=''){
  const stop=new Set(['para','com','uma','the','and','for','from','de','do','da','em','ai','ia']);
  return normalizeText(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu,'')
    .split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!stop.has(x));
}

export function relevanceScore(query='',record={}){
  const q=new Set(topicTokens(query));
  if(!q.size)return 0;
  const fields=[
    [record.title,5],[record.topic,5],[(record.domains||[]).join(' '),4],
    [record.summary,2],[record.source,1]
  ];
  let score=0;
  for(const [field,weight] of fields){
    const hay=new Set(topicTokens(field));
    for(const token of q)if(hay.has(token))score+=weight;
  }
  return score*Number(record.confidence||0.5);
}

export function buildResearchGaps(records=[],topics=[],now=new Date()){
  const nowMs=now.getTime();
  return topics.map(topic=>{
    const matches=records.filter(r=>r.topic===topic.id&&r.status!=='rejected');
    const newest=matches.map(r=>Date.parse(r.observedAt||0)).filter(Number.isFinite).sort((a,b)=>b-a)[0]||0;
    const ageHours=newest?Math.round((nowMs-newest)/3600000):9999;
    const accepted=matches.filter(r=>r.status==='accepted').length;
    const priority=Math.min(100,(accepted<5?45:10)+(ageHours>24?30:0)+(ageHours>72?20:0)+Number(topic.priority||1)*5);
    return {
      id:stableId('gap',topic.id),
      topic:topic.id,
      label:topic.label||topic.id,
      acceptedRecords:accepted,
      lastObservedAt:newest?new Date(newest).toISOString():null,
      ageHours,
      priority,
      status:priority>=55?'open':'covered',
      nextQuery:(topic.githubQueries||[])[0]||topic.arxivQuery||topic.label||topic.id
    };
  }).sort((a,b)=>b.priority-a.priority||a.topic.localeCompare(b.topic));
}

export function buildCodeProposals(newRecords=[],topicSkillMap={}){
  return newRecords
    .filter(r=>r.status==='accepted'&&r.kind==='github-allowlist'&&Number(r.confidence||0)>=0.88)
    .slice(0,20)
    .map(r=>({
      id:stableId('code-proposal',r.id),
      createdAt:r.observedAt,
      topic:r.topic,
      title:'Revisar impacto de '+r.source+' no PredictLM',
      area:(r.domains||[]).slice(0,5).join(', ')||r.topic,
      evidenceIds:[r.id],
      suggestedSkills:topicSkillMap[r.topic]||[],
      risk:'review-required',
      status:'queued',
      action:'compare-current-implementation-then-patch-test-build-pr'
    }));
}
