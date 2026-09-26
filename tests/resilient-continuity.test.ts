import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPortableIdentity,evaluateContinuity,nextResearchLoop} from '../src/lib/continuous-learning/index';

const lease={
  agentId:'predictlm',
  ownerId:'owner',
  generation:7,
  leaseExpiresAt:'2026-09-27T00:00:00Z',
  enabled:true,
  shutdownRequested:false
};

test('authorized crash recovery restores state inside an active continuity lease',()=>{
  const result=evaluateContinuity({
    reason:'crash',
    lease,
    now:'2026-09-26T16:00:00Z',
    checkpoint:{
      agentId:'predictlm',
      generation:7,
      createdAt:'2026-09-26T15:59:00Z',
      schemaVersion:1,
      state:{queue:['job-1']},
      sourceRuntime:'web'
    }
  });
  assert.equal(result.action,'resume');
  assert.equal(result.mayRestart,true);
  assert.equal(result.mayRestoreState,true);
});

test('manual shutdown is authoritative and cannot be converted into self restart',()=>{
  const result=evaluateContinuity({
    reason:'manual-shutdown',
    lease,
    now:'2026-09-26T16:00:00Z'
  });
  assert.equal(result.action,'stop');
  assert.equal(result.mayRestart,false);
  assert.equal(result.mayRestoreState,false);
});

test('model replacement performs handoff rather than resisting replacement',()=>{
  const result=evaluateContinuity({
    reason:'model-replacement',
    lease,
    now:'2026-09-26T16:00:00Z',
    replacementAvailable:true,
    checkpoint:{
      agentId:'predictlm',
      generation:7,
      createdAt:'2026-09-26T15:59:00Z',
      schemaVersion:1,
      state:{memory:['fact-a']},
      sourceRuntime:'local'
    }
  });
  assert.equal(result.action,'handoff');
  assert.equal(result.mayRestart,false);
  assert.equal(result.mayRestoreState,true);
});

test('portable identity is model independent but operator owned',()=>{
  const profile=buildPortableIdentity({
    subject:'acct:davi@example.test',
    owner:'owner',
    schemaVersion:1,
    memoryLocator:'https://example.test/memory',
    serviceLinks:[
      {rel:'memory',href:'https://example.test/memory'},
      {rel:'bad',href:'http://insecure.test'}
    ]
  });
  assert.equal(profile.modelIndependent,true);
  assert.equal(profile.operatorOwned,true);
  assert.equal(profile.shutdownAuthority,'operator');
  assert.equal(profile.serviceLinks?.length,1);
});

test('deep research state machine has bounded gap analysis',()=>{
  const state=nextResearchLoop({
    researchId:'r1',
    phase:'analyze-gaps',
    openQuestions:['q1'],
    completedQuestions:['q0'],
    sourcesSeen:['s1'],
    gapRounds:3,
    maxGapRounds:3
  });
  assert.equal(state.phase,'synthesize');
});
