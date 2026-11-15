import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

for(const workflow of ['auto-learning','github-knowledge','global-learning']){
  test(workflow+' preserves generated branch if GitHub disables automated pull requests',()=>{
    const content=readFileSync(new URL('../.github/workflows/'+workflow+'.yml',import.meta.url),'utf8');
    assert.match(content,/gh pr create/);
    assert.match(content,/if gh pr create/);
    assert.match(content,/::warning::/);
    assert.match(content,/GITHUB_STEP_SUMMARY/);
    assert.doesNotMatch(content,/gh pr merge|git push origin main/);
  });
}
