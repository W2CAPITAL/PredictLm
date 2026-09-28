import { NextRequest } from 'next/server';
import { conversationAnswerIssue, isPlayfulPrompt, responseTopicAlignment } from '@/lib/chat-intelligence';
import { runtimeAutoLearningContext } from '@/lib/server/auto-learning';
import { jevRouteDecision } from '@/lib/jev-policy';
import { publicAnswerGate } from '@/lib/public-answer-gate';
import { providerEndpointAllowed, publicFailurePayload, safeHistoryForModel, safeSessionScope } from '@/lib/chat-trust-boundary';
import { circuitReadyProviders, rankHealthyProviders, recordProviderFailure, recordProviderSuccess } from '@/lib/server/provider-health';
import crypto from 'node:crypto';
import { acquireChatRequest } from '@/lib/server/chat-request-guard';
import {allExternalProviderSpecs} from '@/lib/server/external-provider-fabric';
import {createProviderTurnBudget,estimateProviderTokens} from '@/lib/server/provider-budget';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Msg={role:'user'|'assistant'|'system';content:string};
type Provider={
  name:string;
  base:string;
  key:string;
  model:string;
  headers?:Record<string,string>;
  models?:string[];
  protocol?:'openai'|'responses';
};

function loopbackBase(base:string){
  try{
    const host=new URL(base).hostname.toLowerCase();
    return host==='127.0.0.1'||host==='localhost'||host==='0.0.0.0'||host==='::1';
  }catch{return false}
}

function serverCanReach(base:string){
  if(!providerEndpointAllowed(base,Boolean(process.env.VERCEL)))return false;
  return !(process.env.VERCEL&&loopbackBase(base));
}

function providerList(prompt=''):Provider[]{
  const out:Provider[]=[];
  const seen=new Set<string>();
  const push=(provider:Provider)=>{
    const key=provider.name+'|'+provider.base+'|'+provider.model;
    if(seen.has(key)||!serverCanReach(provider.base))return;
    seen.add(key);
    out.push(provider);
  };

  if(process.env.FREELLMAPI_BASE_URL&&process.env.FREELLMAPI_API_KEY){
    const raw=process.env.FREELLMAPI_BASE_URL.replace(/\/$/,'');
    push({
      name:'freellmapi',
      base:raw.endsWith('/v1')?raw:raw+'/v1',
      key:process.env.FREELLMAPI_API_KEY,
      model:process.env.FREELLMAPI_MODEL||'auto'
    });
  }

  if(process.env.GROQ_API_KEY){
    push({
      name:'groq',
      base:'https://api.groq.com/openai/v1',
      key:process.env.GROQ_API_KEY,
      model:process.env.GROQ_MODEL||'openai/gpt-oss-120b'
    });
  }

  const gatewayKey=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
  if(gatewayKey){
    push({
      name:'vercel-gateway',
      base:process.env.AI_GATEWAY_BASE_URL||'https://ai-gateway.vercel.sh/v1',
      key:gatewayKey,
      model:process.env.AI_GATEWAY_MODEL||'google/gemini-3.8-flash',
      models:['google/gemini-3.8-flash','anthropic/claude-sonnet-5']
    });
  }

  if(process.env.GEMINI_API_KEY){
    push({
      name:'gemini',
      base:process.env.GEMINI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta/openai',
      key:process.env.GEMINI_API_KEY,
      model:process.env.GEMINI_MODEL||'gemini-3.8-flash'
    });
  }

  if(process.env.DEEPSEEK_API_KEY){
    const raw=(process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com').replace(/\/$/,'');
    push({
      name:'deepseek',
      base:/^https:\/\/api\.deepseek\.com\/v1$/i.test(raw)?'https://api.deepseek.com':raw,
      key:process.env.DEEPSEEK_API_KEY,
      model:process.env.DEEPSEEK_MODEL||'deepseek-flash'
    });
  }

  if(process.env.NVIDIA_API_KEY){
    push({
      name:'nvidia',
      base:process.env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1',
      key:process.env.NVIDIA_API_KEY,
      model:process.env.NVIDIA_MODEL||'nvidia/nemotron-3.5-lightning-30b-a3b'
    });
  }

  if(process.env.OPENROUTER_API_KEY){
    push({
      name:'openrouter',
      base:'https://openrouter.ai/api/v1',
      key:process.env.OPENROUTER_API_KEY,
      model:process.env.OPENROUTER_MODEL||'openrouter/auto',
      headers:{'X-Title':'PredictLM'}
    });
  }

  if(process.env.OPENAI_API_KEY){
    push({
      name:'openai',
      base:process.env.OPENAI_BASE_URL||'https://api.openai.com/v1',
      key:process.env.OPENAI_API_KEY,
      model:process.env.OPENAI_MODEL||'gpt-5.6-luna'
    });
  }
  for(const external of allExternalProviderSpecs()){
    if(external.protocol==='anthropic')continue;
    push({
      name:external.name,
      base:external.base,
      key:external.key,
      model:external.model,
      headers:external.headers,
      protocol:external.protocol==='responses'?'responses':'openai'
    });
  }

  const explicit=process.env.PREDICTLM_STREAM_PROVIDER_ORDER||process.env.PREDICTLM_PROVIDER_ORDER;
  const route=jevRouteDecision(prompt,{hasTools:false});
  const preferred=(explicit
    ||'localcode,gptoss,puterpool,freellmapi,groq,opencode,openrouter,vercel-gateway,gemini,deepseek,nvidia,openai,mistral,huggingface,together,fireworks,sambanova,cerebras,deepinfra,requesty,modelscope,siliconflow,nebius,novita,scaleway,venice,friendli,inference-net,llm7,hetzner,nous,ollama-cloud')
    .split(',').map(x=>x.trim()).filter(Boolean);
  const rank=(provider:Provider)=>{
    const index=preferred.indexOf(provider.name);
    let score=index<0?999:index;
    if(!explicit){
      const m=provider.model.toLowerCase();
      // Quality floor: Predict Auto should not silently downgrade ordinary Chat
      // below the configured Gemini-class gateway just to save latency/cost.
      if(provider.name==='vercel-gateway'||/gemini-3\.8-flash/.test(m))score-=20;
      if((route.tier==='strong'||route.tier==='long')&&/mini|lite|free|luna|haiku/.test(m))score+=30;
      if(provider.name==='freellmapi')score+=20;
    }
    return score;
  };
  return circuitReadyProviders(out.sort((a,b)=>rank(a)-rank(b)));
}

function systemPrompt(language:string,autoLearning='',brainContext='',prompt=''){
  return [
    'Você é o PredictLM, uma IA geral de conversa.',
    language==='en'
      ? 'Answer in English unless the user clearly requests another language.'
      : 'Responda em português do Brasil, a menos que o usuário peça claramente outro idioma.',
    'Responda ao pedido atual diretamente e preserve o contexto recente da conversa.',
    'Não mencione provider, API, roteamento, runtime, RAG, skill, knowledge pack ou implementação interna.',
    'Não despeje README, repositórios, notas internas, seções "Relacionado:" ou contexto técnico que o usuário não pediu.',
    'Se a mensagem for casual, converse naturalmente e acompanhe o registro do usuário. Não transforme conversa leve em palestra, diagnóstico ou interrogatório.',
    'Em conversa casual, não comece com “sou uma IA”, “não sou um ser vivo” ou ressalvas semelhantes quando isso não for necessário para responder.',
    'Não termine toda resposta casual com uma pergunta. Quando a fala do usuário já funciona como piada, personagem, bordão ou absurdo, responda e desenvolva a graça antes de pedir qualquer esclarecimento.',
    isPlayfulPrompt(prompt)?'MODO LÚDICO: entre na brincadeira, acompanhe a premissa e o vocabulário do usuário. Se ele inventar um nome/persona, reconheça e brinque junto. Se misturar formas, dimensões ou palavras absurdas, construa em cima disso primeiro; só faça a correção matemática literal se ela ajudar. Evite “isso é só aleatório?”, “preciso de contexto” e disclaimers que matem a piada.':'',
    'Não invente fatos atuais. Quando o usuário pedir informação atual e nenhuma ferramenta atual tiver sido usada, deixe claro o limite em vez de fabricar.',
    'Não introduza ressalvas irrelevantes sobre ser IA, memória, provider ou cânone. Só mencione uma limitação quando ela realmente mudar a resposta pedida.',
    autoLearning?'Lições operacionais autoaprendidas e promovidas:\n'+autoLearning:'',
    brainContext?'COGNITIVE MESH / CONTEXTO INTERNO DE ALTO NÍVEL:\n'+brainContext:''
  ].join(' ');
}

function safeMessages(input:any,language:string,autoLearning='',brainContext='',prompt=''):Msg[]{
  const rows=(Array.isArray(input)?input:[])
    .filter((x:any)=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string')
    .slice(-12)
    .map((x:any)=>({
      role:x.role as 'user'|'assistant',
      content:x.role==='assistant'
        ? safeHistoryForModel(String(x.content))
        : String(x.content).replace(/\u0000/g,'').slice(0,5000)
    }))
    .filter((x:any)=>x.content);
  return [{role:'system',content:systemPrompt(language,autoLearning,brainContext,prompt)},...rows];
}

function sse(data:any){
  return 'data: '+JSON.stringify(data)+'\n\n';
}

async function openProvider(provider:Provider,messages:Msg[],signal:AbortSignal){
  const body:any=provider.protocol==='responses'
    ?{
        model:provider.model,
        input:messages.map(message=>({role:message.role,content:[{type:'input_text',text:message.content}]})),
        stream:true,
        max_output_tokens:1400
      }
    :{
        model:provider.model,
        messages,
        stream:true,
        temperature:0.6,
        max_tokens:1400
      };
  if(provider.models?.length&&provider.protocol!=='responses')body.models=provider.models;
  if(provider.name==='nvidia'&&provider.protocol!=='responses')body.chat_template_kwargs={enable_thinking:false};

  const endpoint=provider.protocol==='responses'?'/responses':'/chat/completions';
  const response=await fetch(provider.base.replace(/\/$/,'')+endpoint,{
    method:'POST',
    signal,
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+provider.key,
      ...(provider.headers||{})
    },
    body:JSON.stringify(body)
  });
  if(!response.ok||!response.body){
    throw new Error('upstream-http-'+response.status);
  }
  const contentType=String(response.headers.get('content-type')||'').toLowerCase();
  if(!contentType.includes('text/event-stream')&&!contentType.includes('application/json')){
    throw new Error('upstream-invalid-content-type');
  }
  return response;
}

async function collectOpenAIStream(
  response:Response,
  signal:AbortSignal
){
  const reader=response.body!.getReader();
  const decoder=new TextDecoder();
  let buffer='';
  let accumulated='';
  let receivedBytes=0;

  while(true){
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    const {done,value}=await reader.read();
    if(done)break;
    receivedBytes+=value?.byteLength||0;
    if(receivedBytes>1_048_576)throw new Error('upstream-stream-too-large');
    buffer+=decoder.decode(value,{stream:true});
    const lines=buffer.split(/\r?\n/);
    buffer=lines.pop()||'';

    for(const rawLine of lines){
      const line=rawLine.trim();
      if(!line.startsWith('data:'))continue;
      const payload=line.slice(5).trim();
      if(!payload||payload==='[DONE]')continue;
      let data:any;
      try{data=JSON.parse(payload)}catch{continue}
      const token=data?.type==='response.output_text.delta'
        ?String(data?.delta||'')
        :String(data?.choices?.[0]?.delta?.content||'');
      if(token)accumulated+=token;
      if(data?.type==='response.completed'&&!accumulated){
        for(const item of Array.isArray(data?.response?.output)?data.response.output:[]){
          for(const part of Array.isArray(item?.content)?item.content:[]){
            if(part?.type==='output_text'&&typeof part?.text==='string')accumulated+=part.text;
          }
        }
      }
    }
  }
  return accumulated.trim();
}

function emitValidatedAnswer(
  content:string,
  provider:Provider,
  controller:ReadableStreamDefaultController<Uint8Array>,
  encoder:TextEncoder
){
  controller.enqueue(encoder.encode(sse({meta:{provider:provider.name,model:provider.model,validated:true}})));
  // Keep the client streaming UX, but only after the complete draft passed the
  // semantic/public gates. This prevents an off-topic provider stream from
  // leaking irreversible tokens into the conversation.
  const chunks=content.match(/[\s\S]{1,180}/g)||[];
  for(const chunk of chunks)controller.enqueue(encoder.encode(sse({content:chunk})));
  controller.enqueue(encoder.encode(sse({done:true,provider:provider.name,model:provider.model,validated:true})));
  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
}

export async function POST(req:NextRequest){
  const correlationId=crypto.randomUUID();
  const body=await req.json().catch(()=>({}));
  const language=body?.language==='en'?'en':'pt-BR';
  const rawRows=(Array.isArray(body?.messages)?body.messages:[]);
  const prompt=String([...rawRows].reverse().find((x:any)=>x?.role==='user'&&typeof x?.content==='string')?.content||'').replace(/\u0000/g,'').trim();
  const sessionScope=safeSessionScope(body?.sessionId);
  const apiBudget=createProviderTurnBudget(sessionScope||'anonymous');
  if(!prompt)return Response.json({error:'prompt is required',correlationId},{status:400,headers:{'X-Correlation-Id':correlationId}});
  if(prompt.length>50_000)return Response.json({error:'prompt too large',code:'PROMPT_TOO_LARGE',correlationId},{status:413,headers:{'X-Correlation-Id':correlationId}});
  const lease=acquireChatRequest(req,sessionScope);
  if(!lease.allowed){
    return Response.json(
      {...publicFailurePayload(correlationId,'RATE_LIMITED'),retryAfterMs:lease.retryAfterMs},
      {status:429,headers:{'Cache-Control':'no-store','Retry-After':String(Math.max(1,Math.ceil(lease.retryAfterMs/1000))),'X-Correlation-Id':correlationId}}
    );
  }
  const candidates=providerList(prompt).slice(0,Math.max(1,apiBudget.maxTotalCalls));

  // Do not touch Supabase/learning or any other network when there is no
  // configured streaming provider. This keeps the offline/no-provider path
  // deterministic and avoids a pointless request before the 503 fallback.
  if(!candidates.length){
    lease.release();
    return Response.json({
      error:'Nenhum provider de chat está configurado.',
      code:'NO_STREAM_PROVIDER',
      correlationId
    },{status:503,headers:{'Cache-Control':'no-store','X-Correlation-Id':correlationId}});
  }

  const autoLearning=await runtimeAutoLearningContext(String(prompt),3,'chat');
  const brainContext=String(body?.brainContext||'').slice(0,10000);
  const messages=safeMessages(body?.messages,language,autoLearning,brainContext,String(prompt));

  const encoder=new TextEncoder();
  const requestSignal=req.signal;

  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      const errors:string[]=[];
      let completed=false;
      try{
        for(const provider of candidates){
          if(requestSignal.aborted)break;
          const reservation=apiBudget.reserve(provider,estimateProviderTokens(messages,1400),'stream-answer');
          if(!reservation.ok){
            errors.push('provider-budget-'+reservation.reason);
            continue;
          }
          const providerController=new AbortController();
          const onAbort=()=>providerController.abort();
          requestSignal.addEventListener('abort',onAbort,{once:true});
          const timer=setTimeout(()=>providerController.abort(),10000);
          try{
            const upstream=await openProvider(provider,messages,providerController.signal);
            const content=await collectOpenAIStream(upstream,providerController.signal);
            if(!content){
              errors.push(provider.name+': empty-stream');
              continue;
            }
            const currentPrompt=[...messages].reverse().find(x=>x.role==='user')?.content||'';
            const gate=publicAnswerGate(content,language as any,currentPrompt);
            const issue=gate.ok?conversationAnswerIssue(currentPrompt,gate.content):gate.reason;
            const alignment=gate.ok?responseTopicAlignment(currentPrompt,gate.content):{relevant:false};
            if(!gate.ok||issue||!alignment.relevant){
              recordProviderFailure(provider,new Error('answer-rejected-'+String(issue||'off-topic')));
              errors.push('rejected');
              continue;
            }
            recordProviderSuccess(provider);
            completed=true;
            controller.enqueue(encoder.encode(sse({budget:apiBudget.snapshot()})));
            emitValidatedAnswer(gate.content,provider,controller,encoder);
            break;
          }catch(error:any){
            recordProviderFailure(provider,error);
            errors.push('upstream-failure');
          }finally{
            clearTimeout(timer);
            requestSignal.removeEventListener('abort',onAbort);
          }
        }

        if(!completed&&!requestSignal.aborted){
          controller.enqueue(encoder.encode(sse({
            ...publicFailurePayload(correlationId,'STREAM_PROVIDERS_FAILED')
          })));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }
      }finally{
        lease.release();
        controller.close();
      }
    }
  });

  return new Response(stream,{
    headers:{
      'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-cache, no-transform',
      'Connection':'keep-alive',
      'X-Accel-Buffering':'no',
      'X-Correlation-Id':correlationId
    }
  });
}
