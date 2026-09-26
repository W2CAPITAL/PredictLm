import test from 'node:test';
import assert from 'node:assert/strict';
import { jevCompactHistory, jevRouteDecision, jevSelectWorkspaceFiles } from '../src/lib/jev-policy';
import { advanceMouseCore, createMouseCoreState, mouseCoreContext } from '../src/lib/cognitive/mouse-core';
import { advanceCognitiveWorkspace, createCognitiveState, cognitivePromptContext } from '../src/lib/cognitive/cognitive-workspace';

test('Jev policy routes complex Build work to strong or long tier',()=>{
  const decision=jevRouteDecision(
    'Refatore este aplicativo Next.js, corrija autenticação, banco, testes e deploy e preserve a arquitetura atual.',
    {build:true,hasTools:true,deep:true,contextChars:42000}
  );
  assert.ok(decision.tier==='strong'||decision.tier==='long');
  assert.ok(decision.confidence>=0.6);
});

test('Jev history compaction keeps retained messages verbatim and preserves recent turns',()=>{
  const messages=[
    {role:'user',content:'REGRA EXATA: nunca altere src/generated.'},
    {role:'assistant',content:'Entendido.'},
    {role:'user',content:'Conversa antiga sem relação com o banco.'},
    {role:'assistant',content:'Detalhe antigo irrelevante.'},
    {role:'user',content:'Corrija agora o banco PostgreSQL sem alterar src/generated.'},
    {role:'assistant',content:'Vou corrigir o banco.'}
  ];
  const result=jevCompactHistory(messages,'corrigir banco PostgreSQL src/generated',{maxChars:1000,preserveRecent:2});
  assert.equal(result.messages[0].content,'REGRA EXATA: nunca altere src/generated.');
  assert.equal(result.messages.at(-2)?.content,'Corrija agora o banco PostgreSQL sem alterar src/generated.');
  assert.equal(result.messages.at(-1)?.content,'Vou corrigir o banco.');
  for(const row of result.messages){
    assert.ok(messages.some(x=>x.content===row.content));
  }
});

test('Jev file selection prioritizes explicitly referenced file and keeps its source intact',()=>{
  const critical='export function critical(){\n  return "EXACT-CONTENT-MUST-SURVIVE";\n}\n'.repeat(120);
  const files=[
    {path:'package.json',language:'json',content:'{"scripts":{"build":"next build"}}'},
    {path:'src/app/page.tsx',language:'typescript',content:'export default function Page(){return <div/>}'},
    {path:'src/lib/critical.ts',language:'typescript',content:critical},
    {path:'README.md',language:'markdown',content:'unrelated documentation'}
  ];
  const picked=jevSelectWorkspaceFiles(files,'corrija src/lib/critical.ts e preserve seu comportamento',{maxFiles:4,maxChars:50000});
  const target=picked.files.find(x=>x.path==='src/lib/critical.ts');
  assert.ok(target);
  assert.equal(target?.content,critical);
  assert.match(target?.content||'',/EXACT-CONTENT-MUST-SURVIVE/);
});

test('Mouse Core contributes mapped mouse state to unified cognitive context',()=>{
  const mouse=advanceMouseCore(createMouseCoreState(),'analise uma imagem e explore o ambiente visual');
  assert.ok(mouse.visualIntegration>0.6);
  assert.match(mouseCoreContext(mouse),/MICrONS/);
  const state=advanceCognitiveWorkspace(createCognitiveState(),'compare a imagem e pesquise evidência');
  assert.equal(state.mouse.version,1);
  const context=cognitivePromptContext(state);
  assert.match(context,/MOUSE CORE/);
  assert.match(context,/Fly/i);
  assert.match(context,/Human/i);
  assert.match(context,/macaque/i);
});
