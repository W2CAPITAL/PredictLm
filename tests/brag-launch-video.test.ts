import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MEDIA_PIPELINE_PATTERNS,
  buildGenerativeVideoPrompt,
  buildBragLaunchContext,
  isLaunchVideoRequest
} from '../src/lib/media/video-pipelines';

test('Brag launch intent is narrow and product-video specific',()=>{
  assert.equal(isLaunchVideoRequest('faça um vídeo comercial do PredictLM'),true);
  assert.equal(isLaunchVideoRequest('create a polished launch video for this app'),true);
  assert.equal(isLaunchVideoRequest('/brag this project'),true);
  assert.equal(isLaunchVideoRequest('duas pessoas caminhando na praia ao pôr do sol'),false);
});

test('Brag launch direction survives the provider prompt budget',()=>{
  const prompt=buildGenerativeVideoPrompt({
    prompt:'faça um vídeo comercial de lançamento do PredictLM mostrando o fluxo jurídico e Build',
    style:'Cinematic',
    aspect:'16:9',
    durationMs:15000
  });
  assert.match(prompt,/BRAG LAUNCH DIRECTION/);
  assert.match(prompt,/hook 2-3s/i);
  assert.match(prompt,/entry -> key action -> result/i);
  assert.match(prompt,/verify a playable video asset/i);
  assert.match(prompt,/Fly=salience\/hook/);
  assert.match(prompt,/Mouse=visual discrimination\/continuity/);
  assert.match(prompt,/Macaque=hierarchy\/composition/);
  assert.match(prompt,/Human=goal\/copy\/QA/);
});

test('Brag is registered as a provider-agnostic media pattern',()=>{
  const brag=MEDIA_PIPELINE_PATTERNS.find(x=>x.id==='brag-launch');
  assert.ok(brag);
  assert.equal(brag?.repo,'latent-spaces/brag');
  assert.equal(brag?.runtime,'reference');
});

test('Brag skill requires real render verification and protects project secrets',()=>{
  const skill=fs.readFileSync(new URL('../skills/brag-launch-video/SKILL.md',import.meta.url),'utf8');
  assert.match(skill,/source_repository: "latent-spaces\/brag"/);
  assert.match(skill,/source_license: "MIT"/);
  assert.match(skill,/CAPABILITY PREFLIGHT/);
  assert.match(skill,/VERIFY — gate obrigatório/);
  assert.match(skill,/Storyboard não é vídeo/);
  assert.match(skill,/Fly/);
  assert.match(skill,/Mouse/);
  assert.match(skill,/Macaque/);
  assert.match(skill,/Human/);
  assert.match(skill,/\.env\*/);
  assert.match(skill,/PII/);
});

test('README presents the current product and the Brag video architecture',()=>{
  const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
  assert.match(readme,/General AI with a legal-first execution path/);
  assert.match(readme,/Commercial launch film/);
  assert.match(readme,/skills\/brag-launch-video\/SKILL\.md/);
  assert.match(readme,/latent-spaces\/brag/);
  assert.match(readme,/One assistant\. Verified workflows\./);
  assert.match(readme,/Chat · Jurídico · Imagine/);
  assert.doesNotMatch(readme,/Minecraft Agent Lab/);
});

test('Brag knowledge source excludes upstream binary assets by policy',()=>{
  const cfg=JSON.parse(fs.readFileSync(new URL('../config/github-knowledge-sources.json',import.meta.url),'utf8'));
  const source=cfg.sources.find((x:any)=>x.repo==='latent-spaces/brag');
  assert.ok(source);
  assert.equal(source.license,'MIT');
  assert.equal(source.mode,'allow');
  assert.ok(source.include.every((x:string)=>!/^skills\/brag\/assets\//.test(x)));
});
