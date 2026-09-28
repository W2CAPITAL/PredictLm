import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('normal and cognitive chat default to one remote provider attempt',()=>{
  const route=fs.readFileSync(new URL('../src/app/api/chat/route.ts',import.meta.url),'utf8');
  const stream=fs.readFileSync(new URL('../src/app/api/chat/stream/route.ts',import.meta.url),'utf8');
  const cognitive=fs.readFileSync(new URL('../src/app/api/chat/cognitive-stream/route.ts',import.meta.url),'utf8');
  const shell=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');

  assert.match(route,/PREDICTLM_REMOTE_PROVIDER_ATTEMPTS_PER_TURN\|\|1/);
  assert.match(route,/slice\(0,PROVIDER_ATTEMPT_LIMIT\)/);
  assert.match(stream,/PREDICTLM_REMOTE_PROVIDER_ATTEMPTS_PER_TURN\|\|1/);
  assert.match(stream,/slice\(0,remoteAttemptLimit\)/);
  assert.match(cognitive,/PREDICTLM_REMOTE_PROVIDER_ATTEMPTS_PER_TURN\|\|1/);
  assert.match(cognitive,/slice\(0,remoteAttemptLimit\)/);
  assert.doesNotMatch(stream,/slice\(0,8\)/);
  assert.doesNotMatch(cognitive,/slice\(0,8\)/);
  assert.match(shell,/directStreamAttempted/);
  assert.match(shell,/remote-budget-spent/);
});
