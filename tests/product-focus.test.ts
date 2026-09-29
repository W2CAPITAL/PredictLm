import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('primary navigation focuses on chat legal and Imagine',()=>{
  const shell=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
  const nav=shell.match(/<nav className="grok-nav"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.match(nav,/>Chat</);
  assert.match(nav,/>Jurídico</);
  assert.match(nav,/>Imagine</);
  assert.doesNotMatch(nav,/>Minecraft</);
  assert.doesNotMatch(nav,/>Plugins</);
  assert.doesNotMatch(nav,/>Visão</);
  assert.doesNotMatch(nav,/>Simulação</);
});

test('Minecraft stays outside the public client bundle',()=>{
  const shell=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(shell,/from '@\/components\/GrokSimulationPanel'/);
  assert.doesNotMatch(shell,/Minecraft Agent Lab/);
  assert.match(shell,/Minecraft foi retirado da interface principal/);
});

test('legal work and advanced capabilities stay inside Chat',()=>{
  const shell=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
  assert.match(shell,/DataJud e DJEN/);
  assert.match(shell,/PredictLM · Processos/);
  assert.match(shell,/Build no Chat/);
  assert.match(shell,/isTutorRequest/);
});

test('experimental breadth stays documented but outside the primary product promise',()=>{
  const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
  assert.match(readme,/internal\/lab infrastructure/);
  assert.match(readme,/influencer tooling/);
  assert.match(readme,/primary navigation/);
});

test('health metadata separates public product surfaces from internal labs',()=>{
  const health=fs.readFileSync(new URL('../src/app/api/health/route.ts',import.meta.url),'utf8');
  assert.match(health,/surfaces:\{chat:true,legal:true,imagine:true,portfolio:true\}/);
  assert.match(health,/internalSurfaces:\{build:true,research:true,minecraft:true,library:true,vision:true,plugins:true,neuroscience:true,social:true\}/);
});
