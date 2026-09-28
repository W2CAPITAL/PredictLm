import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzeImageIntent} from '../src/lib/media/image-intent';
import {buildSpecificNegativePrompt,shouldForceLiteralMode} from '../src/lib/media/media-fidelity';
import {buildBestImagePlan,candidateCountForImage} from '../src/lib/media/best-image-orchestrator';
import {buildVisualReferenceQueries,isSpecificVisualPrompt} from '../src/lib/media/visual-reference';

test('lowercase one-word public person is treated as a specific identity',()=>{
  const intent=analyzeImageIntent('alanzoka assistindo a uma live no notebook');
  assert.equal(intent.specific,true);
  assert.equal(intent.identitySensitive,true);
  assert.equal(intent.requiresReferences,true);
  assert.equal(intent.requiresLiteral,true);
  const entity=intent.entities.find(x=>x.id==='alanzoka');
  assert.ok(entity);
  assert.equal(entity?.kind,'person');
  assert.ok(intent.referenceQueries.some(x=>/Alanzoka/i.test(x)));
  assert.equal(shouldForceLiteralMode('alanzoka assistindo a uma live no notebook'),true);
});

test('arbitrary named person and product are resolved without hard-coded franchise rules',()=>{
  const person=analyzeImageIntent('Faça uma foto de João Silva andando na Avenida Paulista');
  assert.equal(person.identitySensitive,true);
  assert.ok(person.entities.some(x=>/João Silva/i.test(x.label)));

  const product=analyzeImageIntent('Crie uma imagem de iPhone 17 Pro em uma mesa de vidro');
  assert.equal(product.identitySensitive,true);
  assert.ok(product.entities.some(x=>/iPhone 17 Pro/i.test(x.label)&&x.kind==='product'));
  assert.ok(candidateCountForImage('Crie uma imagem de iPhone 17 Pro em uma mesa de vidro')>=2);
});

test('specific style or jeito is parsed as style rather than a fake subject',()=>{
  const intent=analyzeImageIntent('Uma floresta no estilo de Studio Ghibli.');
  assert.equal(intent.styleSensitive,true);
  assert.ok(intent.styleHints.some(x=>/Studio Ghibli/i.test(x)));
  assert.ok(intent.entities.some(x=>x.kind==='style'&&/Studio Ghibli/i.test(x.label)));
  assert.ok(!intent.entities.some(x=>x.kind==='named-subject'&&/Studio Ghibli/i.test(x.label)));
  assert.equal(isSpecificVisualPrompt('Uma floresta no estilo de Studio Ghibli.'),true);
});

test('continuation language reuses identity semantics and raises an identity lock',()=>{
  const intent=analyzeImageIntent('essa mesma garota agora sorrindo em outra pose');
  assert.equal(intent.continuation,true);
  assert.equal(intent.identitySensitive,true);
  assert.equal(intent.requiresLiteral,true);
  assert.equal(intent.identityKey,'continuation:previous-approved');
  const negative=buildSpecificNegativePrompt('essa mesma garota agora sorrindo em outra pose');
  assert.match(negative,/identity drift/i);
  assert.match(negative,/different face from previous approved image/i);
});

test('canonical characters do not collapse into one composite lead entity',()=>{
  const intent=analyzeImageIntent('Naruto Kurama lutando contra Sasuke com Susanoo Perfeito');
  assert.ok(intent.entities.some(x=>x.id==='naruto-uzumaki'));
  assert.ok(intent.entities.some(x=>x.id==='kurama-nine-tails'));
  assert.ok(intent.entities.some(x=>x.id==='sasuke-uchiha'));
  assert.ok(intent.entities.some(x=>x.id==='perfect-susanoo'));
  assert.ok(!intent.entities.some(x=>/^lead:/.test(x.id)&&/Naruto Kurama/i.test(x.label)));
  const plan=buildBestImagePlan('Naruto Kurama lutando contra Sasuke com Susanoo Perfeito','Anime');
  assert.equal(plan.identitySensitive,true);
  assert.equal(plan.candidateCount,3);
});

test('reference queries are produced for arbitrary named subjects',()=>{
  const queries=buildVisualReferenceQueries('Faça João Silva sorrindo para a câmera');
  assert.ok(queries.length>0);
  assert.ok(queries.some(x=>/João Silva/i.test(x)));
});

test('Imagine uses one server-orchestrated generation per candidate and exposes semantic intent diagnostics',()=>{
  const ui=fs.readFileSync(new URL('../src/components/GrokImaginePanel.tsx',import.meta.url),'utf8');
  const api=fs.readFileSync(new URL('../src/app/api/media/generate/route.ts',import.meta.url),'utf8');
  assert.doesNotMatch(ui,/for\(let providerAttempt=0;providerAttempt<3;providerAttempt\+\+\)/);
  assert.doesNotMatch(ui,/Provider inválido · tentando outra rota de imagem/);
  assert.match(ui,/avoidProviders:providerPolicy\?\.avoidProviders\|\|\[\]/);
  assert.match(ui,/Validando a imagem entregue pelo provider/);
  assert.match(ui,/const totalCandidates=1/);
  assert.match(ui,/const useDirector=deepThink/);
  assert.match(ui,/if\(!deepThink\|\|shouldForceLiteralMode\(prompt\)\)return safeFallback/);
  assert.match(ui,/if\(deepThink&&!regenerate&&\(semanticRepair/);
  assert.match(ui,/const hardRejectSpecific=false/);
  assert.match(ui,/Entendimento do pedido/);
  assert.match(api,/avoidProviders\.has\('pollinations-proxy'\)/);
  assert.match(api,/NO_IMAGE_PROVIDER/);
  assert.match(api,/cloudflare-workers-ai/);
  assert.match(api,/IMAGE INTENT RESOLUTION/);
  assert.match(api,/imageIntent:/);
});
