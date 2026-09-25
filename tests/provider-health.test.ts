import test from 'node:test';
import assert from 'node:assert/strict';
import {
  providerHealthState,
  rankHealthyProviders,
  recordProviderFailure,
  recordProviderSuccess,
  resetProviderHealthForTests
} from '../src/lib/server/provider-health';

const a={name:'a',base:'https://a.example/v1',model:'m1'};
const b={name:'b',base:'https://b.example/v1',model:'m2'};

test('healthy providers keep configured order',()=>{
  resetProviderHealthForTests();
  assert.deepEqual(rankHealthyProviders([a,b],1000).map(x=>x.name),['a','b']);
});

test('rate limited provider cools down and another provider is preferred',()=>{
  resetProviderHealthForTests();
  recordProviderFailure(a,new Error('a 429 rate limit'),1000);
  const state=providerHealthState(a,2000);
  assert.equal(state.cooling,true);
  assert.deepEqual(rankHealthyProviders([a,b],2000).map(x=>x.name),['b']);
});

test('provider success clears failure streak and cooldown',()=>{
  resetProviderHealthForTests();
  recordProviderFailure(a,new Error('a 500 upstream'),1000);
  recordProviderSuccess(a,2000);
  const state=providerHealthState(a,2001);
  assert.equal(state.cooling,false);
  assert.equal(state.failures,0);
});

test('when every provider is cooling the earliest recovery is attempted first',()=>{
  resetProviderHealthForTests();
  recordProviderFailure(a,new Error('a 429 rate limit'),1000);
  recordProviderFailure(b,new Error('b 500 upstream'),1000);
  assert.equal(rankHealthyProviders([a,b],2000)[0].name,'b');
});
