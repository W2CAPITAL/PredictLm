import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../src/app/api/chat/stream/route';
import {resetProviderHealthForTests} from '../src/lib/server/provider-health';

const envKeys=[
  'FREELLMAPI_BASE_URL','FREELLMAPI_API_KEY','FREELLMAPI_MODEL',
  'GROQ_API_KEY','GROQ_MODEL',
  'AI_GATEWAY_API_KEY','AI_GATEWAY_MODEL','AI_GATEWAY_BASE_URL','VERCEL_OIDC_TOKEN',
  'GEMINI_API_KEY','GEMINI_MODEL','GEMINI_BASE_URL',
  'DEEPSEEK_API_KEY','DEEPSEEK_MODEL','DEEPSEEK_BASE_URL',
  'NVIDIA_API_KEY','NVIDIA_MODEL','NVIDIA_BASE_URL',
  'OPENROUTER_API_KEY','OPENROUTER_MODEL',
  'OPENAI_API_KEY','OPENAI_MODEL','OPENAI_BASE_URL',
  'PREDICTLM_STREAM_PROVIDER_ORDER','PREDICTLM_PROVIDER_ORDER'
];

function clearProviders(){
  for(const key of envKeys)delete process.env[key];
  resetProviderHealthForTests();
}

function upstream(parts:string[]){
  const encoder=new TextEncoder();
  return new Response(new ReadableStream({
    start(controller){
      for(const part of parts){
        controller.enqueue(encoder.encode('data: '+JSON.stringify({
          choices:[{delta:{content:part}}]
        })+'\n\n'));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  }),{status:200,headers:{'Content-Type':'text/event-stream'}});
}

function request(messages:any[]){
  return new Request('http://predictlm.test/api/chat/stream',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({messages,language:'pt-BR'})
  }) as any;
}

function isAutoLearningFetch(input:any){
  return String(input).includes('/rest/v1/predict_auto_lessons');
}

function autoLearningResponse(){
  return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}});
}

test('stream chat sends history to Groq and emits only a semantically validated draft',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  process.env.GROQ_MODEL='openai/gpt-oss-120b';
  const original=globalThis.fetch;
  let seenBody:any=null;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    if(isAutoLearningFetch(input))return autoLearningResponse();
    assert.equal(String(input),'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(String((init?.headers as any)?.Authorization||''),'Bearer groq-test');
    seenBody=JSON.parse(String(init?.body||'{}'));
    assert.equal(seenBody.stream,true);
    return upstream(['Batata ','é boa ','demais.']);
  };
  try{
    const response=await POST(request([
      {role:'user',content:'Eu gosto de batatas'},
      {role:'assistant',content:'Boa escolha.'},
      {role:'user',content:'Qual sua forma favorita?'}
    ]));
    assert.equal(response.status,200);
    assert.match(String(response.headers.get('content-type')),/text\/event-stream/);
    const text=await response.text();
    assert.match(text,/"provider":"groq"/);
    assert.match(text,/"validated":true/);
    assert.match(text,/"content":"Batata é boa demais\."/);
    assert.ok(seenBody.messages.some((x:any)=>x.role==='assistant'&&x.content==='Boa escolha.'));
    assert.equal(seenBody.messages.at(-1).content,'Qual sua forma favorita?');
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});

test('stream chat falls through from failed Groq to Vercel AI Gateway',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  process.env.VERCEL_OIDC_TOKEN='oidc-test';
  process.env.PREDICTLM_STREAM_PROVIDER_ORDER='groq,vercel-gateway';
  const original=globalThis.fetch;
  const calls:string[]=[];
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    const url=String(input);
    if(isAutoLearningFetch(input))return autoLearningResponse();
    calls.push(url);
    if(url.includes('api.groq.com')){
      return new Response(JSON.stringify({error:'rate limited'}),{status:429,headers:{'Content-Type':'application/json'}});
    }
    assert.equal(url,'https://ai-gateway.vercel.sh/v1/chat/completions');
    assert.equal(String((init?.headers as any)?.Authorization||''),'Bearer oidc-test');
    const body=JSON.parse(String(init?.body||'{}'));
    assert.equal(body.model,'google/gemini-3.8-flash');
    assert.deepEqual(body.models,['google/gemini-3.8-flash','anthropic/claude-sonnet-5']);
    return upstream(['Oi! ','Funcionou pelo Gateway.']);
  };
  try{
    const response=await POST(request([{role:'user',content:'Diga oi'}]));
    const text=await response.text();
    assert.equal(response.status,200);
    assert.match(text,/"provider":"vercel-gateway"/);
    assert.match(text,/Funcionou/);
    assert.deepEqual(calls,[
      'https://api.groq.com/openai/v1/chat/completions',
      'https://ai-gateway.vercel.sh/v1/chat/completions'
    ]);
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});

test('stream chat uses current Gemini and DeepSeek defaults',async()=>{
  clearProviders();
  process.env.GEMINI_API_KEY='gem-test';
  process.env.DEEPSEEK_API_KEY='deep-test';
  process.env.PREDICTLM_STREAM_PROVIDER_ORDER='gemini,deepseek';
  const original=globalThis.fetch;
  const models:string[]=[];
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    if(isAutoLearningFetch(input))return autoLearningResponse();
    const body=JSON.parse(String(init?.body||'{}'));
    models.push(body.model);
    if(String(input).includes('generativelanguage')){
      return new Response('temporary',{status:503});
    }
    assert.equal(String(input),'https://api.deepseek.com/chat/completions');
    return upstream(['A Lua tem fases porque vemos porções diferentes da metade iluminada pelo Sol.']);
  };
  try{
    const response=await POST(request([{role:'user',content:'Explique a lua'}]));
    const text=await response.text();
    assert.match(text,/"provider":"deepseek"/);
    assert.deepEqual(models,['gemini-3.8-flash','deepseek-flash']);
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});

test('stream chat returns 503 when no remote API exists',async()=>{
  clearProviders();
  const response=await POST(request([{role:'user',content:'Olá'}]));
  assert.equal(response.status,503);
  const data=await response.json();
  assert.equal(data.code,'NO_STREAM_PROVIDER');
});


test('stream chat receives unified cognitive mesh in the system context',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  process.env.GROQ_MODEL='openai/gpt-oss-120b';
  const original=globalThis.fetch;
  let seenBody:any=null;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    if(isAutoLearningFetch(input))return autoLearningResponse();
    seenBody=JSON.parse(String(init?.body||'{}'));
    return upstream(['Oi, contexto integrado.']);
  };
  try{
    const req=new Request('http://predictlm.test/api/chat/stream',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        messages:[{role:'user',content:'Diga oi'}],
        language:'pt-BR',
        brainContext:'MOUSE CORE ativo; Fly Human Macaque integrados.'
      })
    }) as any;
    const response=await POST(req);
    await response.text();
    assert.ok(seenBody);
    assert.match(String(seenBody.messages?.[0]?.content||''),/COGNITIVE MESH/);
    assert.match(String(seenBody.messages?.[0]?.content||''),/MOUSE CORE ativo/);
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});


test('stream chat injects playful-premise guidance for absurd and fictional questions',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  process.env.GROQ_MODEL='openai/gpt-oss-120b';
  const original=globalThis.fetch;
  const seen:any[]=[];
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    if(isAutoLearningFetch(input))return autoLearningResponse();
    const body=JSON.parse(String(init?.body||'{}'));
    seen.push(body);
    const prompt=[...body.messages].reverse().find((x:any)=>x.role==='user')?.content||'';
    if(/pepino/i.test(prompt))return upstream(['Um pepino triangular arroxeado parece um artefato culinário de outro planeta. Eu não provo comida, mas a ideia é estranha o bastante para eu querer ver a receita.']);
    return upstream(['Se entrarmos na brincadeira, o McQueen provavelmente trataria a banana como combustível de corrida e faria piada com um pit stop. É uma interpretação divertida, não uma opinião canônica do personagem.']);
  };
  try{
    const a=await POST(request([{role:'user',content:'Gosta de pepino triangular a roxeado?'}]));
    const aText=await a.text();
    assert.match(aText,/pepino triangular/i);

    const b=await POST(request([{role:'user',content:'O que o McQueen acha de você comendo banana?'}]));
    const bText=await b.text();
    assert.match(bText,/McQueen/i);
    assert.match(bText,/banana/i);

    assert.equal(seen.length,2);
    for(const body of seen){
      const system=String(body.messages?.[0]?.content||'');
      assert.match(system,/absurda|lúdica|personagem/i);
      assert.match(system,/entre na brincadeira/i);
    }
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});


test('stream chat rejects a flat literal McQueen answer and tries another provider',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  process.env.VERCEL_OIDC_TOKEN='oidc-test';
  process.env.PREDICTLM_STREAM_PROVIDER_ORDER='groq,vercel-gateway';
  const original=globalThis.fetch;
  const calls:string[]=[];
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    const url=String(input);
    if(isAutoLearningFetch(input))return autoLearningResponse();
    calls.push(url);
    if(url.includes('api.groq.com')){
      return upstream(['Não tem muito o que falar sobre isso. McQueen é um personagem de corrida, não tem opinião sobre comida.']);
    }
    const body=JSON.parse(String(init?.body||'{}'));
    const system=String(body.messages?.[0]?.content||'');
    assert.match(system,/entre na brincadeira/i);
    return upstream(['Eu imagino o McQueen tratando a banana como combustível de piloto, fazendo uma piada de pit stop e transformando o lanche numa competição. É uma interpretação divertida, não uma opinião canônica.']);
  };
  try{
    const response=await POST(request([{role:'user',content:'O que o McQueen acha de você comendo banana?'}]));
    const text=await response.text();
    assert.equal(response.status,200);
    assert.match(text,/"provider":"vercel-gateway"/);
    assert.match(text,/banana/i);
    assert.doesNotMatch(text,/Não tem muito o que falar/);
    assert.deepEqual(calls,[
      'https://api.groq.com/openai/v1/chat/completions',
      'https://ai-gateway.vercel.sh/v1/chat/completions'
    ]);
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});
