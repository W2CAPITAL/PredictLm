import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelWorld,normalizeVoxelWorld} from '../src/lib/simulation/minecraft-sandbox';
import {setVoxelBioAIAutonomy,stepVoxelBioAI,voxelBioAISummary} from '../src/lib/simulation/bioai-voxel-agent';

test('new voxel worlds include an autonomous persistent BioAI player',()=>{
  const world=createVoxelWorld(321);
  assert.equal(world.bioAI.autonomous,true);
  assert.equal(world.bioAI.health,20);
  assert.ok(Number.isFinite(world.bioAI.x));
  assert.ok(world.bioAI.memory.length>=1);
});

test('older voxel saves migrate forward with BioAI state',()=>{
  const old:any=createVoxelWorld(77);
  delete old.bioAI;
  const restored=normalizeVoxelWorld(old);
  assert.equal(restored.bioAI.autonomous,true);
  assert.equal(restored.bioAI.dimension,'overworld');
});

test('BioAI can independently step through the effectively unbounded voxel world',()=>{
  const world=createVoxelWorld(999);
  const next=stepVoxelBioAI(world);
  assert.equal(next.bioAI.tick,world.bioAI.tick+1);
  assert.ok(next.bioAI.goal.length>5);
  assert.ok(next.bioAI.lastAction.length>0);
  assert.match(voxelBioAISummary(next),/BioAI/);
});

test('BioAI autonomy can be paused without destroying its world memory',()=>{
  const world=createVoxelWorld(404);
  const paused=setVoxelBioAIAutonomy(world,false);
  const stepped=stepVoxelBioAI(paused);
  assert.equal(stepped.bioAI.autonomous,false);
  assert.equal(stepped.bioAI.tick,paused.bioAI.tick);
  assert.ok(stepped.bioAI.memory.length>=world.bioAI.memory.length);
});
