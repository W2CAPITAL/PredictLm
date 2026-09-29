import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  cognitiveSurfaceControl,
  cognitiveSurfaceContext,
  cognitiveSurfaceFromPrompt,
  type CognitiveSurface
} from '../src/lib/cognitive/cognitive-surface';
import {advanceCognitiveWorkspace,createCognitiveState} from '../src/lib/cognitive/cognitive-workspace';
import {buildCreativeMediaControl} from '../src/lib/cognitive/creative-media';

const surfaces:CognitiveSurface[]=['chat','legal','build','work','tutor','research','imagine','report'];

test('all public/capability surfaces use all four lightweight cores',()=>{
  const state=advanceCognitiveWorkspace(
    createCognitiveState(),
    'analise a evidência, planeje a execução, compare alternativas e verifique o resultado visual'
  );

  for(const surface of surfaces){
    const control=cognitiveSurfaceControl(state,surface);
    assert.equal(control.surface,surface);
    assert.ok(control.cores.fly>0,'fly missing on '+surface);
    assert.ok(control.cores.mouse>0,'mouse missing on '+surface);
    assert.ok(control.cores.macaque>0,'macaque missing on '+surface);
    assert.ok(control.cores.human>0,'human missing on '+surface);
    assert.match(cognitiveSurfaceContext(state,surface),/Fly \d+% · Mouse \d+% · Macaque \d+% · Human \d+%/);
    for(const value of [control.attention,control.verification,control.integration,control.exploration,control.action]){
      assert.ok(value>=0&&value<=1,'control out of bounds on '+surface);
    }
  }
});

test('stateless four-core surface control is deterministic for server caching',()=>{
  const a=cognitiveSurfaceFromPrompt('verifique este processo e explique a decisão','legal');
  const b=cognitiveSurfaceFromPrompt('verifique este processo e explique a decisão','legal');
  assert.equal(a.context,b.context);
  assert.deepEqual(a.control,b.control);
});

test('creative media uses fly mouse macaque and human without loading simulation',()=>{
  const state=advanceCognitiveWorkspace(createCognitiveState(),'crie uma imagem detalhada de um personagem em movimento');
  const control=buildCreativeMediaControl(state,'crie uma imagem detalhada de um personagem em movimento');
  assert.ok(control.novelty>=0&&control.novelty<=1);
  assert.ok(control.fidelity>=0&&control.fidelity<=1);
  assert.ok(control.composition>=0&&control.composition<=1);
  assert.match(control.publicBrief,/fly for salience\/novelty/i);
  assert.match(control.publicBrief,/mouse for visual integration/i);
  assert.match(control.publicBrief,/macaque for visual hierarchy/i);
  assert.match(control.publicBrief,/human for execution\/fidelity/i);
});

test('app surfaces wire four-core control without reintroducing heavy simulation imports',()=>{
  const shell=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
  const agent=fs.readFileSync(new URL('../src/app/api/agent/route.ts',import.meta.url),'utf8');
  const legal=fs.readFileSync(new URL('../src/lib/legal/presentation.ts',import.meta.url),'utf8');
  const report=fs.readFileSync(new URL('../src/app/api/report-dossier/generate/route.ts',import.meta.url),'utf8');
  const imagine=fs.readFileSync(new URL('../src/components/SimpleImaginePanel.tsx',import.meta.url),'utf8');
  const chatRoute=fs.readFileSync(new URL('../src/app/api/chat/route.ts',import.meta.url),'utf8');

  assert.match(shell,/cognitiveSurfaceContext\(nextCognitive,cognitiveSurface\)/);
  assert.doesNotMatch(shell,/cognitivePromptContext\(nextCognitive\)/);
  assert.doesNotMatch(shell,/GrokSimulationPanel/);

  assert.match(agent,/cognitiveSurfaceFromPrompt\(task,'build'\)\.context/);
  assert.match(legal,/cognitiveSurfaceFromPrompt\(prompt\+' '\+bundle\.summary\.sourceSummary,'legal'\)/);
  assert.match(report,/cognitiveSurfaceFromPrompt\(request\+'\\n'\+sourceText\.slice\(0,3600\),'report'\)\.context/);

  assert.match(imagine,/import\('@\/lib\/cognitive\/cognitive-memory'\)/);
  assert.match(imagine,/buildCreativeMediaControl/);
  assert.doesNotMatch(imagine,/from '@\/lib\/cognitive\/cognitive-workspace'/);

  assert.match(chatRoute,/cleanCognitive/);
  assert.match(chatRoute,/cognitiveSurfaceFromPrompt\(prompt,serverSurface\)\.context/);
  assert.match(chatRoute,/cognitiveSurfaceFromPrompt\(prompt,'imagine'\)\.context/);
});
