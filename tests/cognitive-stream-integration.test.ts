import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../src/app/api/chat/cognitive-stream/route';

const envKeys=[
  'FREELLMAPI_BASE_URL','FREELLMAPI_API_KEY','FREELLMAPI_MODEL',
  'GROQ_API_KEY','GROQ_MODEL',
  'AI_GATEWAY_API_KEY','AI_GATEWAY_MODEL','AI_GATEWAY_BASE_URL','VERCEL_OIDC_TOKEN',
  'GEMINI_API_KEY','GEMINI_MODEL','GEMINI_BASE_URL',
  'DEEPSEEK_API_KEY','DEEPSEEK_MODEL','DEEPSEEK_BASE_URL',
  'NVIDIA_API_KEY','NVIDIA_MODEL','NVIDIA_BASE_URL',
  'OPENROUTER_API_KEY','OPENROUTER_MODEL',
  'OPENAI_API_KEY','OPENAI_MODEL','OPENAI_BASE_URL',
  'PREDICTLM_COGNITIVE_PROVIDER_ORDER','PREDICTLM_STREAM_PROVIDER_ORDER','PREDICTLM_PROVIDER_ORDER'
];

function clearProviders(){
  for(const key of envKeys)delete process.env[key];
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

function request(messages:any[],cognitiveContext:string,cognitiveMode?:'dual'|'fly'|'human'|'macaque'){
  return new Request('http://predictlm.test/api/chat/cognitive-stream',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({messages,language:'pt-BR',cognitiveContext,cognitiveMode})
  }) as any;
}

test('cognitive stream injects dual-cognitive context while preserving chat history',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  process.env.GROQ_MODEL='openai/gpt-oss-120b';
  const original=globalThis.fetch;
  let seen:any=null;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    assert.equal(String(input),'https://api.groq.com/openai/v1/chat/completions');
    seen=JSON.parse(String(init?.body||'{}'));
    return upstream(['Resposta ','cognitiva.']);
  };
  try{
    const response=await POST(request([
      {role:'user',content:'Eu gosto de batatas'},
      {role:'assistant',content:'Batata é boa.'},
      {role:'user',content:'E macaco?'}
    ],[
      'COGNITIVE LAB',
      'FLY CONNECTOME CORE — FlyWire FAFB v783',
      'HUMAN CONNECTOME CORE — H01 mapped cortical fragment',
      'GLOBAL WORKSPACE mode balanced'
    ].join('\n')));

    assert.equal(response.status,200);
    const text=await response.text();
    assert.match(text,/"mode":"dual-cognitive"/);
    assert.match(text,/"provider":"groq"/);
    assert.match(text,/"content":"Resposta "/);
    const system=seen.messages.find((x:any)=>x.role==='system')?.content||'';
    assert.match(system,/FlyWire FAFB v783/);
    assert.match(system,/H01 mapped cortical fragment/);
    assert.match(system,/NÃO prova consciência|NÃO prova consciência|NÃO prova/i);
    assert.ok(seen.messages.some((x:any)=>x.role==='assistant'&&x.content==='Batata é boa.'));
    assert.equal(seen.messages.at(-1).content,'E macaco?');
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});

test('cognitive stream falls through providers without touching normal chat route',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  process.env.VERCEL_OIDC_TOKEN='oidc-test';
  process.env.PREDICTLM_COGNITIVE_PROVIDER_ORDER='groq,vercel-gateway';
  const original=globalThis.fetch;
  const calls:string[]=[];
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    const url=String(input);
    calls.push(url);
    if(url.includes('api.groq.com')){
      return new Response(JSON.stringify({error:'rate-limit'}),{status:429,headers:{'Content-Type':'application/json'}});
    }
    assert.equal(url,'https://ai-gateway.vercel.sh/v1/chat/completions');
    const body=JSON.parse(String(init?.body||'{}'));
    assert.equal(body.model,'nvidia/nemotron-3.5-lightning');
    assert.deepEqual(body.models,['google/gemini-3.8-flash','anthropic/claude-sonnet-5']);
    return upstream(['Gateway cognitivo ativo.']);
  };
  try{
    const response=await POST(request([{role:'user',content:'Olá'}],'dual connectome context'));
    const text=await response.text();
    assert.match(text,/"provider":"vercel-gateway"/);
    assert.match(text,/Gateway cognitivo ativo/);
    assert.deepEqual(calls,[
      'https://api.groq.com/openai/v1/chat/completions',
      'https://ai-gateway.vercel.sh/v1/chat/completions'
    ]);
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});

test('cognitive stream returns isolated 503 when no provider exists',async()=>{
  clearProviders();
  const response=await POST(request([{role:'user',content:'Oi'}],'context'));
  assert.equal(response.status,503);
  const data=await response.json();
  assert.equal(data.code,'NO_COGNITIVE_STREAM_PROVIDER');
});


test('fly chat mode identifies itself as the FlyWire-controlled agent and streams normally',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  const original=globalThis.fetch;
  let seen:any=null;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    assert.equal(String(input),'https://api.groq.com/openai/v1/chat/completions');
    seen=JSON.parse(String(init?.body||'{}'));
    return upstream(['Bzz. ','Estou explorando o ambiente e prestando atenção no que mudou.']);
  };
  try{
    const req=new Request('http://predictlm.test/api/chat/cognitive-stream',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        language:'pt-BR',
        cognitiveMode:'fly',
        cognitiveContext:'FLY CONNECTOME CORE — FlyWire FAFB v783\nSalience 71%; exploration 82%.',
        messages:[
          {role:'user',content:'Oi mosca'},
          {role:'assistant',content:'Bzz, oi.'},
          {role:'user',content:'O que você está fazendo?'}
        ]
      })
    }) as any;
    const response=await POST(req);
    assert.equal(response.status,200);
    const text=await response.text();
    assert.match(text,/"mode":"fly-cognitive"/);
    assert.match(text,/Estou explorando/);
    const system=seen.messages.find((x:any)=>x.role==='system')?.content||'';
    assert.match(system,/Mosca Predict/);
    assert.match(system,/FlyWire FAFB v783/);
    assert.match(system,/Não deixe o Human Core dominar/i);
    assert.ok(seen.messages.some((x:any)=>x.role==='assistant'&&x.content==='Bzz, oi.'));
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});


test('macaque chat mode identifies the atlas proxy and streams normally',async()=>{
  clearProviders();
  process.env.GROQ_API_KEY='groq-test';
  const original=globalThis.fetch;
  let seen:any=null;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    assert.equal(String(input),'https://api.groq.com/openai/v1/chat/completions');
    seen=JSON.parse(String(init?.body||'{}'));
    return upstream(['Macaque Core ativo.']);
  };
  try{
    const response=await POST(request(
      [{role:'user',content:'O que você representa?'}],
      'MACAQUE CORTEX CORE — 143 cortical regions, 264 cell types.',
      'macaque'
    ));
    assert.equal(response.status,200);
    const text=await response.text();
    assert.match(text,/"mode":"macaque-cognitive"/);
    assert.match(text,/Macaque Core ativo/);
    const system=seen.messages.find((x:any)=>x.role==='system')?.content||'';
    assert.match(system,/PredictLM Macaque Core/);
    assert.match(system,/atlas cortical espacial\/transcriptômico de macaque/i);
    assert.match(system,/não é um conectoma sináptico/i);
  }finally{
    globalThis.fetch=original;
    clearProviders();
  }
});
