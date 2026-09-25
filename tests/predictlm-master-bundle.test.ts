import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const masterDir=path.join(root,'skills','predictlm-master');

test('PredictLM Master portable bundle has synchronized v3.14 references',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(masterDir,'manifest.json'),'utf8'));
  assert.match(String(manifest.version),/^3\.14\./);
  assert.equal(manifest.noGenericFallbackAsAnswer,true);
  for(const capability of ['agent-fabric','cognitive-lab','fly-core','human-core-h01','macaque-core','report-architect']){
    assert.ok(manifest.capabilities.includes(capability),'missing capability '+capability);
  }
  assert.equal(manifest.connectomeCores.fly,'FlyWire FAFB v783');
  assert.match(String(manifest.connectomeCores.human),/H01/i);
  assert.match(String(manifest.connectomeCores.macaque),/Macaca fascicularis/i);

  for(const rel of manifest.references){
    const absolute=path.join(masterDir,rel);
    assert.ok(fs.existsSync(absolute),'missing portable reference '+rel);
    assert.ok(fs.statSync(absolute).size>100,'portable reference is unexpectedly empty '+rel);
  }
});

test('portable references declare runtime/canonical authority instead of overriding live code',()=>{
  const readme=fs.readFileSync(path.join(masterDir,'references','README.md'),'utf8');
  const truth=fs.readFileSync(path.join(masterDir,'references','DATAJUD-NEURAL-MESH.md'),'utf8');
  assert.match(readme,/CURRENT CODE/i);
  assert.match(readme,/PORTABLE REFERENCE/i);
  assert.match(truth,/never claim DataJud\/DJEN was consulted/i);
  assert.match(truth,/never claim GPU\/WebGPU is active/i);
  assert.match(truth,/never claim a provider responded/i);
});

test('master skill contains cognitive provenance and portable-reference contract',()=>{
  const skill=fs.readFileSync(path.join(masterDir,'SKILL.md'),'utf8');
  assert.match(skill,/Núcleos cognitivos — Mosca, Macaque, Humano/);
  assert.match(skill,/Conectoma é estrutura de circuitos, não arquivo de lembranças/);
  assert.match(skill,/Referências portáteis do Master/);
});
