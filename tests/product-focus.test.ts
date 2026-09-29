import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('primary navigation focuses on chat legal Minecraft and Imagine',()=>{
  const shell=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
  const nav=shell.match(/<nav className="grok-nav"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.match(nav,/>Chat</);
  assert.match(nav,/>Jurídico</);
  assert.match(nav,/>Minecraft</);
  assert.match(nav,/>Imagine</);
  assert.doesNotMatch(nav,/>Plugins</);
  assert.doesNotMatch(nav,/>Visão</);
  assert.doesNotMatch(nav,/>Simulação</);
});

test('Minecraft remains a first-class public portfolio surface',()=>{
  const shell=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
  const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
  assert.match(shell,/Minecraft Agent Lab/);
  assert.match(readme,/Minecraft Agent Lab/);
  assert.match(readme,/CNJ\/DataJud \+ DJEN/);
});

test('experimental breadth stays documented but outside the primary product promise',()=>{
  const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
  assert.match(readme,/internal\/lab infrastructure/);
  assert.match(readme,/influencer tooling/);
  assert.match(readme,/primary navigation/);
});
