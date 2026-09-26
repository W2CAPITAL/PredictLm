import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceBioAI,
  bioAiSurfaceDirectives,
  chooseBioAIVoxelGoal,
  createBioAIState,
  normalizeBioAIState
} from '../src/lib/bioai';

test('unified BioAI couples cross-species state, reservoir and bounded local memory',()=>{
  const initial=createBioAIState(1000);
  const result=advanceBioAI(initial,{
    surface:'build',
    action:'compile failed',
    kind:'error',
    success:false,
    novelty:.8,
    uncertainty:.92,
    salience:.96
  });
  assert.equal(result.state.identity,'PredictLM BioAI');
  assert.equal(result.state.tick,1);
  assert.equal(result.state.reservoir.tick,1);
  assert.equal(result.state.counters.failures,1);
  assert.ok(result.state.memory.length>=1);
  assert.ok(result.fusion.learningPriority>.6);
});

test('legacy BioAI state without reservoir migrates to a valid local reservoir',()=>{
  const legacy:any={...createBioAIState(5)};
  delete legacy.reservoir;
  const normalized=normalizeBioAIState(legacy);
  assert.equal(normalized.reservoir.version,1);
  assert.equal(normalized.reservoir.membrane.length,48);
});

test('BioAI surface directives are shared across product surfaces',()=>{
  const image=bioAiSurfaceDirectives('image','Naruto fighting Sasuke');
  const build=bioAiSurfaceDirectives('build','repair the app');
  assert.match(image,/BIOAI IMAGE DIRECTIVES/);
  assert.match(build,/BIOAI BUILD DIRECTIVES/);
  assert.match(image,/prediction/i);
});

test('voxel policy prioritizes survival before open-world exploration',()=>{
  const base={
    health:20,hunger:20,hostileMobs:0,passiveMobs:0,villagers:0,
    structures:[],inventory:{},chunksVisited:1,mined:0,placed:0,crafted:0,dungeonsCleared:0,
    day:1,biome:'forest',dimension:'overworld'
  };
  assert.match(chooseBioAIVoxelGoal({...base,hunger:4,inventory:{bread:1}}),/comer/);
  assert.match(chooseBioAIVoxelGoal({...base,hostileMobs:2,health:6}),/oposta|abrigo/);
  assert.match(chooseBioAIVoxelGoal(base),/madeira/);
});
