import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('portable learning pack consolidates curated and promoted learning',()=>{
  const learned=fs.readFileSync(new URL('../src/lib/training/learned-lessons.ts',import.meta.url),'utf8');
  const ids=learned.match(/\{id:/g)||[];
  assert.equal(ids.length,146,'curated training knowledge count changed unexpectedly');

  const snapshot=JSON.parse(fs.readFileSync(new URL('../reports/selfimprove/auto-learning.json',import.meta.url),'utf8'));
  assert.equal(snapshot.totals.promoted,3);
  assert.equal(snapshot.totals.evidence,48);

  const pack=fs.readFileSync(new URL('../src/lib/training/learning-pack.ts',import.meta.url),'utf8');
  assert.match(pack,/TRAINING_KNOWLEDGE/);
  assert.match(pack,/runtimeAutoLearningLessons/);
  assert.match(pack,/globalLearningContext/);
  assert.match(pack,/Raw feedback, credentials and personal data are excluded/);

  const route=fs.readFileSync(new URL('../src/app/api/learning/export/route.ts',import.meta.url),'utf8');
  assert.match(route,/exportLearningPack/);

  const agent=fs.readFileSync(new URL('../src/app/api/agent/route.ts',import.meta.url),'utf8');
  assert.match(agent,/learningPackContext/);
  assert.match(agent,/const learning=await learningPackContext/);
});
