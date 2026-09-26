import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppLearningLedger,normalizeAppLearningEvent} from '../src/lib/app-learning';

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
