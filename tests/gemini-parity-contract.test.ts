import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const suite=JSON.parse(fs.readFileSync(new URL('../evals/gemini-parity-v1.json',import.meta.url),'utf8'));

test('Gemini parity v1 remains frozen and structurally complete',()=>{
  assert.equal(suite.version,'1.0');
  assert.equal(suite.frozenAt,'2026-09-26');
  assert.equal(suite.targetComparator,'google/gemini-3.8-flash');
  assert.equal(suite.chatCases.length,20);
  assert.equal(suite.productUtilityCases.length,10);
  const ids=[...suite.chatCases,...suite.productUtilityCases].map((x:any)=>x.id);
  assert.equal(new Set(ids).size,30);
  assert.equal(suite.scoring.maxPerCase,10);
  assert.equal(suite.scoring.passThreshold,7);
  assert.equal(suite.scoring.parityRule.hardFailures.startsWith('0 off-topic'),true);
});
