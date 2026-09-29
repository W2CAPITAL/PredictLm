import test from 'node:test';
import assert from 'node:assert/strict';
import {responseClearlyOffTopic,responseTopicAlignment} from '../src/lib/chat-intelligence';
import {normalizePollinationsImageModel,publicImageBaseCandidates} from '../src/lib/media/image-runtime';

test('lexical topic alignment no longer rejects a correct omelette recipe',()=>{
  const prompt='Me dá uma receita rápida de omelete';
  const answer=[
    'Bata dois ovos com uma pitada de sal.',
    'Aqueça uma frigideira com um pouco de manteiga.',
    'Despeje os ovos, deixe firmar e dobre ao meio.',
    'Se quiser, coloque queijo antes de dobrar.'
  ].join(' ');
  assert.equal(responseTopicAlignment(prompt,answer).relevant,false);
  assert.equal(responseClearlyOffTopic(prompt,answer),false);
});

test('clearly unrelated technical contamination can still be rejected',()=>{
  const prompt='Me dá uma receita rápida de omelete';
  const answer='No GitHub, abra um repositório, faça commits em React e depois consulte DataJud para montar a linha do tempo do processo judicial.';
  assert.equal(responseClearlyOffTopic(prompt,answer),true);
});

test('Pollinations is never treated as an unauthenticated public fallback',()=>{
  assert.deepEqual(publicImageBaseCandidates('',false),[]);
  assert.deepEqual(publicImageBaseCandidates('https://gen.pollinations.ai/image/',false),[]);
  assert.deepEqual(publicImageBaseCandidates('',true),['https://gen.pollinations.ai/image/']);
  assert.deepEqual(publicImageBaseCandidates('https://images.example.test/render',false),['https://images.example.test/render/']);
});

test('legacy Pollinations model aliases map to current catalog ids',()=>{
  assert.equal(normalizePollinationsImageModel('flux'),'black-forest-labs/flux.1-schnell');
  assert.equal(normalizePollinationsImageModel('kontext'),'black-forest-labs/flux.1-kontext-pro');
  assert.equal(normalizePollinationsImageModel('turbo'),'tongyi-mai/z-image-turbo');
  assert.equal(normalizePollinationsImageModel('google/gemini-3.1-flash-image'),'google/gemini-3.1-flash-image');
});
