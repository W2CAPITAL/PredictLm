import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../src/app/api/media/generate/route';

function imageRequest(prompt='um gato em estilo anime'){
  return new Request('http://predictlm.test/api/media/generate',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      prompt,
      originalPrompt:prompt,
      promptMode:'auto',
      style:'Anime',
      styleLocked:true,
      width:1024,
      height:1024,
      seed:11,
      referenceMode:'off'
    })
  });
}

test('Vercel OIDC Gemini image uses chat completions and returns generated image',async()=>{
  const originalFetch=globalThis.fetch;
  const oldOrder=process.env.PREDICTLM_IMAGE_PROVIDER_ORDER;
  const oldOidc=process.env.VERCEL_OIDC_TOKEN;
  const oldModels=process.env.PREDICTLM_GATEWAY_IMAGE_MODELS;
  const oldGemini=process.env.GEMINI_API_KEY;
  const calls:any[]=[];
  process.env.PREDICTLM_IMAGE_PROVIDER_ORDER='vercel-gateway';
  process.env.VERCEL_OIDC_TOKEN='oidc-test';
  process.env.PREDICTLM_GATEWAY_IMAGE_MODELS='google/gemini-3.1-flash-image';
  delete process.env.GEMINI_API_KEY;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    calls.push({url:String(input),body:JSON.parse(String(init?.body||'{}'))});
    return new Response(JSON.stringify({
      choices:[{message:{images:[{type:'image_url',image_url:{url:'data:image/png;base64,AAAA'}}]}}]
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const response=await POST(imageRequest());
    const body=await response.json();
    assert.equal(response.status,200);
    assert.equal(body.provider,'vercel-gateway-image');
    assert.equal(body.model,'google/gemini-3.1-flash-image');
    assert.equal(body.url,'data:image/png;base64,AAAA');
    assert.equal(calls[0].url,'https://ai-gateway.vercel.sh/v1/chat/completions');
    assert.equal(calls[0].body.model,'google/gemini-3.1-flash-image');
  }finally{
    globalThis.fetch=originalFetch;
    if(oldOrder===undefined)delete process.env.PREDICTLM_IMAGE_PROVIDER_ORDER; else process.env.PREDICTLM_IMAGE_PROVIDER_ORDER=oldOrder;
    if(oldOidc===undefined)delete process.env.VERCEL_OIDC_TOKEN; else process.env.VERCEL_OIDC_TOKEN=oldOidc;
    if(oldModels===undefined)delete process.env.PREDICTLM_GATEWAY_IMAGE_MODELS; else process.env.PREDICTLM_GATEWAY_IMAGE_MODELS=oldModels;
    if(oldGemini===undefined)delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY=oldGemini;
  }
});

test('Vercel Gateway falls through from Gemini chat to Grok image generations',async()=>{
  const originalFetch=globalThis.fetch;
  const oldOrder=process.env.PREDICTLM_IMAGE_PROVIDER_ORDER;
  const oldOidc=process.env.VERCEL_OIDC_TOKEN;
  const oldModels=process.env.PREDICTLM_GATEWAY_IMAGE_MODELS;
  const oldGemini=process.env.GEMINI_API_KEY;
  const calls:string[]=[];
  process.env.PREDICTLM_IMAGE_PROVIDER_ORDER='vercel-gateway';
  process.env.VERCEL_OIDC_TOKEN='oidc-test';
  process.env.PREDICTLM_GATEWAY_IMAGE_MODELS='google/gemini-3.1-flash-image,spacexai/grok-imagine-image';
  delete process.env.GEMINI_API_KEY;
  globalThis.fetch=async(input:any)=>{
    const url=String(input);
    calls.push(url);
    if(url.endsWith('/chat/completions')){
      return new Response(JSON.stringify({error:{message:'temporary'}}),{status:503,headers:{'Content-Type':'application/json'}});
    }
    return new Response(JSON.stringify({data:[{b64_json:'BBBB'}]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const response=await POST(imageRequest());
    const body=await response.json();
    assert.equal(response.status,200);
    assert.equal(body.model,'spacexai/grok-imagine-image');
    assert.equal(body.url,'data:image/png;base64,BBBB');
    assert.deepEqual(calls,[
      'https://ai-gateway.vercel.sh/v1/chat/completions',
      'https://ai-gateway.vercel.sh/v1/images/generations'
    ]);
  }finally{
    globalThis.fetch=originalFetch;
    if(oldOrder===undefined)delete process.env.PREDICTLM_IMAGE_PROVIDER_ORDER; else process.env.PREDICTLM_IMAGE_PROVIDER_ORDER=oldOrder;
    if(oldOidc===undefined)delete process.env.VERCEL_OIDC_TOKEN; else process.env.VERCEL_OIDC_TOKEN=oldOidc;
    if(oldModels===undefined)delete process.env.PREDICTLM_GATEWAY_IMAGE_MODELS; else process.env.PREDICTLM_GATEWAY_IMAGE_MODELS=oldModels;
    if(oldGemini===undefined)delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY=oldGemini;
  }
});
