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
  ['Quincunx33/LowRAM-AI-Compiler','main','unverified','reference',['memory-budget','gguf','mmap','streaming','low-ram']],
  ['HKUDS/DeepTutor','main','Apache-2.0','reference',['tutoring','mastery-learning','quiz','reading','citations','rag','practice','memory','context-budget']],
  ['cortextorlab/airLLM','main','Apache-2.0','reference',['local-inference','layerwise-offload','low-vram','prefetch','quantization']],
  ['nguefackuriel/Run-Llama3-70B-with-just-4GB-memory-GPU','main','unverified','reference',['airllm','llama3','low-vram']],
  ['xinntao/Real-ESRGAN','master','BSD-3-Clause','reference',['image-upscaling','super-resolution','restoration','media']],
  ['JingyunLiang/SwinIR','main','Apache-2.0','reference',['image-restoration','super-resolution','denoise','media']],
  ['AIGeniusInstitute/deepthink','main','MIT','reference',['deep-reasoning','loop-engineering','agents','observability','self-improve']],
  ['WatVis/DeepThInk','main','unverified','reference',['human-ai','creative-ai','computer-vision','collaboration']],
  ['ashishpatel26/500-AI-Machine-learning-Deep-learning-Computer-vision-NLP-Projects-with-code','main','unverified','reference',['ml-projects','computer-vision','nlp','learning']],
  ['qxresearch/qxresearch-event-1','master','MIT','reference',['python','ml-projects','apps','learning']],
  ['felladrin/awesome-ai-web-search','main','unverified','reference',['web-search','research','rag','agents']],
  ['darkdevil3610/100-AI-Machine-learning-Deep-learning-Computer-vision-NLP','main','unverified','reference',['ml-projects','computer-vision','nlp','learning']],
  ['microsoft/ML-For-Beginners','main','MIT','reference',['machine-learning','curriculum','projects','quiz']],
  ['lutzroeder/netron','main','MIT','reference',['model-inspection','onnx','gguf','tflite','safetensors']],
  ['dragen1860/Deep-Learning-with-TensorFlow-book','master','noncommercial-notice','reference',['tensorflow','deep-learning','learning']],
  ['ludwig-ai/ludwig','main','Apache-2.0','reference',['training','finetuning','lora','quantization','ml']],
  ['clearml/clearml','master','Apache-2.0','reference',['mlops','experiments','observability','artifacts']],
  ['ikaijua/Awesome-AITools','main','unverified','reference',['ai-tools','discovery','providers']],
  ['EwingYangs/awesome-open-gpt','main','unverified','reference',['open-gpt','agents','tools']],
  ['ashishpatel26/Tools-to-Design-or-Visualize-Architecture-of-Neural-Network','master','unverified','reference',['model-visualization','neural-network','architecture']],
  ['preangelleo/gemini_deep_research','main','unverified','reference',['deep-research','search','crawl','citations','token-budget']],
  ['eRuaro/open-gemini-deep-research','main','unverified','reference',['deep-research','research-tree','citations','concurrency','query-dedup']],
  ['MaxiDonkey/DelphiGemini','main','MIT','reference',['gemini','streaming','agents','deep-research','files','grounding']],
  ['MaxiDonkey/file2knowledge','main','readme-MIT-unverified','reference',['file-search','vector-search','deep-research','documents']],
  ['ddd-by-examples/library-php','master','MIT','reference',['ddd','domain-modeling','event-storming','testing','library']],
  ['daryllxd/lifelong-learning','master','Unlicense','reference',['learning-notes','books','courses','lifelong-learning']],
  ['GITenberg/The-Prince_1232','master','Project-Gutenberg','reference',['public-domain-books','history','reading']],
  ['w4rlock999/ThePrinceGPT','main','unverified','reference',['book-rag','interactive-reading']],
  ['devxhub/awesome-book-collection','main','mixed-content-risk','reference',['books','software-engineering']],
  ['eyeke04/Books','master','unverified','reference',['quarantine','books']],
  ['sunnychase/open-higgsfield-ai','main','unverified','reference',['media','higgsfield','workflow']],
  ['petergyang/no-ai-slop','main','MIT','reference',['writing-quality','ai-slop','editing']],
  ['conorbronsdon/avoid-ai-writing','main','MIT','reference',['writing-quality','editing','style']],
  ['every-app/open-seo','main','MIT','reference',['seo','web','metadata','audit']],
  ['Anil-matcha/Open-Generative-AI','main','unverified','reference',['generative-ai','examples','learning']],
  ['Anil-matcha/Anil-matcha','main','unverified','reference',['ai-tools','portfolio','learning']],
  ['ComposioHQ/composio','next','MIT','reference',['tools','integrations','agents','orchestration']],
  ['Autom8AI/Open-Higgsfield-AI','main','unverified','reference',['media','higgsfield','workflow']],
  ['higgsfield-ai/cli','main','MIT','reference',['media','cli','image','video','3d','audio']],
  ['tashfeenahmed/freellmapi','main','MIT','reference',['model-router','openai-compatible','local-api','free-provider-routing']],
  ['melgarafael/DeskcommCRM','main','unverified','reference',['crm','architecture','workflow']],
  ['msitarzewski/agency-agents-app','main','unverified','reference',['agents','ui','orchestration']],
  ['jnMetaCode/agency-agents-pt-BR','main','unverified','reference',['agents','roles','pt-br']],
  ['msitarzewski/agency-agents','main','MIT','reference',['agents','roles','handoff','orchestration']],
  ['zai-org/GLM-5','main','Apache-2.0','reference',['llm','glm','inference','agents']],
  ['THUDM/GLM','main','unverified','reference',['llm','glm','inference']],
  ['JustVugg/colibri','main','unverified','reference',['agents','memory','orchestration']],
  ['XanuNetworks/GLM-5.2-QuantTrio-DCP-4x-DGX-Spark','main','unverified','reference',['glm','quantization','multi-gpu','reference']],
  ['SnailSploit/Claude-Red','main','unverified','reference',['quarantine','red-team','threat-model']],
  ['stickerdaniel/linkedin-mcp-server','main','unverified','reference',['linkedin','mcp','external-integration']],
  ['OpenHands/OpenHands','main','MIT','reference',['coding-agent','planning','tools','sandbox','review']],
  ['Nagi-ovo/voyager','main','unverified','reference',['agents','learning','memory']],
  ['kyegomez/OpenMythos','main','unverified','reference',['agents','orchestration','reasoning']],
  ['awarexone/Agentic-Bug-Hunter','main','MIT','reference',['defensive-security','bug-hunting','review','qa']],
  ['mendableai/open-lovable','main','unverified','reference',['app-builder','website-cloning','firecrawl','sandbox','react']],
  ['andregod/APIFirebase','main','unverified','reference',['quarantine','firebase','api']],
  ['lm-sys/FastChat','main','Apache-2.0','reference',['model-serving','openai-compatible','evaluation','multi-model']],
  ['Panniantong/Agent-Reach','main','MIT','reference',['agents','web-reach','tools','browser']],
  ['d60/twikit','main','MIT','reference',['twitter','scraping','external-bridge','social']],
  ['Xquik-dev/x-twitter-scraper','master','MIT','reference',['twitter','api','mcp','external-bridge']],
  ['composio-temp/grok-with-twitter','main','unverified','reference',['twitter','composio','tools','external-bridge']],
  ['CodebuffAI/freebuff','main','Apache-2.0','reference',['coding-agent','build','research','parallel-agents']],
  ['W1CAPITAL/LexisPredict','main','proprietary-owned-reference','reference',['saas','legal','crm','ocr','reports','kpi','offline']],
  ['nolly-studio/cult-ui','main','MIT','reference',['ui','agents','accessibility','saas']],
  ['nolly-studio/cult-directory-template','main','EULA','reference',['saas','directory','ui']],
  ['eigenpal/docx-editor','main','Apache-2.0+Pro','reference',['docx','ooxml','editor']],
  ['felipemvrin/foliospark','main','unverified','reference',['portfolio','ui','saas']],
  ['siddhesh-desai/SlideAI','main','unverified','reference',['pptx','presentation','ai']],
  ['atharva9167j/dom-to-pptx','master','MIT','reference',['pptx','dom','presentation']],
  ['hugohe3/ppt-master','main','MIT','reference',['pptx','presentation','agents']],
  ['pdfforge/PDFCreator','master','external','reference',['pdf','conversion']],
  ['Stirling-Tools/Stirling-PDF','main','mixed-MIT-proprietary','reference',['pdf','ocr','conversion','automation']],
  ['jezlan/xcelform','main','unverified','reference',['xlsx','templates','preview']],
  ['presenton/presenton','main','Apache-2.0','reference',['pptx','presentation','api']],
  ['iron-software/IronXL-Examples','main','commercial-dependency','reference',['xlsx','dotnet']],
  ['ghiscoding/excel-builder-vanilla','main','MIT','reference',['xlsx','typescript','export']],
  ['Kowts/excel-creator','main','MIT','reference',['xlsx','openpyxl','charts','validation']],
  ['AyushmanGupta21/Bloom','main','unverified','reference',['app-builder','website-builder','streaming','preview']],
  ['scosman/CMSaasStarter','main','MIT','reference',['saas','auth','billing','dashboard','email']],
  ['wasp-lang/open-saas','main','MIT','reference',['saas','auth','billing','fullstack']],
  ['Anil-matcha/awesome-generative-ai-apps','main','MIT','reference',['ai-saas','auth','billing','vercel']],
  ['jatingargiitk/saas-builder','main','MIT','reference',['app-builder','saas','react','flask','sqlite']],
  ['ixartz/SaaS-Boilerplate','main','MIT','reference',['saas','multi-tenant','rbac','testing','monitoring']],
  ['alifarooq9/launchmvpfast','main','MIT','reference',['saas','starter','components']],
  ['robbins23/daisyui-admin-dashboard-template','master','MIT','reference',['admin','dashboard','sidebar','calendar','charts']],
  ['wrsrsh/startstack','main','MIT','reference',['saas','auth','drizzle','postgres','analytics']],
  ['LlamaGenAI/awesome-free-saas','master','MIT','reference',['saas','discovery','catalog']],
  ['twentyhq/twenty','main','AGPL-3.0+commercial','reference',['crm','workflow','custom-fields','workspace']],
  ['frappe/erpnext','develop','GPL-3.0','reference',['erp','crm','finance','inventory','business-os']],
  ['hcengineering/platform','develop','EPL-2.0','reference',['business-os','crm','project-management','hr','chat']],
  ['jtylek/EpesiCRM','main','unverified','reference',['crm','contacts','sales','activities']],
  ['vladandreevg/salesmancrm','master','Apache-2.0','reference',['crm','sales','pipeline']],
  ['trycompai/crm','release','MIT','reference',['crm','agents','evidence','followups','work-queue']],
  ['MasteraSnackin/CreatorHub','master','unverified','reference',['creator','content','analytics','video']],
  ['higgsfield-ai/higgsfield','main','Apache-2.0','reference',['gpu','training','orchestration','mlops']],
  ['JacobEvelyn/friends','main','MIT','reference',['relationship-crm','activities','reminders','notes']],
  ['Peppermint-Lab/peppermint','main','unverified','reference',['helpdesk','tickets','sla','notes','customers']],
  ['go2ismail/Free-CRM','master','CC-BY-4.0','reference',['crm','campaigns','leads','budgets','sales']],
  ['Dioque/Livros','main','unverified','reference',['quarantine','books']],
  ['Starlink/starlink','master','unverified','reference',['space','starlink','scientific-software']],
  ['nasa-gibs/worldview','main','NASA-1.3','reference',['earth-observation','satellite-imagery','gibs','maps']],
  ['gibme-npm/starlink','master','MIT','train',['starlink','grpc','telemetry','enterprise-api']],
  ['r-spacex/SpaceX-API','master','Apache-2.0','train',['space','spacex','rest-api','launch-data']],
  ['Baptajck/space','master','MIT','train',['space','frontend','spacex-data']],
  ['Kitsunp/kistmath-ai','main','MIT','train',['math','symbolic-reasoning','curriculum-learning','memory']],
  ['adjs/am-cq','master','unverified','reference',['machine-learning','quantum-computing','education']],
  ['quantumgercom/Link-Layer-Schudeling','main','unverified','reference',['quantum','networking','scheduling']],
  ['krissiazawadzki/informacao_computacao_quantica','main','unverified','reference',['quantum','information','education']],
  ['smendoncabruna/ComputacaoQuantica','main','unverified','reference',['quantum','education','portuguese']],
  ['Universidade-Livre/matematica','main','MIT','train',['math','curriculum','education','portuguese']],
  ['TechTastic/Advanced-Math','main','MIT','train',['math','linear-algebra','statistics','quaternions','pid']],
  ['oalanicolas/ia','main','unverified','reference',['ai','learning','tools']],
  ['MoKangMedical/digital-sage','main','MIT','train',['socratic-dialogue','persona','tutoring','memory','saas']],
  ['vercel/vercel','main','Apache-2.0','train',['vercel','deploy','build','cli','platform']],
  ['ronilsondesouza045-beep/wotlk-local-server-kit','main','unverified','reference',['local-server','service-orchestration','health-check','portable-kit']],
  ['netdata/netdata','master','GPL-3.0','reference',['observability','metrics','alerts','anomaly-detection']],
  ['FTShare-Lab/FTShare-MCP','main','MIT','train',['finance','mcp','structured-data','agents']],
  ['edilsonaguiais/sgs-peritos','main','MIT','train',['bcb','sgs','forensic-finance','interest-rates','brazil']],
  ['FTShare-Lab/FTShare-skill','main','MIT','train',['finance','agent-skill','routing','structured-data']],
  ['ergonzamarian/Analisador-de-Sentimentos','master','unverified','reference',['sentiment-analysis','human-signals','classification','evaluation']],
  ['msfidelis/gmud-for-the-win','master','unverified','reference',['change-management','git','ci','release-ops']],
  ['sheepzh/make-zero','main','MIT','reference',['privacy','browser-extension','local-encryption','security-ux']],
  ['leonardosegfault/humilhador-de-github','main','MIT','reference',['tone','sarcasm','consent','github-profile','rate-limit']],
  ['neurolib-dev/neurolib','master','MIT','distill',['neuroscience','neural-mass','connectivity','simulation']],
  ['openMetadataInitiative/openMINDS','main','MIT','distill',['neuroscience','metadata','provenance','ontology']],
  ['HumanBrainProject/openMINDS','main','MIT','reference',['neuroscience','metadata','deprecated']],
  ['TheDragonChild/FlyPuter','main','MIT','distill',['connectome','sensorimotor','flywire','simulation']],
  ['FoundationAgents/MetaGPT','main','MIT','distill',['agents','roles','sop','orchestration']],
  ['PavelDoGreat/WebGL-Fluid-Simulation','master','MIT','distill',['webgl','visual-dynamics','browser-simulation']],
  ['ludenio/SuperWEIRDGameKit','main','CC0-1.0','distill',['simulation','world-management','production','2d-world']],
  ['fullya99/worldbox-mcp','main','MIT','distill',['simulation','observe-act-loop','multi-agent','world-state']],
  ['A2Faisal/SESAME','main','MIT','distill',['geospatial','human-earth','grids','simulation-data']],
  ['developerrahulofficial/AI-Girlfriend','main','MIT','reference',['avatar','voice','persona','memory']],
  ['bulletphysics/bullet3','master','Zlib','reference',['physics','collision','robotics','simulation']],
  ['dhorions/Capital-and-Cargo','master','Unlicense','reference',['economy','transport','reputation','automation']],
  ['OpenRCT2/OpenRCT2','develop','GPL-3.0+','reference',['management-simulation','agent-ai','world-state']],
  ['WorldBoxOpenMods/ModLoader','master','MIT','reference',['world-modules','plugins','simulation']],
  ['Sairamg18814/shvayambhu','main','Apache-2.0','reference',['self-reference','introspection','consciousness-claims']],
  ['robert1811/life-simulator','main','unverified','reference',['life-simulation','events','career','relationships']],
  ['bitlifefreeonline/bitlife','main','unverified','reference',['life-simulation','events','local-storage']],
  ['Krobix/life.html','master','unverified','reference',['life-simulation','negative-reference']],
  ['Qwizer/realmap-10x','master','unverified','reference',['quarantine','credentials-risk']],
  ['alestanalves/real-life-gaming','main','unverified','reference',['2d-world','phaser','local-storage','simulation-ui']],
  ['SimonSaysGiveMeSmile/gtasf.lol','main','unverified','reference',['world-rendering','react-three-fiber','simulation-ui']],
  ['HelloFangaming/HelloMarioEngine','master','BSD-3-Clause','distill',['2d-engine','objects','rooms','event-loop','simulation-ui']],
  ['EasyRPG/Player','master','GPL-3.0','reference',['2d-runtime','interpreter','platform-abstraction','emscripten']],
  ['niksudan/prettylight','master','MIT','distill',['2d-lighting','shaders','surfaces','simulation-ui']],
  ['YoYoGames/GameMaker-HTML5','develop','Apache-2.0','distill',['html5-runtime','canvas','input','audio','render-loop','browser']],
  ['YoYoGames/GameMaker-Manual','develop','copyrighted-docs','reference',['gamemaker','runtime-docs','html5','assets','build']],
  ['Xiphereal/TheSims','trunk','unverified','reference',['life-simulation','agent-actions','world-state']],
  ['DewingShen88/sims4-immersive-controls','main','MIT-by-README','reference',['life-simulation','autonomy','interaction-weights','memory','reversible-actions']],
  ['francot514/FreeSims','master','MPL-2.0','reference',['life-simulation','world-state','work','neighborhood','household']],
  ['oraksi/Sims-4-Respocket-DLC-Tool','main','unverified','reference',['quarantine','dlc-circumvention']],
  ['savannah-medina85/sims-4-dlc-unlock','main','unverified','reference',['quarantine','dlc-circumvention']],
  ['protonspy/JusChat','main','CC0-1.0','train',['legal','graphrag','knowledge-graph','documents','rag']],
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
