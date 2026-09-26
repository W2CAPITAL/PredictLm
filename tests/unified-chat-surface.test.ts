import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const chat=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');

test('Unified Chat has no separate Build Research Processos or Fly navigation',()=>{
  assert.doesNotMatch(chat,/screen==='build'/);
  assert.doesNotMatch(chat,/screen==='research'/);
  assert.doesNotMatch(chat,/href='\/cognitive\/fly'|href="\/cognitive\/fly"|window\.location\.href='\/cognitive\/fly'/);
  assert.doesNotMatch(chat,/>Build<|>Build Mode</);
  assert.doesNotMatch(chat,/>Processos<|>Pesquisa no Chat<|>Mosca</);
});

test('Unified Chat owns Build execution and runnable ZIP packaging',()=>{
  assert.match(chat,/detectBuildRequest/);
  assert.match(chat,/fetch\('\/api\/agent'/);
  assert.match(chat,/buildRunnableProject/);
  assert.match(chat,/new JSZip\(\)/);
  assert.match(chat,/PredictLM · Build no Chat/);
});

test('legacy Processos and cognitive pages redirect into Chat',()=>{
  const paths=[
    '../src/app/processos/page.tsx',
    '../src/app/cognitive/page.tsx',
    '../src/app/cognitive/fly/page.tsx',
    '../src/app/cognitive/human/page.tsx',
    '../src/app/cognitive/macaque/page.tsx'
  ];
  for(const path of paths){
    const content=fs.readFileSync(new URL(path,import.meta.url),'utf8');
    assert.match(content,/redirect\('\/\?/);
  }
});
