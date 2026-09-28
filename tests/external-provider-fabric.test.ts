import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allExternalProviderSpecs,
  externalProviderSpecs,
  freeLlmPresetProviders,
  PUBLIC_API_DISCOVERY_SOURCE
} from '../src/lib/server/external-provider-fabric';

const keys=[
  'VERCEL','LOCALCODE_BASE_URL','LOCALCODE_API_KEY','LOCALCODE_MODEL',
  'GPTOSS_PROXY_BASE_URL','GPTOSS_PROXY_API_KEY','GPTOSS_PROXY_MODEL',
  'PUTER_POOL_BASE_URL','PUTER_POOL_API_KEY','PUTER_POOL_MODEL',
  'PREDICTLM_EXTRA_PROVIDERS_JSON','PREDICTLM_ALLOW_INLINE_EXTRA_PROVIDER_KEYS',
  'TEST_EXTRA_KEY','MISTRAL_API_KEY','MISTRAL_MODEL','CEREBRAS_API_KEY','CEREBRAS_MODEL'
];

function clear(){
  for(const key of keys)delete process.env[key];
}

test('self-hosted provider fabric normalizes LocalCode, GPTOSS and Puter endpoints',()=>{
  clear();
  process.env.LOCALCODE_BASE_URL='https://localcode.example';
  process.env.LOCALCODE_API_KEY='lc-key';
  process.env.LOCALCODE_MODEL='gateway-model';
  process.env.GPTOSS_PROXY_BASE_URL='https://gptoss.example/';
  process.env.GPTOSS_PROXY_MODEL='gpt-oss-20b';
  process.env.PUTER_POOL_BASE_URL='https://puter.example';
  process.env.PUTER_POOL_MODEL='qwen';

  const providers=externalProviderSpecs();
  const localcode=providers.find(x=>x.name==='localcode');
  const gptoss=providers.find(x=>x.name==='gptoss');
  const puter=providers.find(x=>x.name==='puterpool');

  assert.equal(localcode?.base,'https://localcode.example/v1');
  assert.equal(localcode?.protocol,'responses');
  assert.equal(localcode?.key,'lc-key');
  assert.equal(gptoss?.base,'https://gptoss.example/v1');
  assert.equal(gptoss?.protocol,'openai');
  assert.equal(puter?.base,'https://puter.example/v1');
  assert.equal(puter?.protocol,'openai');
  clear();
});

test('Vercel never treats localhost bridges as reachable production providers',()=>{
  clear();
  process.env.VERCEL='1';
  process.env.LOCALCODE_BASE_URL='http://127.0.0.1:8082';
  process.env.LOCALCODE_MODEL='model';
  process.env.PUTER_POOL_BASE_URL='http://localhost:3000';
  process.env.PUTER_POOL_MODEL='model';
  const providers=externalProviderSpecs();
  assert.equal(providers.some(x=>x.name==='localcode'),false);
  assert.equal(providers.some(x=>x.name==='puterpool'),false);
  clear();
});

test('generic provider JSON reads secrets from named environment variables instead of inline keys',()=>{
  clear();
  process.env.TEST_EXTRA_KEY='secret-from-env';
  process.env.PREDICTLM_EXTRA_PROVIDERS_JSON=JSON.stringify([{
    name:'my-free-router',
    base:'https://router.example/v1',
    model:'free-model',
    keyEnv:'TEST_EXTRA_KEY',
    costHint:'free-tier'
  }]);
  const provider=externalProviderSpecs().find(x=>x.name==='my-free-router');
  assert.ok(provider);
  assert.equal(provider?.key,'secret-from-env');
  assert.equal(provider?.base,'https://router.example/v1');
  assert.equal(provider?.costHint,'free-tier');
  clear();
});

test('Free-LLM catalog presets activate only when both key and model are configured',()=>{
  clear();
  process.env.MISTRAL_API_KEY='mistral-key';
  assert.equal(freeLlmPresetProviders().some(x=>x.name==='mistral'),false);
  process.env.MISTRAL_MODEL='mistral-small';
  process.env.CEREBRAS_API_KEY='cerebras-key';
  process.env.CEREBRAS_MODEL='llama';
  const providers=freeLlmPresetProviders();
  assert.ok(providers.some(x=>x.name==='mistral'&&x.base==='https://api.mistral.ai/v1'));
  assert.ok(providers.some(x=>x.name==='cerebras'&&x.base==='https://api.cerebras.ai/v1'));
  assert.ok(allExternalProviderSpecs().length>=2);
  clear();
});

test('free-apis-list is registered as discovery metadata, not automatic execution',()=>{
  assert.equal(PUBLIC_API_DISCOVERY_SOURCE.repo,'spinov001-art/free-apis-list');
  assert.match(PUBLIC_API_DISCOVERY_SOURCE.purpose,/Discovery catalog/i);
  assert.match(PUBLIC_API_DISCOVERY_SOURCE.purpose,/not auto-executed/i);
});
