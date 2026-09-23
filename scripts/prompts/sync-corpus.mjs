import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'src/lib/prompt-os/corpus.generated.ts');
const TOKEN=process.env.GITHUB_TOKEN||'';
const SOURCES=[
  {repo:'Anil-matcha/awesome-gpt-6-astra',branch:'main',mode:'copy',license:'MIT'},
  {repo:'TripoGrowthLab/awesome-astra-prompts',branch:'main',mode:'metadata',license:'mixed'},
  {repo:'m4vic/promptxploit',branch:'main',mode:'metadata',license:'MIT',evalOnly:true},
  {repo:'regaan/basilisk',branch:'main',mode:'metadata',license:'AGPL-3.0',evalOnly:true},
  {repo:'elder-plinius/CL4R1T4S',branch:'main',mode:'metadata',license:'AGPL-3.0'},
  {repo:'asgeirtj/system_prompts_leaks',branch:'main',mode:'metadata',license:'unknown'}
];
for(const repo of String(process.env.PREDICT_PROMPT_REPOS||'').split(',').map(x=>x.trim()).filter(Boolean)){
  SOURCES.push({repo,branch:'main',mode:'copy',license:'user-owned'});
}
const headers={Accept:'application/vnd.github+json','User-Agent':'PredictLM-PromptCorpus/1.0',...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})};
async function json(url){const r=await fetch(url,{headers});if(!r.ok)throw new Error(r.status+' '+r.statusText);return r.json()}
async function text(url){const r=await fetch(url,{headers:TOKEN?{Authorization:'Bearer '+TOKEN}:{}});if(!r.ok)throw new Error(r.status+' '+r.statusText);return r.text()}
function tagsFor(raw){const stop=new Set(['this','that','with','from','your','para','como','uma','prompt','system']);const m=new Map();for(const w of String(raw).toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').split(/[^a-z0-9]+/).filter(x=>x.length>=4)){if(!stop.has(w))m.set(w,(m.get(w)||0)+1)}return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0])}
function split(raw,source,file){
  const out=[];let title=path.basename(file),buf=[];
  const flush=()=>{const body=buf.join('\n').trim();buf=[];if(body.length<80||body.length>10000)return;if(!/(prompt|instruction|workflow|agent|task|you are|role|objective|goal)/i.test(body))return;const id=crypto.createHash('sha1').update(source+file+title+body).digest('hex').slice(0,16);out.push({id:'ext-'+id,title:title.slice(0,140),category:/code|developer/i.test(title+body)?'code':/research|search/i.test(title+body)?'research':/image|video|visual|3d/i.test(title+body)?'media':'general',tags:tagsFor(title+' '+body),text:body.slice(0,5000),source:source+'/'+file,kind:'system-pattern'})};
  for(const line of String(raw).replace(/\r/g,'').split('\n')){const h=line.match(/^#{1,4}\s+(.+)/);if(h){flush();title=h[1].trim()}else{buf.push(line);if(buf.join('\n').length>6000)flush()}}flush();return out;
}
const seed=[
{id:'answer-first',title:'Resposta primeiro',category:'general',tags:['resposta','foco','chat'],text:'Responda a pergunta primeiro e omita detalhes do motor que não mudam a resposta.',source:'PredictLM',kind:'system-pattern'},
{id:'process-evidence',title:'Processo evidence-first',category:'legal',tags:['processo','cnj','datajud','djen'],text:'Cruze as fontes disponíveis; erro não é zero resultados; ausência pública não prova inexistência.',source:'PredictLM',kind:'system-pattern'},
{id:'build-continuity',title:'Build contínua',category:'code',tags:['build','continuidade','patch'],text:'Preserve o projeto atual e faça patch mínimo. Só reinicie com ordem explícita.',source:'PredictLM',kind:'system-pattern'}
];
const corpus=[...seed],report=[];
for(const src of SOURCES){
  try{
    const tree=await json('https://api.github.com/repos/'+src.repo+'/git/trees/'+src.branch+'?recursive=1');
    const eligible=(tree.tree||[]).filter(x=>x.type==='blob'&&/\.(md|mdx|txt)$/i.test(x.path)&&!/(license|changelog|vendor|dist|assets\/)/i.test(x.path)&&/(prompt|agent|skill|instruction|workflow|readme|docs\/)/i.test(x.path)).slice(0,220);
    report.push({repo:src.repo,mode:src.mode,license:src.license,eligible:eligible.map(x=>x.path)});
    if(src.mode!=='copy'||src.evalOnly)continue;
    for(const item of eligible){
      if((item.size||0)>350000)continue;
      try{corpus.push(...split(await text('https://raw.githubusercontent.com/'+src.repo+'/'+src.branch+'/'+item.path),src.repo,item.path))}catch{}
      if(corpus.length>=4000)break;
    }
  }catch(e){report.push({repo:src.repo,error:String(e)})}
}
const seen=new Set(),dedup=corpus.filter(p=>{const k=crypto.createHash('sha1').update(String(p.text).replace(/\s+/g,' ').trim().toLowerCase()).digest('hex');if(seen.has(k))return false;seen.add(k);return true});
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.mkdirSync(path.join(ROOT,'reports/prompts'),{recursive:true});
fs.writeFileSync(OUT,`/** GENERATED — do not hand edit. */\nexport type CorpusPrompt={id:string;title:string;category:string;tags:string[];text:string;source:string;kind:'system-pattern'|'user-template'|'eval'};\nexport const GENERATED_PROMPT_CORPUS:CorpusPrompt[]=${JSON.stringify(dedup,null,2)} as CorpusPrompt[];\n`);
fs.writeFileSync(path.join(ROOT,'reports/prompts/source-index.json'),JSON.stringify({generatedAt:new Date().toISOString(),count:dedup.length,sources:report},null,2));
console.log('Prompt corpus:',dedup.length);
