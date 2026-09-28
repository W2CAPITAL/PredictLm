import test from 'node:test';
import assert from 'node:assert/strict';
import {imageProviderOrder} from '../src/lib/media/image-runtime';
import {buildQwenImageRequestBody,qwenImageConfig,qwenPromptExtend} from '../src/lib/media/qwen-image';
import {POST as generateImage} from '../src/app/api/media/generate/route';
import {resetProviderHealthForTests} from '../src/lib/server/provider-health';

test('Qwen Image is a first-class image provider option',()=>{
  assert.deepEqual(
    imageProviderOrder('qwen,gemini,vercel-gateway'),
    ['qwen','gemini','vercel-gateway']
  );
  assert.ok(imageProviderOrder('').includes('qwen'));
});

test('Qwen Image config accepts dedicated key and DashScope compatibility key',()=>{
  const dedicated=qwenImageConfig({
    QWEN_IMAGE_API_KEY:'qwen-key',
    QWEN_IMAGE_BASE_URL:'https://example.com/compatible-mode/v1/',
    QWEN_IMAGE_MODEL:'qwen-image-3.0',
    QWEN_IMAGE_TIMEOUT_MS:'31000',
    QWEN_IMAGE_ENABLE_THINKING:'true'
  } as any);
  assert.equal(dedicated.enabled,true);
  assert.equal(dedicated.key,'qwen-key');
  assert.equal(dedicated.base,'https://example.com/compatible-mode/v1');
  assert.equal(dedicated.model,'qwen-image-3.0');
  assert.equal(dedicated.timeoutMs,31000);
  assert.equal(dedicated.enableThinking,true);

  const dashscope=qwenImageConfig({DASHSCOPE_API_KEY:'dash-key'} as any);
  assert.equal(dashscope.key,'dash-key');
  assert.equal(dashscope.model,'qwen-image-3.0-pro');
});

test('Qwen Image request keeps literal prompts literal and supports up to three references',()=>{
  const body:any=buildQwenImageRequestBody({
    model:'qwen-image-3.0-pro',
    prompt:'Naruto modo Avatar Kurama vs Sasuke Susanoo Perfeito',
    width:1536,
    height:1024,
    seed:42,
    negativePrompt:'duplicate characters',
    references:['https://a.test/1.png','https://a.test/2.png','https://a.test/3.png','https://a.test/4.png'],
    promptMode:'literal',
    enableThinking:false
  });
  assert.equal(body.size,'1536x1024');
  assert.equal(body.seed,42);
  assert.equal(body.negative_prompt,'duplicate characters');
  assert.deepEqual(body.image,[
    'https://a.test/1.png',
    'https://a.test/2.png',
    'https://a.test/3.png'
  ]);
  assert.equal(body.prompt_extend,false);
  assert.equal(body.prompt_extend_mode,'direct');
  assert.equal(body.enable_thinking,false);
  assert.equal(body.watermark,false);
});

test('Qwen prompt extension defaults to enabled outside literal mode but is overrideable',()=>{
  assert.equal(qwenPromptExtend('auto',''),true);
  assert.equal(qwenPromptExtend('literal',''),false);
  assert.equal(qwenPromptExtend('literal','true'),true);
  assert.equal(qwenPromptExtend('auto','false'),false);
});


test('Imagine route actually calls Qwen Image before fallback when configured',async()=>{
  resetProviderHealthForTests();
  const originalFetch=globalThis.fetch;
  const old={
    order:process.env.PREDICTLM_IMAGE_PROVIDER_ORDER,
    key:process.env.QWEN_IMAGE_API_KEY,
    base:process.env.QWEN_IMAGE_BASE_URL,
    model:process.env.QWEN_IMAGE_MODEL,
    gemini:process.env.GEMINI_API_KEY,
    oidc:process.env.VERCEL_OIDC_TOKEN,
    nano:process.env.NANO_BANANA_API_KEY,
    media:process.env.MEDIA_IMAGE_BASE_URL
  };
  const calls:any[]=[];
  process.env.PREDICTLM_IMAGE_PROVIDER_ORDER='qwen';
  process.env.QWEN_IMAGE_API_KEY='qwen-test-key';
  process.env.QWEN_IMAGE_BASE_URL='https://qwen.example/compatible-mode/v1';
  process.env.QWEN_IMAGE_MODEL='qwen-image-3.0-pro';
  delete process.env.GEMINI_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.NANO_BANANA_API_KEY;
  delete process.env.MEDIA_IMAGE_BASE_URL;

  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    calls.push({
      url:String(input),
      auth:(init?.headers as any)?.Authorization,
      body:JSON.parse(String(init?.body||'{}'))
    });
    return new Response(JSON.stringify({
      data:[{url:'https://cdn.example/qwen-result.png'}],
      usage:{output_width:1024,output_height:1024,input_image_count:0,output_image_count:1}
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };

  try{
    const req=new Request('http://predictlm.test/api/media/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        prompt:'uma cidade futurista ao pôr do sol',
        originalPrompt:'uma cidade futurista ao pôr do sol',
        promptMode:'auto',
        style:'Cinematic',
        styleLocked:true,
        width:1024,
        height:1024,
        seed:71,
        referenceMode:'off'
      })
    });
    const response=await generateImage(req);
    const body=await response.json();
    assert.equal(response.status,200);
    assert.equal(body.provider,'qwen-image');
    assert.equal(body.model,'qwen-image-3.0-pro');
    assert.equal(body.url,'https://cdn.example/qwen-result.png');
    assert.equal(calls.length,1);
    assert.equal(calls[0].url,'https://qwen.example/compatible-mode/v1/images/generations');
    assert.equal(calls[0].auth,'Bearer qwen-test-key');
    assert.equal(calls[0].body.model,'qwen-image-3.0-pro');
    assert.equal(calls[0].body.size,'1024x1024');
    assert.equal(calls[0].body.seed,71);
  }finally{
    globalThis.fetch=originalFetch;
    const restore=(name:string,value:string|undefined)=>{
      if(value===undefined)delete process.env[name]; else process.env[name]=value;
    };
    restore('PREDICTLM_IMAGE_PROVIDER_ORDER',old.order);
    restore('QWEN_IMAGE_API_KEY',old.key);
    restore('QWEN_IMAGE_BASE_URL',old.base);
    restore('QWEN_IMAGE_MODEL',old.model);
    restore('GEMINI_API_KEY',old.gemini);
    restore('VERCEL_OIDC_TOKEN',old.oidc);
    restore('NANO_BANANA_API_KEY',old.nano);
    restore('MEDIA_IMAGE_BASE_URL',old.media);
    resetProviderHealthForTests();
  }
});
