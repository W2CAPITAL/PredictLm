import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const chat=fs.readFileSync(new URL('../src/app/api/chat/route.ts',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../src/app/api/agent/route.ts',import.meta.url),'utf8');
const report=fs.readFileSync(new URL('../src/app/api/report-dossier/generate/route.ts',import.meta.url),'utf8');

test('normal chat gates remote reviewer and repair behind explicit budget policy',()=>{
  assert.match(chat,/agenticReviewEnabled\(\).*shouldReview|shouldReview=agenticReviewEnabled\(\)/);
  assert.match(chat,/draftNeedsRepair\(review\)&&repairCallsEnabled\(\)/);
  assert.match(chat,/createProviderTurnBudget/);
});

test('Build uses direct single-pass mode unless agentic quality is explicitly enabled',()=>{
  assert.match(build,/const staged=body\?\.agentic===true\|\|agenticReviewEnabled\(\)/);
  assert.match(build,/if\(!staged\)/);
  assert.match(build,/BUDGET-SAFE BUILD MODE/);
  assert.match(build,/mode:'direct-budget'/);
});

test('Report Architect uses one final-report call by default',()=>{
  assert.match(report,/const staged=body\?\.agentic===true\|\|body\?\.council===true\|\|agenticReviewEnabled\(\)/);
  assert.match(report,/if\(!staged\)/);
  assert.match(report,/Produza o relatório FINAL em Markdown em uma única chamada/);
  assert.match(report,/budgetSafe:true/);
});
