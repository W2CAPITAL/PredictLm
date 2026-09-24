import { conversationAnswerIssue, isGenericHowTo, isHypotheticalPrompt, responseTopicAlignment } from '@/lib/chat-intelligence';
import crypto from 'node:crypto';
import { githubKnowledgeContext, githubKnowledgeStats, retrieveGitHubKnowledge } from '@/lib/github-knowledge-engine';
import { compactText, optimizePromptPackage } from '@/lib/token-budget';
import { tutorSystemContext } from '@/lib/tutor-mode';
import { globalLearningContext } from '@/lib/global-learning';
import { deepLoopContext } from '@/lib/deep-loop-policy';
import { centumDecisionContext, parallaxContext } from '@/lib/decision-centum';
import { resolveConversationLanguage, languageSystemInstruction, type ConversationLanguage } from '@/lib/language-policy';
import { publicAnswerGate } from '@/lib/public-answer-gate';
import { classifyDomainEngines } from '@/lib/domain-engine-fabric';
import { humanAdversarialContext } from '@/lib/human-adversarial-lens';
import { digitalBrainContext } from '@/lib/digital-brain';
import { humanPresenceContext } from '@/lib/human-presence';
import { isScenarioSimulationRequest, predictLMMasterContext } from '@/lib/predictlm-master';
import { buildReviewContract, planAgenticRun, skillContractContext } from '@/lib/agent-runtime/agentic-fabric';
import { parseJsonObject } from '@/lib/server/provider-mesh';
import { rankHealthyProviders, recordProviderFailure, recordProviderSuccess } from '@/lib/server/provider-health';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Msg={role:'user'|'assistant'|'system';content:string};
type Provider={name:string;base:string;key:string;model:string;headers?:Record<string,string>;protocol?:'openai'|'anthropic'};

declare global{
  var __predictlmChatCache:Map<string,{expires:number,value:any}>|undefined;
}

const cache=globalThis.__predictlmChatCache||(globalThis.__predictlmChatCache=new Map());
const PROVIDER_ATTEMPT_LIMIT=3;
const PROVIDER_TIMEOUT_MS=12000;
const REQUEST_BUDGET_MS=32000;

function loopbackBase(base:string){
  try{
    const host=new URL(base).hostname.toLowerCase();
    return host==='127.0.0.1'||host==='localhost'||host==='0.0.0.0'||host==='::1';
  }catch{return false}
}

function serverCanReach(base:string){
  return !(process.env.VERCEL&&loopbackBase(base));
}

function providers():Provider[]{
  const out:Provider[]=[];
  const push=(p:Provider)=>{
    const key=p.base.replace(/\/$/,'')+'|'+p.model;
    if(!out.some(x=>x.base.replace(/\/$/,'')+'|'+x.model===key))out.push(p);
  };
  if(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL){
    push({name:'server',base:process.env.AI_BASE_URL,key:process.env.AI_API_KEY,model:process.env.AI_MODEL});
  }
  if(process.env.FREELLMAPI_BASE_URL&&process.env.FREELLMAPI_API_KEY){
    const freeBase=process.env.FREELLMAPI_BASE_URL.replace(/\/$/,'');
    const base=freeBase.endsWith('/v1')?freeBase:freeBase+'/v1';
    if(serverCanReach(base))push({
      name:'freellmapi',
      base,
      key:process.env.FREELLMAPI_API_KEY,
      model:process.env.FREELLMAPI_MODEL||'auto'
    });
  }
  if(process.env.OLLAMA_BASE_URL&&process.env.OLLAMA_MODEL){
    const ollamaBase=process.env.OLLAMA_BASE_URL.replace(/\/$/,'');
    const base=ollamaBase.endsWith('/v1')?ollamaBase:ollamaBase+'/v1';
    if(serverCanReach(base))push({
      name:'ollama',
      base,
      key:process.env.OLLAMA_API_KEY||'ollama',
      model:process.env.OLLAMA_MODEL
    });
  }
  if(process.env.OPENCODE_API_KEY){
    push({name:'opencode',base:process.env.OPENCODE_BASE_URL||'https://opencode.ai/zen/v1',key:process.env.OPENCODE_API_KEY,model:process.env.OPENCODE_MODEL||'nemotron-3.5-lightning-free'});
  }
  if(process.env.NVIDIA_API_KEY){
    push({name:'nvidia',base:process.env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1',key:process.env.NVIDIA_API_KEY,model:process.env.NVIDIA_MODEL||'nvidia/nemotron-3.5-lightning-30b-a3b'});
  }
  if(process.env.DEEPSEEK_API_KEY){
    push({name:'deepseek',base:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com/v1',key:process.env.DEEPSEEK_API_KEY,model:process.env.DEEPSEEK_MODEL||'deepseek-flash'});
  }
  if(process.env.KIMI_API_KEY){
    push({name:'kimi',base:process.env.KIMI_BASE_URL||'https://api.moonshot.ai/v1',key:process.env.KIMI_API_KEY,model:process.env.KIMI_MODEL||'kimi-k2.5'});
  }
  if(process.env.ZAI_API_KEY){
    push({name:'zai',base:process.env.ZAI_BASE_URL||'https://api.z.ai/api/paas/v4',key:process.env.ZAI_API_KEY,model:process.env.ZAI_MODEL||'glm-4.6'});
  }
  if(process.env.MINIMAX_API_KEY){
    push({name:'minimax',base:process.env.MINIMAX_BASE_URL||'https://api.minimax.io/v1',key:process.env.MINIMAX_API_KEY,model:process.env.MINIMAX_MODEL||'MiniMax-M3'});
  }
  if(process.env.GEMINI_API_KEY){
    push({name:'gemini',base:process.env.GEMINI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta/openai',key:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL||'gemini-3.8-flash'});
  }
  if(process.env.ANTHROPIC_API_KEY){
    push({name:'anthropic',base:process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com/v1',key:process.env.ANTHROPIC_API_KEY,model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6',protocol:'anthropic'});
  }
  if(process.env.ARK_API_KEY&&process.env.ARK_MODEL){
    push({name:'ark',base:process.env.ARK_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3',key:process.env.ARK_API_KEY,model:process.env.ARK_MODEL});
  }
  if(process.env.GROQ_API_KEY&&process.env.GROQ_MODEL){
    push({name:'groq',base:'https://api.groq.com/openai/v1',key:process.env.GROQ_API_KEY,model:process.env.GROQ_MODEL});
  }
  if(process.env.OPENROUTER_API_KEY&&process.env.OPENROUTER_MODEL){
    push({
      name:'openrouter',
      base:'https://openrouter.ai/api/v1',
      key:process.env.OPENROUTER_API_KEY,
      model:process.env.OPENROUTER_MODEL,
      headers:{'X-Title':'PredictLM'}
    });
  }
  const preferred=(process.env.PREDICTLM_PROVIDER_ORDER||'server,freellmapi,opencode,nvidia,deepseek,kimi,zai,minimax,gemini,groq,openrouter,anthropic,ark,ollama')
    .split(',').map(x=>x.trim()).filter(Boolean);
  const rank=(name:string)=>{const i=preferred.indexOf(name);return i<0?999:i};
  return out.sort((a,b)=>rank(a.name)-rank(b.name));
}

function primaryProviders(configured:Provider[]){
  return configured.filter(provider=>
    provider.name!=='ollama'
    && provider.name!=='freellmapi'
    && !loopbackBase(provider.base)
  );
}

type ProviderTask='code'|'legal'|'research'|'creative'|'reasoning'|'quick'|'general';

function providerTaskClass(prompt:string,deep:boolean):ProviderTask{
  const q=normalize(prompt);
  if(/\b(codigo|code|program|typescript|javascript|python|react|next|bug|erro|build|deploy|api|backend|frontend|database|sql|github|repo|refactor|arquitetura)\b/.test(q))return 'code';
  if(/\b(jurid|lei|processo|tribunal|cnj|datajud|djen|peticao|petição|contrato|jurisprud|advog)\b/.test(q))return 'legal';
  if(/\b(pesquis|research|fontes?|estudo|artigo|evidenc|compare|verifique|confirme|atual|hoje|noticia|notícia)\b/.test(q))return 'research';
  if(/\b(crie|escreva|roteiro|historia|história|criativo|poema|design|copy|campanha|personagem|brainstorm)\b/.test(q))return 'creative';
  if(deep||/\b(raciocin|analise|análise|decid|estrateg|planej|problema complexo|prove|demonstre|matemat|fisic|quimic)\b/.test(q))return 'reasoning';
  if(prompt.length<220&&!/\b(como|por que|porque|explique|detalh|compare)\b/i.test(prompt))return 'quick';
  return 'general';
}

const TASK_PROVIDER_BONUS:Record<ProviderTask,Record<string,number>>={
  code:{opencode:55,deepseek:44,anthropic:40,gemini:34,nvidia:28,openrouter:24,kimi:18,zai:16,groq:14,server:10,minimax:6,ark:6,freellmapi:2,ollama:2},
  legal:{anthropic:52,gemini:42,deepseek:34,openrouter:28,kimi:23,zai:20,nvidia:16,server:12,groq:8,minimax:8,opencode:4,ark:4,freellmapi:2,ollama:2},
  research:{gemini:48,anthropic:46,deepseek:34,openrouter:28,kimi:24,zai:20,nvidia:18,groq:14,server:12,minimax:8,opencode:5,ark:4,freellmapi:2,ollama:2},
  creative:{anthropic:46,minimax:38,gemini:36,openrouter:30,kimi:28,zai:22,deepseek:18,server:14,groq:12,nvidia:10,opencode:8,ark:6,freellmapi:2,ollama:2},
  reasoning:{anthropic:50,deepseek:44,gemini:42,nvidia:34,openrouter:30,kimi:26,zai:24,server:14,groq:12,minimax:10,opencode:8,ark:6,freellmapi:2,ollama:2},
  quick:{groq:42,gemini:38,nvidia:32,deepseek:28,kimi:24,zai:22,openrouter:20,server:18,anthropic:16,minimax:14,opencode:12,ark:8,freellmapi:4,ollama:4},
  general:{anthropic:46,gemini:42,deepseek:36,kimi:30,openrouter:28,zai:26,nvidia:24,groq:18,minimax:16,server:14,opencode:10,ark:8,freellmapi:3,ollama:3}
};

function modelBonus(model:string,task:ProviderTask){
  const m=model.toLowerCase();
  let score=0;
  if(/claude|opus|sonnet/.test(m))score+=task==='creative'||task==='reasoning'||task==='legal'?14:8;
  if(/gemini/.test(m))score+=task==='research'||task==='general'?12:7;
  if(/deepseek/.test(m))score+=task==='code'||task==='reasoning'?12:7;
  if(/nemotron/.test(m))score+=task==='reasoning'||task==='code'?9:5;
  if(/kimi/.test(m))score+=task==='research'||task==='general'?8:5;
  if(/glm/.test(m))score+=6;
  if(/grok/.test(m))score+=task==='general'||task==='research'?11:7;
  if(/free|lite|mini/.test(m))score-=4;
  return score;
}

function taskAwareProviders(configured:Provider[],prompt:string,deep:boolean){
  const primary=rankHealthyProviders(primaryProviders(configured));
  const task=providerTaskClass(prompt,deep);
  const manual=new Map(primary.map((p,i)=>[p.name,i]));
  return [...primary].sort((a,b)=>{
    const sa=(TASK_PROVIDER_BONUS[task][a.name]||0)+modelBonus(a.model,task)-(manual.get(a.name)||0)*0.15;
    const sb=(TASK_PROVIDER_BONUS[task][b.name]||0)+modelBonus(b.model,task)-(manual.get(b.name)||0)*0.15;
    return sb-sa;
  });
}

function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

function shouldUseGithubKnowledge(prompt:string){
  const q=normalize(prompt);
  if(/\b(github|repo|repository|codigo|code|software|typescript|javascript|python|react|next|api|backend|frontend|database|vercel|deploy|docker|mcp|bug|erro|arquitetura)\b/.test(q))return true;
  if(classifyDomainEngines(prompt).length)return true;
  if(/\b(datajud|djen|cnj|juridic|processo|lexis|graphrag|sgs|bacen|bcb|starlink|spacex|quant|qubit|netdata)\b/.test(q))return true;
  return false;
}

function simulationPlanGate(raw:string){
  const fenced=String(raw||'').match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/i)?.[1];
  const candidate=fenced||String(raw||'').match(/\{[\s\S]*\}/)?.[0]||'';
  if(!candidate)return null;
  try{
    const data=JSON.parse(candidate);
    const allowed=new Set(['move','buy_food','eat','rest','work','study','socialize','exercise','healthcare','wait','set_goal','speak','cook','clean_home','shower','create','message_friend']);
    const locations=new Set(['Casa','Trabalho','Café','Parque','Mercado','Clínica','Biblioteca']);
    const actions=(Array.isArray(data?.actions)?data.actions:[])
      .filter((x:any)=>x&&allowed.has(String(x.type||'')))
      .slice(0,12)
      .map((x:any)=>({
        type:String(x.type),
        ...(x.target&&locations.has(String(x.target))?{target:String(x.target)}:{}),
        ...(Number.isFinite(Number(x.minutes))?{minutes:Math.max(5,Math.min(240,Number(x.minutes)))}:{}),
        ...(x.text?{text:String(x.text).slice(0,220)}:{}),
        ...(x.reason?{reason:String(x.reason).slice(0,180)}:{})
      }));
    if(!actions.length)return null;
    return JSON.stringify({
      objective:String(data?.objective||'Executar a instrução no mundo').slice(0,240),
      summary:String(data?.summary||'Plano de ações executáveis.').slice(0,280),
      actions
    });
  }catch{return null}
}

async function simulationPlanResponse(configured:Provider[],body:any,prompt:string){
  const worldState=String(body?.worldState||'').slice(0,7000);
  const localAdvisory=String(body?.localAdvisory||'').slice(0,1800);
  const system=[
    'Você é o planejador de uma simulação de vida 2D. Sua saída é executada pelo motor da simulação.',
    'Retorne SOMENTE JSON válido. Nunca escreva prosa fora do JSON e nunca inclua chain-of-thought.',
    'Formato: {"objective":"...","summary":"...","actions":[{"type":"move","target":"Mercado","reason":"..."},{"type":"buy_food"}]}',
    'Ações permitidas: move, buy_food, eat, rest, work, study, socialize, exercise, healthcare, wait, set_goal, speak, cook, clean_home, shower, create, message_friend.',
    'Destinos: Casa, Trabalho, Café, Parque, Mercado, Clínica, Biblioteca.',
    'Pré-condições: comprar comida=Mercado; comer/cozinhar em Casa exige comida; estudar=Biblioteca; trabalhar=Trabalho; descansar/limpar/banho=Casa; exercício=Parque; saúde=Clínica; criar=Casa ou Biblioteca.',
    'Planeje no máximo 10 ações e prefira ações que alteram o estado real.',
    worldState?'ESTADO DO MUNDO:\n'+worldState:'',
    localAdvisory?'SEGUNDA OPINIÃO LOCAL:\n'+localAdvisory:''
  ].filter(Boolean).join('\n\n');
  const messages:Msg[]=[{role:'system',content:system},{role:'user',content:prompt.slice(0,1200)}];
  const candidates=taskAwareProviders(configured,'planejar ações de simulação '+prompt,false).slice(0,PROVIDER_ATTEMPT_LIMIT);
  const errors:string[]=[];
  const startedAt=Date.now();
  for(const provider of candidates){
    const remaining=REQUEST_BUDGET_MS-(Date.now()-startedAt);
    if(remaining<1200)break;
    try{
      const raw=await callProvider(provider,messages,false,Math.min(PROVIDER_TIMEOUT_MS,Math.max(1000,remaining)));
      const clean=simulationPlanGate(raw);
      if(!clean){errors.push(provider.name+' invalid-plan');continue}
      return Response.json({content:clean,provider:provider.name,model:provider.model,mode:'simulation-plan'},{headers:{'Cache-Control':'no-store'}});
    }catch(error:any){errors.push(String(error?.message||error).slice(0,180))}
  }
  return Response.json({error:'Nenhum provider produziu um plano executável.',code:'NO_SIMULATION_PLAN',errors:errors.slice(0,3)},{status:502,headers:{'Cache-Control':'no-store'}});
}

function apiAgentSkillEnvelope(prompt:string,deep=false,hasResearch=false){
  const q=normalize(prompt);
  const surface=/(imagem|image|video|vídeo|anime|render|foto|storyboard)/i.test(q)
    ? 'media'
    : hasResearch||/(pesquis|research|fonte|source|web|documenta[cç][aã]o)/i.test(q)
      ? 'research'
      : 'chat';
  const plan=planAgenticRun(prompt,surface,deep);
  return [
    'API AGENTIC PLAN: '+plan.roles.join(' → ')+'.',
    'The remote provider is the primary answering engine. Execute relevant contracts silently; do not recite agents, skills or routing to the user.',
    'Use deferred skill discovery: load only task-relevant contracts instead of the entire catalog.',
    'Local runtimes, when present, are advisory evidence only and never outrank the remote provider.',
    skillContractContext(prompt,surface,surface==='chat'?7:9)
  ].join('\n');
}

function volatileQuery(prompt:string){
  return /\b(hoje|agora|atual|atualmente|ultim[ao]s?|recentes?|noticia|notícias|news|preco|preço|cotacao|cotação|placar|resultado|tempo|weather|fortuna hoje|patrimonio hoje|patrimônio hoje)\b/i.test(prompt);
}

function isSimpleStableFactual(prompt:string){
  const q=normalize(prompt);
  return !volatileQuery(prompt)
    && /^(quem (e|foi)|o que (e|foi)|defina|explique|qual e|onde fica|quando nasceu)\b/.test(q)
    && prompt.length<420;
}

function isSimpleProcedural(prompt:string){
  const q=normalize(prompt);
  return !volatileQuery(prompt)
    && /^(como\s+\S+|passo a passo|me ensine a|quero aprender a)\b/.test(q)
    && prompt.length<520;
}

function simpleAnswerIssue(prompt:string,content:string){
  const q=normalize(prompt);
  const out=normalize(content);
  if(isSimpleStableFactual(prompt)){
    const volatile=(out.match(/\b(atualmente|mais rico|fortuna|patrimonio|patrimonio liquido|bilhao|bilhoes|trilhao|trilhoes|em 20\d{2})\b/g)||[]).length;
    if(volatile>=2&&!/\b(fortuna|patrimonio|patrimonio liquido|mais rico|ranking)\b/.test(q))return 'unsolicited-volatile-claims';
  }
  if(isSimpleProcedural(prompt)){
    if(!/\b(primeiro|depois|passo|use|coloque|prepare|mantenha|plante|regue|deixe|retire|corte|adicione|espere|faça|faca)\b/.test(out))return 'missing-procedure';
  }
  return '';
}

function simpleTurnGuard(prompt:string,researchContext:string){
  if(isSimpleStableFactual(prompt)){
    return [
      'MODO FACTUAL ESTÁVEL: responda primeiro quem/o que é, de forma curta e correta.',
      'Não acrescente fortuna atual, ranking de riqueza, cargo político atual, números de mercado, datas futuras ou outros fatos voláteis se o usuário não pediu isso explicitamente.',
      researchContext
        ? 'Use contexto recuperado somente quando ele responder diretamente à pergunta; descarte snippets laterais ou contraditórios.'
        : 'Sem fonte atual anexada, prefira fatos estáveis e omita números/estado atual incertos em vez de inventar.'
    ].join(' ');
  }
  if(isSimpleProcedural(prompt)){
    return [
      'MODO PROCEDURAL: responda a ação pedida com passos práticos primeiro.',
      'Não substitua o procedimento por uma definição enciclopédica do objeto.',
      'Não misture personagens, obras, páginas homônimas ou snippets laterais só porque compartilham uma palavra com o pedido.',
      researchContext?'Use fonte recuperada apenas se ela melhorar diretamente os passos.':''
    ].filter(Boolean).join(' ');
  }
  return '';
}

async function callProvider(provider:Provider,messages:Msg[],deep:boolean,timeoutMs=PROVIDER_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    if(provider.protocol==='anthropic'){
      const system=messages.filter(x=>x.role==='system').map(x=>x.content).join('\n\n');
      const dialog=messages.filter(x=>x.role!=='system').map(x=>({role:x.role as 'user'|'assistant',content:x.content}));
      const r=await fetch(provider.base.replace(/\/$/,'')+'/messages',{
        method:'POST',
        signal:controller.signal,
        headers:{
          'Content-Type':'application/json',
          'x-api-key':provider.key,
          'anthropic-version':'2023-06-01',
          ...(provider.headers||{})
        },
        body:JSON.stringify({model:provider.model,system,messages:dialog,max_tokens:deep?1800:1000})
      });
      const raw=await r.text();
      if(!r.ok)throw new Error(provider.name+' '+r.status+' '+raw.slice(0,240));
      let data:any={};
      try{data=JSON.parse(raw)}catch{}
      const content=Array.isArray(data?.content)
        ? data.content.filter((x:any)=>x?.type==='text').map((x:any)=>x.text).join('\n').trim()
        : '';
      if(!content)throw new Error(provider.name+' empty response');
      recordProviderSuccess(provider);
      return content;
    }

    const body:any={
      model:provider.model,
      messages,
      temperature:deep?0.25:0.45,
      max_tokens:deep?1400:900,
      stream:false
    };
    if(provider.name==='nvidia'){
      body.chat_template_kwargs={enable_thinking:deep};
      if(deep)body.reasoning_budget=2048;
    }
    if(provider.name==='minimax')body.thinking={type:'disabled'};

    const r=await fetch(provider.base.replace(/\/$/,'')+'/chat/completions',{
      method:'POST',
      signal:controller.signal,
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+provider.key,
        ...(provider.headers||{})
      },
      body:JSON.stringify(body)
    });
    const raw=await r.text();
    if(!r.ok)throw new Error(provider.name+' '+r.status+' '+raw.slice(0,240));
    let data:any={};
    try{data=JSON.parse(raw)}catch{}
    const content=String(data?.choices?.[0]?.message?.content||data?.response||'').trim();
    if(!content)throw new Error(provider.name+' empty response');
    recordProviderSuccess(provider);
    return content;
  }catch(error){
    recordProviderFailure(provider,error);
    throw error;
  }finally{clearTimeout(timer)}
}

async function cleanChatResponse(configured:Provider[],body:any,prompt:string){
  const language=(body?.language==='en'||body?.language==='pt-BR')
    ? body.language as ConversationLanguage
    : resolveConversationLanguage(prompt,[]);
  const recent=(body?.useHistory&&Array.isArray(body?.messages)?body.messages:[])
    .filter((x:any)=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string')
    .slice(-4)
    .map((x:any)=>({role:x.role as 'user'|'assistant',content:compactText(String(x.content),700)}));

  const mode=isHypotheticalPrompt(prompt)
    ? 'hypothetical'
    : isGenericHowTo(prompt)
      ? 'howto'
      : 'plain';

  const guard=mode==='hypothetical'
    ? [
        'Responda diretamente à hipótese imaginária do usuário.',
        'Trate a premissa como ficção/experimento mental; não troque de assunto.',
        'Se envolver pessoa real, não invente fatos reais sobre ela: descreva somente consequências da hipótese de forma neutra e, se couber, leve.',
        'Não introduza direito, perícia, finanças, programação, livros, pesquisas ou contexto externo que o usuário não pediu.'
      ].join(' ')
    : mode==='howto'
      ? [
          'Responda como procedimento prático.',
          'Comece pela ação pedida e dê passos concretos.',
          'Não substitua a resposta por definição enciclopédica, snippet de busca ou assunto homônimo.',
          'Não diga que falta contexto se a pergunta puder ser respondida de forma geral.'
        ].join(' ')
      : [
          'Responda somente ao pedido atual, de forma natural e direta.',
          'Não use tópicos, bases, skills ou contexto não solicitado.',
          'Não acrescente assuntos correlatos só porque compartilham uma palavra com o prompt.'
        ].join(' ');

  const skillEnvelope=apiAgentSkillEnvelope(prompt,false,false);
  const localAdvisory=compactText(String(body?.localAdvisory||''),1200);
  const answerAnchor=compactText(String(body?.answerAnchor||''),1800);
  const system=[
    'Você é o PredictLM em modo conversa limpa.',
    languageSystemInstruction(language),
    guard,
    skillEnvelope,
    localAdvisory?'LOCAL ADVISORY (opcional; critique, não copie automaticamente): '+localAdvisory:'',
    answerAnchor?'ANSWER FLOOR (use apenas como piso de utilidade; a API continua responsável pela resposta): '+answerAnchor:'',
    'Entregue somente a resposta final ao usuário. Nunca exponha cadeia de raciocínio, roteamento, provider, skill, memória interna ou relatório operacional.'
  ].filter(Boolean).join('\n\n');

  const messages:Msg[]=[
    {role:'system',content:system},
    ...recent,
    {role:'user',content:compactText(prompt,1200)}
  ];

  const candidates=taskAwareProviders(configured,prompt,false).slice(0,PROVIDER_ATTEMPT_LIMIT);
  const errors:string[]=[];
  for(const provider of candidates){
    try{
      const raw=await callProvider(provider,messages,false,PROVIDER_TIMEOUT_MS);
      const gate=publicAnswerGate(raw,language,prompt);
      if(!gate.ok){errors.push(provider.name+': '+gate.reason);continue}
      const issue=conversationAnswerIssue(prompt,gate.content);
      const alignment=responseTopicAlignment(prompt,gate.content);
      if(issue||!alignment.relevant){
        errors.push(provider.name+': '+(issue||'off-topic'));
        continue;
      }
      return Response.json({
        content:gate.content,
        provider:provider.name,
        model:provider.model,
        mode:'clean-chat',
        sources:[]
      },{headers:{'Cache-Control':'no-store'}});
    }catch(error:any){
      errors.push(provider.name+': '+String(error?.message||error).slice(0,160));
    }
  }
  return Response.json({
    available:false,
    content:null,
    code:'NO_CLEAN_ANSWER',
    mode:'clean-chat',
    errors:errors.slice(0,3)
  },{headers:{'Cache-Control':'no-store'}});
}

async function mediaDirectorResponse(configured:Provider[],prompt:string){
  const skillContext=apiAgentSkillEnvelope('imagem vídeo media visual '+prompt,true,false);
  const candidates=taskAwareProviders(configured,'media director visual production '+prompt,true).slice(0,Math.min(3,PROVIDER_ATTEMPT_LIMIT));
  if(!candidates.length)return Response.json({
    content:null,available:false,code:'MEDIA_DIRECTOR_UNAVAILABLE',mode:'media-director'
  },{headers:{'Cache-Control':'no-store'}});

  const roles=[
    {
      name:'identity-reference',
      instruction:[
        'Act as the identity/reference specialist.',
        'Lock every named subject, form, count, costume, color, anatomy, franchise-specific visual attribute and explicit exclusion.',
        'Separate subject identity from setting/style. Produce positive identity anchors and useful negative constraints.',
        'Do not redesign a known subject into a generic lookalike.'
      ].join(' ')
    },
    {
      name:'composition-action',
      instruction:[
        'Act as the composition/action specialist.',
        'Optimize camera, framing, spatial separation, action readability, scale, lighting, depth and environment without changing the requested subjects.',
        'For battles or multiple subjects keep each silhouette readable and prevent explosions/effects from hiding key identities.'
      ].join(' ')
    }
  ] as const;

  const runs=await Promise.allSettled(roles.map((role,index)=>{
    const provider=candidates[index%candidates.length];
    const messages:Msg[]=[
      {
        role:'system',
        content:[
          'Você é um especialista visual interno do PredictLM.',
          skillContext,
          'A API/provider remoto executa esta tarefa; runtime local não define o brief final.',
          role.instruction,
          'Retorne somente um brief operacional compacto. Não exponha chain-of-thought.',
          'Preserve literalmente o pedido. Não invente cyberpunk, robôs, armaduras, hologramas ou elementos não pedidos.'
        ].join('\n')
      },
      {role:'user',content:compactText(prompt,2600)}
    ];
    return callProvider(provider,messages,true,Math.min(9000,PROVIDER_TIMEOUT_MS)).then(text=>({
      role:role.name,
      provider,
      text:compactText(text,2200)
    }));
  }));

  const briefs=runs
    .flatMap(x=>x.status==='fulfilled'?[x.value]:[])
    .filter(x=>x.text);

  if(!briefs.length)return Response.json({
    content:null,available:false,code:'MEDIA_DIRECTOR_UNAVAILABLE',mode:'media-director'
  },{headers:{'Cache-Control':'no-store'}});

  if(briefs.length===1){
    return Response.json({
      content:briefs[0].text,
      provider:briefs[0].provider.name,
      model:briefs[0].provider.model,
      mode:'media-director',
      agentic:{roles:[briefs[0].role],reviewed:false}
    },{headers:{'Cache-Control':'no-store'}});
  }

  const finalizer=candidates[0];
  try{
    const final=await callProvider(finalizer,[
      {
        role:'system',
        content:[
          'Você é o finalizador visual do PredictLM.',
          skillContext,
          buildReviewContract('media'),
          'Combine os briefs especialistas em UMA instrução final de geração.',
          'Resolva contradições a favor do pedido literal do usuário e da fidelidade de identidade.',
          'Inclua sujeito, identidade, composição, câmera, ação, luz, ambiente e negativas necessárias.',
          'Não mencione agents, providers, revisão ou processo. Não exponha chain-of-thought.'
        ].join('\n')
      },
      {
        role:'user',
        content:[
          'PEDIDO ORIGINAL:\n'+compactText(prompt,2200),
          'BRIEFS ESPECIALISTAS:\n'+briefs.map(x=>'['+x.role+'] '+x.text).join('\n\n')
        ].join('\n\n')
      }
    ],true,Math.min(9000,PROVIDER_TIMEOUT_MS));
    const content=compactText(final,3000);
    if(content)return Response.json({
      content,
      provider:finalizer.name,
      model:finalizer.model,
      mode:'media-director',
      agentic:{roles:[...briefs.map(x=>x.role),'verifier'],reviewed:true,contributors:briefs.map(x=>x.provider.name)}
    },{headers:{'Cache-Control':'no-store'}});
  }catch{}

  return Response.json({
    content:briefs.map(x=>x.text).join('\n\n'),
    provider:briefs[0].provider.name,
    model:briefs[0].provider.model,
    mode:'media-director',
    agentic:{roles:briefs.map(x=>x.role),reviewed:false}
  },{headers:{'Cache-Control':'no-store'}});
}

type ChatDraftReview={
  approved?:boolean;
  confidence?:number;
  issues?:Array<{severity?:string;issue?:string;fix?:string}>;
  missing?:string[];
};

function draftNeedsRepair(review:ChatDraftReview|null){
  if(!review)return false;
  if(review.approved===false)return true;
  return (review.issues||[]).some(x=>/^(critical|blocker|high)$/i.test(String(x.severity||'')));
}


export async function GET(){
  const all=providers();
  const configured=primaryProviders(all);
  const auxiliary=all.filter(x=>!configured.includes(x));
  return Response.json({
    available:configured.length>0,
    providers:configured.map(x=>({name:x.name,model:x.model})),
    count:configured.length,
    auxiliaryLocal:auxiliary.map(x=>({name:x.name,model:x.model}))
  },{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const prompt=String(body?.prompt||'').trim();
    const researchContext=String(body?.researchContext||'').trim().slice(0,16000);
    const localAdvisory=String(body?.localAdvisory||'').trim().slice(0,2200);
    const answerAnchor=String(body?.answerAnchor||'').trim().slice(0,5200);
    const brainContext=String(body?.brainContext||'').trim().slice(0,5200)||digitalBrainContext(prompt);
    if(!prompt)return Response.json({error:'prompt is required'},{status:400});

    const configured=primaryProviders(providers());
    if(!configured.length){
      return Response.json({
        available:false,
        content:null,
        code:'NO_REMOTE_PROVIDER',
        message:'Nenhuma API remota server-side está configurada. Runtimes locais permanecem apenas auxiliares e não podem produzir a resposta final do Predict Auto.'
      },{status:503,headers:{'Cache-Control':'no-store'}});
    }

    if(body?.mode==='simulation-plan')return simulationPlanResponse(configured,body,prompt);
    if(body?.mode==='media-director')return mediaDirectorResponse(configured,prompt);
    if(body?.mode==='clean-chat')return cleanChatResponse(configured,body,prompt);

    const rawHistory=(Array.isArray(body?.messages)?body.messages:[])
      .filter((x:any)=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string')
      .map((x:any)=>({role:x.role,content:String(x.content)})) as Msg[];
    const deep=Boolean(body?.deep)||isScenarioSimulationRequest(prompt);
    const language=(body?.language==='en'||body?.language==='pt-BR')
      ? body.language as ConversationLanguage
      : resolveConversationLanguage(prompt,rawHistory);
    const githubTopK=deep?5:3;
    const useGithub=shouldUseGithubKnowledge(prompt);
    const gh=useGithub?githubKnowledgeContext(prompt,githubTopK):'';
    const ghHits=useGithub?retrieveGitHubKnowledge(prompt,githubTopK):[];
    const stats=githubKnowledgeStats();
    const tutor=tutorSystemContext(prompt);
    const deepLoop=deep?deepLoopContext(prompt):'';
    const centum=centumDecisionContext(prompt);
    const parallax=parallaxContext(prompt);
    const globalLessons=globalLearningContext(prompt,deep?5:3);
    const humanLens=humanAdversarialContext(prompt);
    const humanPresence=humanPresenceContext(prompt);
    const masterContext=predictLMMasterContext(prompt,deep);
    const localInstructions=String(body?.instructions||'').slice(0,2200);
    const simpleTurn=!deep&&(isSimpleStableFactual(prompt)||isSimpleProcedural(prompt));
    const responseGuard=simpleTurnGuard(prompt,researchContext);
    const packed=optimizePromptPackage({
      messages:rawHistory,
      mode:simpleTurn?'ultra':(deep?'lite':'full'),
      sections:[
        {label:'Instruções persistentes do usuário',text:localInstructions,priority:8},
        {label:'Lições globais aprovadas',text:simpleTurn?'':globalLessons,priority:7},
        {label:'Centum Decision Gate',text:simpleTurn?'':centum,priority:10},
        {label:'Third Brain PARALLAX',text:simpleTurn?'':parallax,priority:10},
        {label:'PredictLM Master',text:simpleTurn?'':masterContext,priority:10},
        {label:'Human Presence',text:simpleTurn?'':humanPresence,priority:10},
        {label:'Human Adversarial Lens',text:simpleTurn?'':humanLens,priority:9},
        {label:'Digital Brain control layer',text:simpleTurn?'':brainContext,priority:10},
        {label:'Deep Loop',text:simpleTurn?'':deepLoop,priority:9},
        {label:'Tutor Mode',text:simpleTurn?'':tutor,priority:6},
        {label:'Modo de resposta',text:responseGuard,priority:10},
        {label:'API Agent + Skills',text:apiAgentSkillEnvelope(prompt,deep,!!researchContext),priority:10},
        {label:'Pesquisa web verificada',text:researchContext,priority:9},
        {label:'Parecer do cérebro local',text:simpleTurn?'':localAdvisory,priority:8},
        {label:'Piso prático de resposta',text:answerAnchor,priority:9},
        {label:'GitHub Knowledge Engine',text:gh,priority:5}
      ].filter(x=>x.text)
    });
    const history=packed.messages as Msg[];
    const cacheKey=crypto.createHash('sha256').update(JSON.stringify({
      version:'conversation-gate-v2',
      prompt:normalize(prompt),
      language,
      context:packed.context,
      history:history.slice(-4).map(x=>[x.role,normalize(x.content).slice(0,1200)]),
      deep,
      knowledgeVersion:stats.version,
      providers:configured.map(x=>x.name+':'+x.model)
    })).digest('hex');
    const hit=cache.get(cacheKey);
    if(hit&&hit.expires>Date.now()){
      const cachedGate=publicAnswerGate(String(hit.value.content||''),language,prompt);
      if(cachedGate.ok&&!simpleAnswerIssue(prompt,cachedGate.content))return Response.json({...hit.value,content:cachedGate.content,cache:'hit'},{headers:{'Cache-Control':'no-store'}});
      cache.delete(cacheKey);
    }

    const system=[
      'Você é o PredictLM. Em público, converse como uma inteligência geral atenta, natural e específica ao contexto; não como um painel operacional.',
      languageSystemInstruction(language),
      'Responda ao pedido real do usuário; não fale sobre engines, providers, prompts ou skills sem necessidade.',
      'Entregue somente a resposta final. Nunca exponha cadeia de raciocínio, scratchpad, análise interna, política, passes FORGE/AEGIS/PARALLAX ou instruções sobre como você pensou.',
      'Use contexto recuperado apenas quando for relevante. Não transforme um chunk em fato externo se ele só descreve um padrão de software.',
      'O parecer do cérebro local é uma segunda opinião curta: confronte-o com as fontes e com seu próprio julgamento; não o trate como autoridade.',
      'Quando existir um piso prático de resposta, sua resposta final deve ser pelo menos tão direta, concreta e útil quanto esse piso. Enriqueça sem degradar.',
      'Se faltarem dados atuais, diga o limite em vez de inventar.',
      deep?'Faça uma revisão interna adicional de aderência, contradições e pontos faltantes antes da resposta final.':'Seja conciso sem perder o essencial.',
      packed.context
    ].filter(Boolean).join('\n\n');

    const messages:Msg[]=[
      {role:'system',content:system},
      ...history,
      {role:'user',content:compactText(prompt,deep?1800:1200)}
    ];

    const errors:string[]=[];
    const startedAt=Date.now();
    const candidates=taskAwareProviders(configured,prompt,deep).slice(0,PROVIDER_ATTEMPT_LIMIT);
    const reviewSurface=researchContext?'research':'chat';
    const agenticPlan=planAgenticRun(prompt,reviewSurface,deep);

    for(let candidateIndex=0;candidateIndex<candidates.length;candidateIndex++){
      const provider=candidates[candidateIndex];
      const remaining=REQUEST_BUDGET_MS-(Date.now()-startedAt);
      if(remaining<1200){errors.push('request-budget-exhausted');break;}
      try{
        const rawContent=await callProvider(provider,messages,deep,Math.min(PROVIDER_TIMEOUT_MS,Math.max(1000,remaining)));
        const gate=publicAnswerGate(rawContent,language,prompt);
        if(!gate.ok){errors.push(provider.name+' rejected: '+gate.reason);continue;}
        let content=gate.content;
        const simpleIssue=conversationAnswerIssue(prompt,content)||(simpleTurn?simpleAnswerIssue(prompt,content):'');
        if(simpleIssue){errors.push(provider.name+' rejected: '+simpleIssue);continue;}

        let reviewMeta:any={performed:false};
        const reviewBudget=REQUEST_BUDGET_MS-(Date.now()-startedAt);
        const shouldReview=agenticPlan.staged&&!simpleTurn&&reviewBudget>=6500;
        if(shouldReview){
          const reviewer=candidates.length>1
            ? candidates[(candidateIndex+1)%candidates.length]
            : provider;
          try{
            const reviewRaw=await callProvider(reviewer,[
              {
                role:'system',
                content:[
                  'You are an independent answer reviewer.',
                  buildReviewContract(reviewSurface),
                  'Return JSON only: {"approved":true,"confidence":0,"issues":[{"severity":"high|medium|low","issue":"...","fix":"..."}],"missing":["..."]}.',
                  'Validate issues before reporting them. Do not add unrelated preferences. Never expose chain-of-thought.'
                ].join('\n')
              },
              {
                role:'user',
                content:[
                  'USER REQUEST:\n'+compactText(prompt,1300),
                  'DRAFT ANSWER:\n'+compactText(content,2400),
                  researchContext?'EVIDENCE CONTEXT:\n'+compactText(researchContext,1800):''
                ].filter(Boolean).join('\n\n')
              }
            ],false,Math.min(6500,Math.max(2000,reviewBudget-1000)));

            const review=parseJsonObject<ChatDraftReview>(reviewRaw);
            reviewMeta={
              performed:true,
              provider:reviewer.name,
              approved:review?.approved??null,
              confidence:Number(review?.confidence||0),
              issues:(review?.issues||[]).slice(0,6),
              missing:(review?.missing||[]).slice(0,6)
            };

            if(draftNeedsRepair(review)){
              const repairBudget=REQUEST_BUDGET_MS-(Date.now()-startedAt);
              if(repairBudget<4500){
                errors.push(provider.name+' draft review requested repair but request budget was exhausted');
                continue;
              }
              const finalizer=candidates[Math.min(candidateIndex,candidates.length-1)]||provider;
              const repairedRaw=await callProvider(finalizer,[
                {
                  role:'system',
                  content:[
                    system,
                    'You are now the final answer editor.',
                    'Use the independent review below only to fix validated defects or missing requirements.',
                    'Preserve correct parts of the draft and stay tightly aligned to the user request.',
                    'Return only the corrected final answer. Never mention the review, agents, skills, providers or chain-of-thought.',
                    'INDEPENDENT REVIEW:\n'+compactText(JSON.stringify(review),1600)
                  ].join('\n\n')
                },
                ...history.slice(-4),
                {role:'user',content:compactText(prompt,1400)},
                {role:'assistant',content:compactText(content,2400)},
                {role:'user',content:'Produce the corrected final answer now.'}
              ],deep,Math.min(8000,Math.max(3000,repairBudget-700)));

              const repairedGate=publicAnswerGate(repairedRaw,language,prompt);
              const repairedIssue=repairedGate.ok
                ? conversationAnswerIssue(prompt,repairedGate.content)||(simpleTurn?simpleAnswerIssue(prompt,repairedGate.content):'')
                : repairedGate.reason;
              if(!repairedGate.ok||repairedIssue){
                errors.push(finalizer.name+' repaired draft rejected: '+String(repairedIssue||'gate'));
                continue;
              }
              content=repairedGate.content;
              reviewMeta.repaired=true;
              reviewMeta.finalizer=finalizer.name;
            }
          }catch(reviewError:any){
            reviewMeta={performed:false,error:String(reviewError?.message||reviewError).slice(0,180)};
          }
        }

        const value={
          content,
          provider:provider.name,
          model:provider.model,
          cache:'miss',
          knowledgeVersion:stats.version,
          tokenBudget:packed.stats,
          agentic:{
            mode:agenticPlan.staged?'staged':'direct',
            roles:agenticPlan.roles,
            review:reviewMeta
          },
          sources:ghHits.map(x=>({
            title:x.heading,
            source:'https://github.com/'+x.source+'/blob/'+x.ref+'/'+x.path
          }))
        };
        const ttl=volatileQuery(prompt)?5*60*1000:30*60*1000;
        cache.set(cacheKey,{expires:Date.now()+ttl,value});
        if(cache.size>300){
          for(const [k,v] of cache){if(v.expires<=Date.now())cache.delete(k)}
          while(cache.size>300)cache.delete(cache.keys().next().value);
        }
        return Response.json(value,{headers:{'Cache-Control':'no-store'}});
      }catch(error:any){
        errors.push(String(error?.message||error).slice(0,300));
      }
    }
    return Response.json({error:'Não foi possível obter uma resposta final válida dentro do orçamento de execução.',code:'NO_VALID_ANSWER',attempted:candidates.length,budgetMs:REQUEST_BUDGET_MS},{status:502,headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||error)},{status:500});
  }
}
