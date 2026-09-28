import test from 'node:test';
import assert from 'node:assert/strict';
import {imageProviderOrder} from '../src/lib/media/image-runtime';
import {buildQwenImageRequestBody,qwenImageConfig,qwenPromptExtend} from '../src/lib/media/qwen-image';

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
