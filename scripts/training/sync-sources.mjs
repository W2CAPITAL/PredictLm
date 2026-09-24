import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const OUT_DIR=path.join(ROOT,'training');
const REPORT_DIR=path.join(ROOT,'reports','training');
const TOKEN=String(process.env.GITHUB_TOKEN||'').trim();
const MAX_FILES=Number(process.env.TRAIN_MAX_FILES_PER_REPO||80);
const MAX_CHUNKS=Number(process.env.TRAIN_MAX_CHUNKS||5000);

const SOURCES=[
  ['assistant-ui/assistant-ui','main','MIT','train',['chat','ui','tools']],
  ['OvidijusParsiunas/deep-chat','main','MIT','train',['chat','browser-model','session']],
  ['EniasCailliau/GirlfriendGPT','main','unverified','reference',['persona','memory']],
  ['LiveHelperChat/livehelperchat','master','Apache-2.0','train',['support','chat','operations']],
  ['nextlevelbuilder/ui-ux-pro-max-skill','main','MIT','train',['design','ui','ux']],
  ['snorkelingcode/Embody-Unreal-Engine-Source','master','unverified','reference',['embodiment','realtime']],
  ['Someshdiwan/How-Transformer-LLMs-Work','main','Apache-2.0','train',['llm','training','transformers']],
  ['Matrixxboy/Psymitrix','main','MIT','train',['conversation','emotion','product']],
  ['24kchengYe/human-skill-tree','master','NOASSERTION','reference',['curriculum','skills','learning']],
  ['cporter202/automate-for-growth','main','unverified','reference',['automation','content','growth']],
  ['microsoft/AI-For-Beginners','main','MIT','train',['ai','ml','fundamentals']],
  ['fjosue4/deprecated-google-gemini-ui','main','MIT','train',['chat','gemini','ui']],
  ['ruvnet/ruflo','main','MIT','train',['agents','memory','federation','rag']],
  ['truongnh1992/gemini-ai-code-reviewer','main','MIT','train',['code-review','github','quality']],
  ['Addy-shetty/Vibe-Prompting','main','MIT','train',['prompting','streaming','supabase']],
  ['siddharthsky/AI-Video-Summarizer','main','MIT','train',['video','summarization','multimodal']],
  ['ishara-madu/gemini-watermark-remover','main','MIT','distill',['media','client-processing']],
  ['lcandy2/enable-chrome-ai','main','MIT','distill',['browser-ai','capability-detection']],
  ['google/langextract','main','Apache-2.0','train',['extraction','grounding','documents']],
  ['PublicAffairs/openai-gemini','main','MIT','train',['providers','openai-compatible','gemini']],
  ['raizamartin/gemini-code','main','unverified','reference',['coding-agent','tools','terminal']],
  ['iamakashpc/Gemini-Clone','main','unverified','reference',['chat','gemini','ui']],
  ['RanitManik/Gemini-Clone','main','MIT','train',['chat','gemini','ui']],
  ['GourangaDasSamrat/Gemini-Clone','master','MIT','train',['chat','gemini','markdown','ui']],
  ['C0deNe0/gemini-clone','main','unverified','reference',['chat','vite','ui']],
  ['MAHMOUDELSAYED7/Dr.Ai','main','unverified','reference',['assistant','mobile','firebase','privacy']],
  ['srtab/daiv','main','Apache-2.0','train',['coding-agent','git','mcp','sandbox','ci']],
  ['ekramasif/GeminiCoder','main','unverified','reference',['app-builder','gemini','preview']],
  ['assistants-hub/assistantshub.ai','main','MIT','train',['assistants','multi-provider','analytics','documents','functions']],
  ['junhongmit/FraudGT','main','unverified','reference',['fraud','aml','graph','transactions']],
  ['hunters-sec/opencode','main','MIT','reference',['threat-model','agents','tools','sandbox']],
  ['gaur-avvv/wormxgpt','main','license-conflict','reference',['threat-model','mcp','agents','providers']],
  ['tagore1344/CrimeGPT-AI','main','MIT','distill',['fraud','phishing','url-risk','legal']],
  ['mindsdb/mindshub','main','MIT','reference',['agents','workspace','memory','artifacts','model-router']],
  ['rowboatlabs/rowboat','main','Apache-2.0','reference',['knowledge-graph','memory','browser','background-agents']],
  ['composio-community/open-claude-cowork','master','MIT','reference',['tools','integrations','streaming','sessions','skills']],
  ['Haifai-AI/baby-whale','main','MIT','reference',['artifacts','office','preview','local-first','skills']],
  ['EbookFoundation/free-programming-books','main','CC-BY-4.0','reference',['programming','learning','resources']],
  ['Carlos-CGS/InteligenciaArtificial-IA','main','unverified','reference',['ai-tools','prompts','learning']],
  ['danielgines/infra-ai-prompts','master','unverified','reference',['prompts','devops','documentation']],
  ['tiagopgr/skills-ia','main','unverified','reference',['skills','legal','operations','marketing','code']],
  ['IntelligenzaArtificiale/Free-personal-AI-Assistant-with-plugin','main','GPL-3.0','reference',['plugins','documents','web','audio']],
  ['kimik3moonshotAI/Kimi-K3-Code-Free-Desktop','main','MIT','reference',['quarantine','desktop-ai']],
  ['chatgpt56freeGPT/ChatGPT-5.6-Free-Desktop','main','MIT','reference',['quarantine','desktop-ai']],
  ['RollerManor1/chatgpt-plus-prime','main','unverified','reference',['quarantine','desktop-ai']],
  ['LynxAnnihilate16/bxvdfsur','main','unverified','reference',['quarantine','bypass']],
  ['ryanoasis/nerd-fonts','master','mixed-MIT-OFL','reference',['fonts','design']],
  ['adobe-fonts/source-code-pro','release','OFL-1.1','reference',['fonts','code-ui']],
  ['WestFox-AwA/dsh-prompt-optimizer','main','BSD-3-Clause','reference',['prompt-optimization','context','evidence','token-efficiency']],
  ['drona23/claude-token-efficient','main','MIT','reference',['token-efficiency','output','coding']],
  ['jnbno1163/LG-token-saver','master','MIT','reference',['token-efficiency','context','tools']],
  ['atjsh/llmlingua-2-js','main','MIT','reference',['prompt-compression','browser','transformers']],
  ['nadimtuhin/claude-token-optimizer','main','MIT','reference',['context-budget','docs','token-efficiency']],
  ['Mintplex-Labs/anything-llm','master','MIT','reference',['rag','skill-selection','model-router','memory']],
  ['Zackriya-Solutions/meetily','main','MIT','reference',['transcription','summarization','local-first']],
  ['kwistzzqq-byte/image2-ads-studio','main','Apache-2.0','reference',['media','prompt-compiler','retrieval']],
  ['bentoml/llm-optimizer','main','Apache-2.0','reference',['inference','latency','throughput','slo']],
  ['mozilla-ai/llamafile','main','Apache-2.0','reference',['desktop-runtime','gguf','local-inference']],
  ['qualcomm/GenieX','main','BSD-3-Clause','reference',['snapdragon','on-device','gguf','npu']],
  ['Minhajul-Mahib/nanomind','main','MIT','reference',['low-ram','openai-api','gguf','local-inference']],
  ['techjarves/Uncensored-Local-AI-Multiplatform','main','unverified','reference',['local-api','gguf','mobile','threat-model']],
  ['DeVenLucaz/llamdrop','main','GPL-3.0','reference',['hardware-detection','ollama','gguf','context-trimming','low-ram']],
  ['Quincunx33/LowRAM-AI-Compiler','main','unverified','reference',['memory-budget','gguf','mmap','streaming','low-ram']]
].map(([repo,branch,license,use,domains])=>({repo,branch,license,use,domains}));

const headers={
  Accept:'application/vnd.github+json',
  'User-Agent':'PredictLM-Training/1.0',
  ...(TOKEN?{Authorization:'Bearer '+TOKEN}:{})
};

async function getJson(url){
  const r=await fetch(url,{headers});
  if(!r.ok)throw new Error(r.status+' '+r.statusText+' '+url);
  return r.json();
}
async function getText(url){
  const r=await fetch(url,{headers:TOKEN?{Authorization:'Bearer '+TOKEN}:{'User-Agent':'PredictLM-Training/1.0'}});
  if(!r.ok)throw new Error(r.status+' '+r.statusText+' '+url);
  return r.text();
}
function normalize(raw){
  return String(raw||'').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{4,}/g,'\n\n\n').trim();
}
function eligible(pathname,size,use){
  if(size>280000)return false;
  if(/(?:^|\/)(?:node_modules|vendor|dist|build|coverage|\.git|assets|images?|screenshots?|fixtures?|snapshots?)(?:\/|$)/i.test(pathname))return false;
  if(/(?:license|changelog|package-lock|pnpm-lock|yarn\.lock)$/i.test(pathname))return false;
  if(use==='distill')return /(?:readme|docs?\/|\.mdx?$|\.txt$)/i.test(pathname);
  return /(?:readme|docs?\/|examples?\/|src\/|packages\/).*\.(?:md|mdx|txt|ts|tsx|js|jsx|py)$/i.test(pathname)
    || /^(?:README\.md|SKILL\.md|llms\.txt)$/i.test(pathname);
}
function split(raw,meta){
  const text=normalize(raw);
  if(text.length<120)return [];
  const chunks=[];
  const lines=text.split('\n');
  let buf=[],heading='';
  const flush=()=>{
    const body=normalize(buf.join('\n'));buf=[];
    if(body.length<120)return;
    for(let start=0;start<body.length;start+=4200){
      const part=body.slice(start,start+4800).trim();
      if(part.length<120)continue;
      const id=crypto.createHash('sha1').update(meta.repo+'|'+meta.path+'|'+heading+'|'+start+'|'+part).digest('hex').slice(0,20);
      chunks.push({
        id,
        source:meta.repo,
        path:meta.path,
        license:meta.license,
        use:meta.use,
        domains:meta.domains,
        heading:heading||meta.path,
        text:part
      });
      if(chunks.length>=20)break;
    }
  };
  for(const line of lines){
    const h=line.match(/^#{1,4}\s+(.+)/);
    if(h){flush();heading=h[1].trim();continue}
    buf.push(line);
    if(buf.join('\n').length>5000)flush();
  }
  flush();
  return chunks;
}

fs.mkdirSync(OUT_DIR,{recursive:true});
fs.mkdirSync(REPORT_DIR,{recursive:true});
const corpus=[];
const report=[];

for(const source of SOURCES){
  const row={...source,files:0,chunks:0,error:null};
  try{
    const tree=await getJson('https://api.github.com/repos/'+source.repo+'/git/trees/'+source.branch+'?recursive=1');
    const all=(tree.tree||[]).filter(x=>x.type==='blob');
    row.files=all.length;

    // Unknown/NOASSERTION sources are registered and visible to the app but are
    // not copied into the training corpus.
    if(source.use==='reference'){
      report.push(row);
      continue;
    }

    const files=all.filter(x=>eligible(x.path,Number(x.size||0),source.use)).slice(0,MAX_FILES);
    for(const item of files){
      if(corpus.length>=MAX_CHUNKS)break;
      try{
        const raw=await getText('https://raw.githubusercontent.com/'+source.repo+'/'+source.branch+'/'+item.path);
        const chunks=split(raw,{...source,path:item.path});
        corpus.push(...chunks.slice(0,Math.max(0,MAX_CHUNKS-corpus.length)));
        row.chunks+=chunks.length;
      }catch{}
    }
  }catch(error){
    row.error=String(error?.message||error);
  }
  report.push(row);
}

const seen=new Set();
const dedup=corpus.filter(row=>{
  const key=crypto.createHash('sha1').update(row.text.replace(/\s+/g,' ').toLowerCase()).digest('hex');
  if(seen.has(key))return false;
  seen.add(key);return true;
});

fs.writeFileSync(path.join(OUT_DIR,'corpus.jsonl'),dedup.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(REPORT_DIR,'source-index.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),
  chunks:dedup.length,
  trainableSources:report.filter(x=>x.use!=='reference'&&!x.error).length,
  referenceOnlySources:report.filter(x=>x.use==='reference').length,
  sources:report
},null,2));

console.log('PredictLM corpus:',dedup.length,'chunks from',report.length,'registered sources');
