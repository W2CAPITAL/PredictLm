import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route=fs.readFileSync(new URL('../src/app/api/agent/route.ts',import.meta.url),'utf8');

test('Build agent keeps Jev-selected files complete instead of hard truncating each file',()=>{
  assert.match(route,/jevSelectWorkspaceFiles/);
  assert.match(route,/content:file\.content/);
  assert.doesNotMatch(route,/content:file\.content\.slice\(/);
  assert.doesNotMatch(route,/compactText\(file\.content,\s*2600\)/);
});
