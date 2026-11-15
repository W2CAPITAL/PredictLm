import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const yaml=readFileSync(new URL('../.github/workflows/auto-learning.yml',import.meta.url),'utf8');

test('Automated snapshot keeps the generated branch even when GitHub denies PR creation',()=>{
 assert.match(yaml,/gh pr create/);
 assert.match(yaml,/if gh pr create/);
 assert.match(yaml,/::warning::.*pull request/i);
 assert.match(yaml,/automation\/auto-learning-snapshot/);
 assert.match(yaml,/GITHUB_STEP_SUMMARY/);
});
test('Does not elevate workflow permissions or merge code automatically',()=>{
 assert.doesNotMatch(yaml,/admin: write|actions: write|gh pr merge|git push origin main/);
 assert.match(yaml,/contents: write/);
});
