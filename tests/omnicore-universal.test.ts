import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {PREDICT_AGENTS} from '../src/lib/agent-runtime/catalog';
import {skills} from '../src/lib/skills';
import {omniCorePlan,omniCorePortableContext} from '../src/lib/omnicore-universal';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'skills/omnicore-universal/manifest.json'),'utf8'));

test('OmniCore manifest contains the complete registered agent and capability catalogs',()=>{
  assert.equal(manifest.counts.agentCatalog,PREDICT_AGENTS.length);
  assert.equal(manifest.counts.pluginsAndCapabilities,skills.length);
  assert.deepEqual(
    new Set(manifest.agents.map((x:any)=>x.id)),
    new Set(PREDICT_AGENTS.map(x=>x.id))
  );
  assert.deepEqual(
    new Set(manifest.pluginsAndCapabilities.map((x:any)=>x.id)),
    new Set(skills.map(x=>x.id))
  );
});

test('OmniCore manifest includes every first-level SKILL module',()=>{
  const folders=fs.readdirSync(path.join(root,'skills'),{withFileTypes:true})
    .filter(entry=>entry.isDirectory()&&fs.existsSync(path.join(root,'skills',entry.name,'SKILL.md')))
    .map(entry=>entry.name)
    .sort();
  const inManifest=manifest.skillModules.map((x:any)=>x.id).sort();
  assert.deepEqual(inManifest,folders);
  assert.equal(manifest.counts.skillModules,folders.length);
});

test('OmniCore includes four species cores with explicit scientific boundaries',()=>{
  assert.deepEqual(
    manifest.neuroCores.map((x:any)=>x.id).sort(),
    ['fly','human','macaque','mouse']
  );
  for(const core of manifest.neuroCores){
    assert.ok(String(core.scientificBoundary||'').length>20);
  }
  assert.equal(manifest.counts.speciesCores,4);
});

test('OmniCore routes only a bounded subset rather than serializing the whole catalog',()=>{
  const media=omniCorePlan('gere uma imagem do Naruto com referência visual e depois revise');
  assert.equal(media.domain,'media');
  assert.ok(media.agents.some(x=>x.id==='media-director'));
  assert.ok(media.capabilities.some(x=>x.id==='grok-imagine-parity'));
  assert.ok(media.capabilities.length<=10);

  const build=omniCorePlan('corrija o bug no app Next e rode testes');
  assert.equal(build.domain,'build');
  assert.ok(build.agents.some(x=>x.id==='codebase-investigator'));
  assert.ok(build.agents.some(x=>x.id==='qa'));
});

test('OmniCore selects all four cores when explicitly asked for all brains',()=>{
  const plan=omniCorePlan('compare todos os quatro cores do cerebro humano, camundongo, macaco e mosca');
  assert.deepEqual(plan.neuroCores.map(x=>x.id).sort(),['fly','human','macaque','mouse']);
  const context=omniCorePortableContext('compare todos os quatro cores do cerebro');
  assert.match(context,/H01-informed/);
  assert.match(context,/MICrONS\/Allen-informed/);
  assert.match(context,/atlas\/projectome-informed/);
  assert.match(context,/FlyWire-informed/);
  assert.doesNotMatch(context,/complete biological brains?/i);
});

test('OmniCore portable skill declares host-neutral capability honesty',()=>{
  const skill=fs.readFileSync(path.join(root,'skills/omnicore-universal/SKILL.md'),'utf8');
  assert.match(skill,/qualquer IA/i);
  assert.match(skill,/skill presente != ferramenta conectada/i);
  assert.match(skill,/ChatGPT/);
  assert.match(skill,/Claude/);
  assert.match(skill,/Gemini/);
  assert.match(skill,/Grok/);
  assert.match(skill,/Qwen/);
  assert.match(skill,/DeepSeek/);
  assert.match(skill,/Kimi/);
  assert.match(skill,/MiniMax/);
  assert.match(skill,/OpenCode/);
});
