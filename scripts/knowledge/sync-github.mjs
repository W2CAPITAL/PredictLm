import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const CONFIG=JSON.parse(fs.readFileSync(path.join(ROOT,'config','github-knowledge-sources.json'),'utf8'));
const OUT=path.join(ROOT,'src','data','github-knowledge-index.json');
const REPORT=path.join(ROOT,'reports','github-knowledge','manifest.json');
const TOKEN=String(process.env.GITHUB_TOKEN||'').trim();
const headers={Accept:'application/vnd.github+json','User-Agent':'PredictLM-GitHub-Knowledge/1.0',...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})};
const rawHeaders={'User-Agent':'PredictLM-GitHub-Knowledge/1.0',...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})};
const allowed=new Set(CONFIG.policy.allowedLicenses||[]);
const MAX_FILES=Number(CONFIG.policy.maxFilesPerRepo||120);
const MAX_CHUNKS_PER_REPO=Number(CONFIG.policy.maxChunksPerRepo||260);
const MAX_BYTES=Number(CONFIG.policy.maxFileBytes||140000);
const CHUNK=Number(CONFIG.policy.maxChunkChars||1200);

function norm(s){return String(s||'').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{4,}/g,'\n\n\n').trim()}
function allowedPath(file,include){
  if(!/\.(?:md|mdx|txt)$/i.test(file))return false;
  if(/(?:^|\/)(?:node_modules|vendor|dist|build|coverage|assets|images?|screenshots?|fixtures?|snapshots?)(?:\/|$)/i.test(file))return false;
  return (include||[]).some(rule=>rule.endsWith('/')?file.startsWith(rule):file===rule||file.startsWith(rule+'/'));
}
function splitMarkdown(text,meta){
  const rows=[]; let heading=meta.path; let buf=[];
  const flush=()=>{
    const body=norm(buf.join('\n'));buf=[];
    if(body.length<100)return;
    for(let i=0;i<body.length;i+=CHUNK){
      const part=body.slice(i,i+CHUNK).trim();
      if(part.length<100)continue;
      rows.push({
        id:crypto.createHash('sha1').update(meta.source+'|'+meta.ref+'|'+meta.path+'|'+heading+'|'+i+'|'+part).digest('hex').slice(0,20),
        source:meta.source,ref:meta.ref,path:meta.path,license:meta.license,domains:meta.domains||[],heading,text:part,weight:meta.weight||1
      });
    }
  };
  for(const line of norm(text).split('\n')){
    const h=line.match(/^#{1,4}\s+(.+)/);
    if(h){flush();heading=h[1].trim();continue}
    buf.push(line); if(buf.join('\n').length>CHUNK*1.5)flush();
  }
  flush(); return rows;
}
async function json(url){const r=await fetch(url,{headers});if(!r.ok)throw new Error(r.status+' '+url);return r.json()}
async function text(url){const r=await fetch(url,{headers:rawHeaders});if(!r.ok)throw new Error(r.status+' '+url);return r.text()}

const chunks=[],report=[];
for(const src of CONFIG.sources||[]){
  const row={repo:src.repo,mode:src.mode,license:src.license,commit:null,files:0,chunks:0,error:null};
  if(src.mode!=='allow'){report.push(row);continue}
  if(!allowed.has(src.license)){row.error='license-not-allowed';report.push(row);continue}
  try{
    const commit=await json('https://api.github.com/repos/'+src.repo+'/commits/'+src.branch);
    row.commit=commit.sha;
    const tree=await json('https://api.github.com/repos/'+src.repo+'/git/trees/'+commit.sha+'?recursive=1');
    const files=(tree.tree||[]).filter(x=>x.type==='blob'&&Number(x.size||0)<=MAX_BYTES&&allowedPath(x.path,src.include)).slice(0,MAX_FILES);
    row.files=files.length;
    for(const file of files){
      if(row.chunks>=MAX_CHUNKS_PER_REPO)break;
      try{
        const raw=await text('https://raw.githubusercontent.com/'+src.repo+'/'+commit.sha+'/'+file.path);
        const parts=splitMarkdown(raw,{source:src.repo,ref:commit.sha.slice(0,12),path:file.path,license:src.license,domains:src.domains,weight:src.weight});
        const remaining=Math.max(0,MAX_CHUNKS_PER_REPO-row.chunks);
        const selected=parts.slice(0,remaining);
        chunks.push(...selected); row.chunks+=selected.length;
      }catch{}
    }
  }catch(e){row.error=String(e?.message||e)}
  report.push(row);
}
const seen=new Set();
const dedup=chunks.filter(x=>{
  const h=crypto.createHash('sha1').update(x.text.replace(/\s+/g,' ').toLowerCase()).digest('hex');
  if(seen.has(h))return false;seen.add(h);return true;
});
const hash=crypto.createHash('sha256').update(dedup.map(x=>x.id).join('|')).digest('hex').slice(0,16);
const payload={schemaVersion:1,knowledgeVersion:hash,generatedAt:new Date().toISOString(),sourceCount:new Set(dedup.map(x=>x.source)).size,chunkCount:dedup.length,chunks:dedup};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.mkdirSync(path.dirname(REPORT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
fs.writeFileSync(REPORT,JSON.stringify({generatedAt:payload.generatedAt,knowledgeVersion:hash,chunkCount:dedup.length,sources:report},null,2)+'\n');
console.log('GitHub Knowledge Engine:',dedup.length,'chunks · version',hash);
