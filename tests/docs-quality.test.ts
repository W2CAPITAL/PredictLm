import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('README presents the current product, research labs and provider-agnostic media contract',()=>{
  const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
  assert.match(readme,/One assistant\. Verified workflows\./);
  assert.match(readme,/Chat · Jurídico · Imagine/);
  assert.match(readme,/No Higgsfield dependency/);
  assert.match(readme,/Higgsfield is not required/);
  assert.match(readme,/internal\/lab infrastructure/);
  assert.match(readme,/primary navigation/);
  assert.match(readme,/Minecraft Cognitive World/);
  assert.match(readme,/CONNECTOME_SOURCES\.md/);
  assert.match(readme,/FlyWire, MICrONS, H01 and Allen/);
  assert.match(readme,/dedicated PredictLM API key/);
  assert.match(readme,/SECURITY\.md/);
  assert.match(readme,/LICENSE/);
});

test('SECURITY keeps public guidance high-level and directs sensitive findings to private disclosure',()=>{
  const security=fs.readFileSync(new URL('../SECURITY.md',import.meta.url),'utf8');
  assert.match(security,/Responsible disclosure/);
  assert.match(security,/private vulnerability reporting/i);
  assert.match(security,/Keep secrets and provider credentials server-side/);
  assert.match(security,/separate credentials for owner\/browser access and external API clients/);
  assert.match(security,/Public project documentation describes security only at a high level/);
  assert.doesNotMatch(security,/30 requests \/ 60 s/);
  assert.doesNotMatch(security,/120 requests \/ 60 s/);
  assert.doesNotMatch(security,/CSRF_ORIGIN_REJECTED/);
});
