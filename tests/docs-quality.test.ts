import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('README presents the current product with a professional provider-agnostic media contract',()=>{
  const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
  assert.match(readme,/One assistant\. Verified workflows\./);
  assert.match(readme,/Chat · Jurídico · Imagine/);
  assert.match(readme,/No Higgsfield dependency/);
  assert.match(readme,/Higgsfield is not required/);
  assert.match(readme,/internal\/lab infrastructure/);
  assert.match(readme,/primary navigation/);
  assert.match(readme,/SECURITY\.md/);
});

test('SECURITY documents fail-closed access and does not require Higgsfield',()=>{
  const security=fs.readFileSync(new URL('../SECURITY.md',import.meta.url),'utf8');
  assert.match(security,/Fail closed for protected production APIs/);
  assert.match(security,/HttpOnly: true/);
  assert.match(security,/SameSite: Strict/);
  assert.match(security,/CSRF_ORIGIN_REJECTED/);
  assert.match(security,/30 requests \/ 60 s/);
  assert.match(security,/120 requests \/ 60 s/);
  assert.match(security,/Higgsfield is not a security dependency or runtime requirement/);
  assert.match(security,/Responsible disclosure/);
  assert.match(security,/Production deployment checklist/);
});
