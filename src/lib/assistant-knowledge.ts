export interface KnowledgeEntry {
  id:string;
  title:string;
  tags:string[];
  source:string;
  body:string;
}

export const assistantKnowledge:KnowledgeEntry[]=[
  {id:'bolt-new',title:'Bolt.new browser development model',tags:['bolt','webcontainers','browser','full-stack','terminal','deploy'],source:'stackblitz/bolt.new',body:'Bolt demonstrates that an AI coding surface should control files, packages, terminal, runtime, preview and deployment in one browser workspace. Its key UX is prompt → execute in environment → preview → iterate, not a static code viewer.'},
  {id:'bolt-diy',title:'Bolt.diy extensible provider architecture',tags:['bolt.diy','providers','mcp','snapshots','diff','git','electron'],source:'stackblitz-labs/bolt.diy',body:'Bolt.diy separates the agent harness from model providers, supports snapshots, diffs, file locking, Git, deployment, MCP and an Electron surface. PredictLM should keep provider choice independent from the workspace and preserve reversible project state.'},
  {id:'kiro',title:'Kiro spec-driven development',tags:['kiro','specs','steering','hooks','skills','permissions','checkpoints'],source:'kirodotdev/Kiro',body:'Kiro emphasizes requirements, design and implementation specs, correctness checks, steering rules, custom agents, hooks, permissions and checkpoints. The lesson for PredictLM is to make Build mode spec-aware and review changes against requirements before shipping.'},
  {id:'ralph',title:'Ralph iterative orchestration',tags:['ralph','orchestrator','loops','backpressure','agents','tests'],source:'mikeyobrien/ralph-orchestrator',body:'Ralph keeps specialized agents in an iteration loop until completion or a stop condition. Backpressure rejects incomplete work when tests, lint or typecheck fail. PredictLM can use this as an orchestration pattern rather than a one-shot generator.'},
  {id:'memory-forge',title:'Editable conversation memory',tags:['memory','sessions','edit','resume','fork','audit'],source:'voidcraft-dev/memory-forge-rs',body:'Memory Forge treats conversation history as an editable artifact. Users can correct wrong assumptions, inject missing context, archive sessions and export them. PredictLM should preserve chat history separately from build logs and allow memory correction.'},
  {id:'aicodeguide',title:'AI coding practices',tags:['ai coding','vibe coding','agents','mcp','practice'],source:'automata/aicodeguide',body:'AI coding quality comes from model capability plus context, tools, verification and workflow. Better prompts alone are not enough. PredictLM should combine retrieval, environment tools, tests and reversible edits.'},
  {id:'microsoft-ai-beginners',title:'AI foundations',tags:['ai','ml','neural networks','fundamentals','ethics'],source:'microsoft/AI-For-Beginners',body:'AI systems include classical methods and neural models. A repository of lessons can supply knowledge and examples, but it does not itself become a trained language model. Inference capability must come from a model/runtime.'},
  {id:'microsoft-agents',title:'Agent lifecycle',tags:['agents','production','tools','memory','evaluation','observability'],source:'microsoft/Building-AI-Agents-From-Zero-To-Production',body:'Production agents need a lifecycle: define goals, select model and tools, manage context and memory, evaluate outputs, add observability and deploy with guardrails. PredictLM should expose these as product capabilities, not hidden assumptions.'},
  {id:'clone-wars',title:'Open source product alternatives',tags:['clone','opensource','alternatives','products'],source:'GorvGoyl/Clone-Wars',body:'Clone Wars catalogs open-source alternatives to popular products. The useful pattern is reference-driven product reconstruction: identify capabilities, workflows and UX primitives, then implement an original system without blindly copying proprietary code.'},
  {id:'opencode',title:'Agentic code workspace',tags:['opencode','agent','code','terminal','tools'],source:'anomalyco/opencode + opencode-ai/opencode',body:'OpenCode-style systems treat coding as an agent loop over repository context, tools, edits and verification. PredictLM Build mode should reason over the current project rather than regenerate from scratch.'},
  {id:'codex',title:'Coding agent execution model',tags:['codex','coding agent','patch','tests','repository'],source:'openai/codex',body:'Coding agents are most useful when they inspect the repository, make targeted edits, run validation and explain results. The core pattern is environment-aware execution with checkpoints.'},
  {id:'langflow',title:'Composable AI flows',tags:['langflow','flows','nodes','agents','pipelines'],source:'langflow-ai/langflow',body:'Composable node/flow systems make agent pipelines understandable and reusable. PredictLM can represent research, planning, coding, testing and review as explicit stages.'},
  {id:'nextchat',title:'Normal conversational AI surface',tags:['chat','nextchat','conversation','models','ui'],source:'ChatGPTNextWeb/NextChat',body:'A normal AI surface should prioritize conversation: history, model/mode controls, composer, attachments and readable answers. Coding tools should be a mode, not the entire default interface.'},
  {id:'firebase-studio',title:'Chat and code as separate surfaces',tags:['firebase studio','code','preview','workspace','switch'],source:'product-pattern',body:'Firebase Studio-like UX separates conversational prompting from a developer workspace. A user can stay in normal assistant mode, then switch into code/build mode when the task needs files, editor and preview.'},
  {id:'onlook',title:'Visual editing over code',tags:['onlook','visual editor','dom','code'],source:'onlook-dev/onlook',body:'Visual editing is strongest when clicks on the rendered UI map back to code context. PredictLM Inspect mode should be a bridge into targeted edits, not a disconnected canvas.'},
  {id:'fireplexity',title:'Source-aware research',tags:['research','search','sources','firecrawl'],source:'firecrawl/fireplexity',body:'Research mode should gather current sources, preserve URLs and distinguish retrieved evidence from generated synthesis.'},
  {id:'security',title:'Review-first security',tags:['security','secrets','xss','validation','ship'],source:'vibe-security skill references',body:'Generated apps should be checked for exposed credentials, unsafe HTML, insecure network requests, unvalidated inputs and missing tests before deployment.'},
  {id:'design',title:'Design quality system',tags:['design','taste','spacing','hierarchy','responsive'],source:'design skill references',body:'Premium UI quality comes from consistent spacing, typography hierarchy, restrained color, clear states, responsiveness and functional interaction. Visual polish should follow function, not replace it.'},
];

const tokenize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(x=>x.length>2);

export function retrieveKnowledge(query:string,limit=6){
  const q=tokenize(query);
  return assistantKnowledge.map(entry=>{
    const hay=tokenize(entry.title+' '+entry.tags.join(' ')+' '+entry.body+' '+entry.source);
    const set=new Set(hay);
    let score=0;
    for(const token of q) if(set.has(token)) score+=3; else if(hay.some(x=>x.startsWith(token)||token.startsWith(x))) score+=1;
    if(query.toLowerCase().includes(entry.id.replace(/-/g,' ')))score+=6;
    return {entry,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.entry);
}

export function knowledgeContext(query:string,limit=5){
  return retrieveKnowledge(query,limit).map((x,i)=>'['+(i+1)+'] '+x.title+' — '+x.body+' Source: '+x.source).join('\n');
}
