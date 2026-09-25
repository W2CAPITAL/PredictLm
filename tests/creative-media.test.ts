
import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceCognitiveWorkspace,createCognitiveState} from '../src/lib/cognitive/cognitive-workspace';
import {buildCreativeMediaControl} from '../src/lib/cognitive/creative-media';

test('creative brain keeps franchise identity fixed while allowing composition creativity',()=>{
  const state=advanceCognitiveWorkspace(createCognitiveState(),'crie uma imagem do Freeza');
  const control=buildCreativeMediaControl(state,'crie uma imagem do Freeza');
  assert.ok(control.novelty>=0&&control.novelty<=1);
  assert.ok(control.fidelity>=0&&control.fidelity<=1);
  assert.match(control.publicBrief,/public control summary/i);
  assert.match(control.publicBrief,/must NOT change character identity/i);
  assert.match(control.publicBrief,/camera, staging, lighting/i);
});
