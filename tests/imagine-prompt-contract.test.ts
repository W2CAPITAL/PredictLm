import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSpecificNegativePrompt } from '../src/lib/media/media-fidelity';
import { INVALID_IMAGE_PROVIDER_MESSAGE } from '../src/lib/media/media-errors';

test('Kurama Chakra Mode compiles automatic negatives without demanding a separate giant Kurama',()=>{
  const prompt='Naruto Uzumaki no modo Kurama com aura dourada envolvendo o corpo lutando contra Sasuke Uchiha com Susanoo Perfeito';
  const negative=buildSpecificNegativePrompt(prompt,'');
  assert.match(negative,/red-haired Naruto/i);
  assert.match(negative,/missing golden-orange chakra cloak on Naruto body/i);
  assert.match(negative,/missing Perfect Susanoo/i);
  assert.doesNotMatch(negative,/missing Kurama(?:,|$)/i);
  assert.doesNotMatch(negative,/dragon instead of Kurama/i);
  assert.doesNotMatch(negative,/lion instead of Kurama/i);
});

test('full Kurama avatar request still enables full-avatar negatives',()=>{
  const prompt='Naruto com o avatar completo da Kurama, raposa gigante de nove caudas, lutando contra Sasuke com Susanoo Perfeito';
  const negative=buildSpecificNegativePrompt(prompt,'');
  assert.match(negative,/missing Kurama/i);
  assert.match(negative,/dragon instead of Kurama/i);
});

test('Imagine exposes automatic quality and keeps manual negative under advanced controls',()=>{
  const ui=fs.readFileSync(new URL('../src/components/GrokImaginePanel.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(ui,/Evitar · negative opcional/);
  assert.match(ui,/Qualidade automática ativada/);
  assert.match(ui,/>Avançado</);
  assert.match(ui,/Negative manual · opcional/);
});

test('invalid image provider message is exact and stable',()=>{
  assert.equal(INVALID_IMAGE_PROVIDER_MESSAGE,'O provider não entregou uma imagem válida');
  const ui=fs.readFileSync(new URL('../src/components/GrokImaginePanel.tsx',import.meta.url),'utf8');
  assert.match(ui,/INVALID_IMAGE_PROVIDER_MESSAGE/);
});
