import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppLearningLedger,deriveAppImprovementCandidates,normalizeAppLearningEvent} from '../src/lib/app-learning';

test('app learning strips sensitive metadata and query strings from supplied labels can be avoided by caller',()=>{
  const event=normalizeAppLearningEvent({
    surface:'/settings',
    action:'save config',
    kind:'interaction',
    success:true,
    metadata:{
      provider:'local',
      token:'secret-value',
      password:'hidden',
      message:'private text',
      status:200,
      enabled:true
    }
  });
  assert.equal(event.metadata?.provider,'local');
  assert.equal(event.metadata?.status,200);
  assert.equal(event.metadata?.enabled,true);
  assert.equal('token' in (event.metadata||{}),false);
  assert.equal('password' in (event.metadata||{}),false);
  assert.equal('message' in (event.metadata||{}),false);
});

test('app learning ledger starts bounded and empty',()=>{
  const ledger=createAppLearningLedger();
  assert.equal(ledger.version,1);
  assert.equal(ledger.total,0);
  assert.equal(ledger.bio.experiences,0);
  assert.equal(ledger.events.length,0);
});


test('repeated app failures become proposal-only improvement candidates',()=>{
  const ledger=createAppLearningLedger();
  ledger.events=[
    {at:3,surface:'/build',action:'POST /api/agent',kind:'build',success:false,priority:.91,disagreement:.24,metadata:{status:500}},
    {at:2,surface:'/build',action:'POST /api/agent',kind:'build',success:false,priority:.88,disagreement:.2,metadata:{status:500}},
    {at:1,surface:'/research',action:'open panel',kind:'navigation',success:true,priority:.2,disagreement:.05}
  ];
  ledger.total=3;
  ledger.failures=2;
  ledger.successes=1;
  const candidates=deriveAppImprovementCandidates(ledger);
  assert.equal(candidates[0]?.surface,'/build');
  assert.equal(candidates[0]?.failures,2);
  assert.equal(candidates[0]?.promotion,'proposal-only');
});
