import crypto from 'node:crypto';
import { githubKnowledgeContext, githubKnowledgeStats, retrieveGitHubKnowledge } from '@/lib/github-knowledge-engine';
import { compactText, optimizePromptPackage } from '@/lib/token-budget';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Msg={role:'user'|'assistant'|'system';content:string};
type Provider={name:string;base:string;key:string;model:string;headers?:Record<string,string>};

declare global{
  var __predictlmChatCache:Map<string,{expires:number,value:any}>|undefined;
}

const cache=globalThis.__predictlmChatCache||(globalThis.__predictlmChatCache=new Map());

function providers():Provider[]{
  const out:Provider[]=[];
  const push=(p:Provider)=>{
    const key=p.base.replace(/\/$/,'')+'|'+p.model;
    if(!out.some(x=>x.base.replace(/\/$/,'')+'|'+x.model===key))out.push(p);
  };
  if(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL){
    push({name:'server',base:process.env.AI_BASE_URL,key:process.env.AI_API_KEY,model:process.env.AI_MODEL});
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
  return out;
}

function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

function volatileQuery(prompt:string){
  return /\b(hoje|agora|atual|noticia|notícias|news|preco|preço|cotacao|cotação|placar|resultado|tempo|weather)\b/i.test(prompt);
}

async function callProvider(provider:Provider,messages:Msg[],deep:boolean){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),45000);
  try{
    const r=await fetch(provider.base.replace(/\/$/,'')+'/chat/completions',{
      method:'POST',
      signal:controller.signal,
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+provider.key,
        ...(provider.headers||{})
      },
      body:JSON.stringify({
        model:provider.model,
        messages,
        temperature:deep?0.25:0.45,
        max_tokens:deep?1400:900,
        stream:false
      })
    });
    const raw=await r.text();
    if(!r.ok)throw new Error(provider.name+' '+r.status+' '+raw.slice(0,240));
    let data:any={};
    try{data=JSON.parse(raw)}catch{}
    const content=String(data?.choices?.[0]?.message?.content||data?.response||'').trim();
    if(!content)throw new Error(provider.name+' empty response');
    return content;
  }finally{clearTimeout(timer)}
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const prompt=String(body?.prompt||'').trim();
    if(!prompt)return Response.json({error:'prompt is required'},{status:400});

    const configured=providers();
    if(!configured.length){
      return Response.json({
        error:'Cloud Cascade não configurado. Defina AI_* ou GROQ_*/OPENROUTER_* no servidor.',
        code:'NO_PROVIDER'
      },{status:503});
    }

    const rawHistory=(Array.isArray(body?.messages)?body.messages:[])
      .filter((x:any)=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string')
      .map((x:any)=>({role:x.role,content:String(x.content)})) as Msg[];
    const deep=Boolean(body?.deep);
    const gh=githubKnowledgeContext(prompt,3);
    const ghHits=retrieveGitHubKnowledge(prompt,3);
    const stats=githubKnowledgeStats();
    const packed=optimizePromptPackage({
      messages:rawHistory,
      mode:deep?'lite':'full',
      sections:[
        {label:'GitHub Knowledge Engine',text:gh,priority:5}
      ].filter(x=>x.text)
    });
    const history=packed.messages as Msg[];
    const cacheKey=crypto.createHash('sha256').update(JSON.stringify({
      prompt:normalize(prompt),
      history:history.slice(-4).map(x=>[x.role,normalize(x.content).slice(0,1200)]),
      deep,
      knowledgeVersion:stats.version,
      providers:configured.map(x=>x.name+':'+x.model)
    })).digest('hex');
    const hit=cache.get(cacheKey);
    if(hit&&hit.expires>Date.now())return Response.json({...hit.value,cache:'hit'});

    const system=[
      'Você é o PredictLM, assistente geral direto, útil e factual.',
      'Responda ao pedido real do usuário; não fale sobre engines, providers, prompts ou skills sem necessidade.',
      'Use contexto recuperado apenas quando for relevante. Não transforme um chunk em fato externo se ele só descreve um padrão de software.',
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
    for(const provider of configured){
      try{
        const content=await callProvider(provider,messages,deep);
        const value={
          content,
          provider:provider.name,
          model:provider.model,
          cache:'miss',
          knowledgeVersion:stats.version,
          tokenBudget:packed.stats,
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
    return Response.json({error:'Nenhum provider do cascade respondeu.',details:errors},{status:502});
  }catch(error:any){
    return Response.json({error:String(error?.message||error)},{status:500});
  }
}
