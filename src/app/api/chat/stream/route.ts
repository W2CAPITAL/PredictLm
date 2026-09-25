import { NextRequest } from 'next/server';

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
};

function loopbackBase(base:string){
  try{
    const host=new URL(base).hostname.toLowerCase();
    return host==='127.0.0.1'||host==='localhost'||host==='0.0.0.0'||host==='::1';
  }catch{return false}
}

function serverCanReach(base:string){
  return !(process.env.VERCEL&&loopbackBase(base));
}

function providerList():Provider[]{
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
      model:process.env.AI_GATEWAY_MODEL||'nvidia/nemotron-3.5-lightning',
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

  const preferred=(process.env.PREDICTLM_STREAM_PROVIDER_ORDER
    ||process.env.PREDICTLM_PROVIDER_ORDER
    ||'freellmapi,groq,vercel-gateway,gemini,deepseek,nvidia,openrouter,openai')
    .split(',').map(x=>x.trim()).filter(Boolean);
  const rank=(name:string)=>{
    const index=preferred.indexOf(name);
    return index<0?999:index;
  };
  return out.sort((a,b)=>rank(a.name)-rank(b.name));
}

function systemPrompt(language:string){
  return [
    'Você é o PredictLM, uma IA geral de conversa.',
    language==='en'
      ? 'Answer in English unless the user clearly requests another language.'
      : 'Responda em português do Brasil, a menos que o usuário peça claramente outro idioma.',
    'Responda ao pedido atual diretamente e preserve o contexto recente da conversa.',
    'Não mencione provider, API, roteamento, runtime, RAG, skill, knowledge pack ou implementação interna.',
    'Não despeje README, repositórios, notas internas, seções "Relacionado:" ou contexto técnico que o usuário não pediu.',
    'Se a mensagem for casual, converse naturalmente. Se for uma pergunta, responda. Se for um pedido, execute o pedido em texto.',
    'Não invente fatos atuais. Quando o usuário pedir informação atual e nenhuma ferramenta atual tiver sido usada, deixe claro o limite em vez de fabricar.'
  ].join(' ');
}

function safeMessages(input:any,language:string):Msg[]{
  const rows=(Array.isArray(input)?input:[])
    .filter((x:any)=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string')
    .slice(-12)
    .map((x:any)=>({
      role:x.role as 'user'|'assistant',
      content:String(x.content).replace(/\u0000/g,'').slice(0,5000)
    }));
  return [{role:'system',content:systemPrompt(language)},...rows];
}

function sse(data:any){
  return 'data: '+JSON.stringify(data)+'\n\n';
}

async function openProvider(provider:Provider,messages:Msg[],signal:AbortSignal){
  const body:any={
    model:provider.model,
    messages,
    stream:true,
    temperature:0.6,
    max_tokens:1400
  };
  if(provider.models?.length)body.models=provider.models;
  if(provider.name==='nvidia')body.chat_template_kwargs={enable_thinking:false};

  const response=await fetch(provider.base.replace(/\/$/,'')+'/chat/completions',{
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
    const raw=await response.text().catch(()=> '');
    throw new Error(provider.name+' '+response.status+' '+raw.slice(0,180));
  }
  return response;
}

async function pipeOpenAIStream(
  response:Response,
  provider:Provider,
  controller:ReadableStreamDefaultController<Uint8Array>,
  encoder:TextEncoder,
  signal:AbortSignal
){
  const reader=response.body!.getReader();
  const decoder=new TextDecoder();
  let buffer='';
  let emitted=false;

  while(true){
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    const {done,value}=await reader.read();
    if(done)break;
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
      const token=String(data?.choices?.[0]?.delta?.content||'');
      if(!token)continue;
      if(!emitted){
        controller.enqueue(encoder.encode(sse({meta:{provider:provider.name,model:provider.model}})));
        emitted=true;
      }
      controller.enqueue(encoder.encode(sse({content:token})));
    }
  }
  return emitted;
}

export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({}));
  const language=body?.language==='en'?'en':'pt-BR';
  const messages=safeMessages(body?.messages,language);
  const candidates=providerList().slice(0,8);

  if(!candidates.length){
    return Response.json({
      error:'Nenhum provider de chat está configurado.',
      code:'NO_STREAM_PROVIDER'
    },{status:503,headers:{'Cache-Control':'no-store'}});
  }

  const encoder=new TextEncoder();
  const requestSignal=req.signal;

  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      const errors:string[]=[];
      let completed=false;
      try{
        for(const provider of candidates){
          if(requestSignal.aborted)break;
          const providerController=new AbortController();
          const onAbort=()=>providerController.abort();
          requestSignal.addEventListener('abort',onAbort,{once:true});
          const timer=setTimeout(()=>providerController.abort(),10000);
          try{
            const upstream=await openProvider(provider,messages,providerController.signal);
            const emitted=await pipeOpenAIStream(upstream,provider,controller,encoder,providerController.signal);
            if(emitted){
              completed=true;
              controller.enqueue(encoder.encode(sse({done:true,provider:provider.name,model:provider.model})));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }
            errors.push(provider.name+': empty-stream');
          }catch(error:any){
            errors.push(provider.name+': '+String(error?.message||error||'failed').slice(0,220));
          }finally{
            clearTimeout(timer);
            requestSignal.removeEventListener('abort',onAbort);
          }
        }

        if(!completed&&!requestSignal.aborted){
          controller.enqueue(encoder.encode(sse({
            error:'Nenhuma API conseguiu iniciar a resposta.',
            code:'STREAM_PROVIDERS_FAILED',
            errors:errors.slice(0,8)
          })));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }
      }finally{
        controller.close();
      }
    }
  });

  return new Response(stream,{
    headers:{
      'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-cache, no-transform',
      'Connection':'keep-alive',
      'X-Accel-Buffering':'no'
    }
  });
}
