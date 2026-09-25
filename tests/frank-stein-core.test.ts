import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFrankEmotion,createFrankEmotionState,emotionMemoryTag} from '../src/lib/cognitive/frank-emotion';
import {createFrankNeuronMesh,stepFrankNeuronMesh} from '../src/lib/cognitive/frank-neurons';
import {advanceFrankStein,createFrankSteinState,frankPublicMentalState,frankVisualState} from '../src/lib/cognitive/frank-core';
import {FRANK_BRAIN_SOURCES} from '../src/lib/cognitive/frank-sources';
import {advanceCognitiveWorkspace,createCognitiveState,cognitiveIdentity} from '../src/lib/cognitive/cognitive-workspace';

test('Frank source registry combines several human references plus fly and animal fallback',()=>{
  const ids=new Set(FRANK_BRAIN_SOURCES.map(x=>x.id));
  for(const id of ['h01','bigbrain','julich','allen-human','hbp-hippocampus','flywire','microns'])assert.ok(ids.has(id),id);
  assert.ok(FRANK_BRAIN_SOURCES.filter(x=>x.kind==='human').length>=5);
  assert.ok(FRANK_BRAIN_SOURCES.some(x=>x.kind==='animal-fallback'));
});

test('complex emotion state distinguishes attachment grief fear pride guilt and empathy',()=>{
  let e=createFrankEmotionState();
  e=advanceFrankEmotion(e,'Eu amo essa pessoa e sinto muita saudade, mas tenho medo de perdê-la.',{social:.9,memorySalience:.9});
  assert.ok(e.attachment>.3);
  assert.ok(e.affection>.3);
  assert.ok(e.fear>.08);
  assert.ok(e.longing>.12);
  e=advanceFrankEmotion(e,'Eu errei e a culpa foi minha. Tenho vergonha do que fiz.',{predictionError:.8});
  assert.ok(e.guilt>.1);
  assert.ok(e.shame>.08);
  const tag=emotionMemoryTag(e);
  assert.ok(tag.emotionalSalience>.3);
  assert.ok(tag.labels.length>=1);
});

test('virtual neuron mesh is reproducible and regionally driven',()=>{
  const base=createFrankNeuronMesh(12345,256);
  assert.equal(base.neuronCount,256);
  assert.ok(base.synapseCount>1500);
  const a=stepFrankNeuronMesh(base,{amygdala:.9,hippocampus:.7,pfc:.2},{emotionSalience:.9,predictionError:.7});
  const b=stepFrankNeuronMesh(base,{amygdala:.9,hippocampus:.7,pfc:.2},{emotionSalience:.9,predictionError:.7});
  assert.deepEqual(a,b);
  assert.equal(a.tick,1);
  assert.ok(a.regions.amygdala.neurons>0);
  assert.ok(a.plasticity>=0&&a.plasticity<=1);
});

test('Frank state links emotion neurons body memory tone and public mental state',()=>{
  const base=createFrankSteinState();
  const next=advanceFrankStein(base,'Uma lembrança importante voltou e eu quero proteger alguém.',{
    reward:.6,predictionError:.4,social:.8,memorySalience:.95,threat:.55
  });
  assert.equal(next.identity,'Frank Stein');
  assert.equal(next.tick,1);
  assert.ok(next.memoryAffect.lastSalience>.3);
  assert.ok(next.neurons.neuronCount>=256);
  const mind=frankPublicMentalState(next);
  assert.ok(mind.feeling);
  assert.ok(mind.want);
  assert.ok(mind.nextTendency);
  assert.ok(mind.confidence>=0&&mind.confidence<=1);
  assert.match(frankVisualState(next),/FRANK STEIN VISUAL STATE/);
});

test('cognitive workspace advances Frank alongside fly and human cores',()=>{
  const base=createCognitiveState();
  const next=advanceCognitiveWorkspace(base,'Estou curioso, mas preocupado, e quero lembrar disso.');
  assert.equal(next.frank.tick,1);
  assert.ok(next.frank.emotion.curiosity>0);
  assert.equal(cognitiveIdentity('frank'),'Frank Stein');
});
