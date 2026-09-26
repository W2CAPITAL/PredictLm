import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_MINECRAFT_SIM_REFERENCES,
  MINECRAFT_DUNGEONS_SECONDARY,
  MINECRAFT_PRIMARY_REFERENCES,
  UNITY_ENGINE_REFERENCE,
  minecraftReferenceAudit
} from '../src/lib/simulation/minecraft-reference-fabric';
import {
  blockAt,
  chunkSnapshot,
  createVoxelWorld,
  mineVoxelBlock,
  moveVoxelPlayer,
  placeVoxelBlock,
  surfaceAt,
  voxelUnityScene
} from '../src/lib/simulation/minecraft-sandbox';

test('all Minecraft clone references plus secondary Dungeons and Unity are registered',()=>{
  const audit=minecraftReferenceAudit();
  assert.equal(audit.complete,true);
  assert.equal(audit.expected,12);
  assert.equal(audit.registered,12);
  assert.equal(MINECRAFT_PRIMARY_REFERENCES.length,9);
  assert.equal(MINECRAFT_DUNGEONS_SECONDARY.length,2);
  assert.equal(UNITY_ENGINE_REFERENCE.repo,'jbruening/UnEngine');
  assert.equal(ALL_MINECRAFT_SIM_REFERENCES.length,12);
});

test('voxel world is deterministic and effectively unbounded in X/Z chunks',()=>{
  const world=createVoxelWorld(123456);
  const near=chunkSnapshot(world,0,0);
  const far=chunkSnapshot(world,125000,-125000);
  const farAgain=chunkSnapshot(world,125000,-125000);
  assert.equal(near.cells.length,256);
  assert.equal(far.cells.length,256);
  assert.deepEqual(far.cells,farAgain.cells);
  assert.ok(far.cells.every(cell=>Number.isFinite(cell.y)));
});

test('mining and placing persist as deltas over generated terrain',()=>{
  let world=createVoxelWorld(777);
  let cell=surfaceAt(world,world.player.x,world.player.z);
  for(let dx=-8;dx<=8&&(cell.block==='water'||cell.block==='lava');dx++){
    for(let dz=-8;dz<=8&&(cell.block==='water'||cell.block==='lava');dz++){
      const candidate=surfaceAt(world,world.player.x+dx,world.player.z+dz);
      if(candidate.block!=='water'&&candidate.block!=='lava')cell=candidate;
    }
  }
  assert.notEqual(cell.block,'water');
  assert.notEqual(cell.block,'lava');

  const mined=mineVoxelBlock(world,cell.x,cell.y,cell.z);
  assert.equal(mined.ok,true);
  world=mined.state;
  assert.equal(blockAt(world,cell.x,cell.y,cell.z),'air');

  world={...world,player:{...world.player,mode:'creative'}};
  const placed=placeVoxelBlock(world,cell.x,cell.y,cell.z,'bricks');
  assert.equal(placed.ok,true);
  assert.equal(blockAt(placed.state,cell.x,cell.y,cell.z),'bricks');
});

test('movement can cross arbitrary chunks without a gameplay world border',()=>{
  let world=createVoxelWorld(91);
  world={...world,player:{...world.player,x:999999,z:-999999}};
  const moved=moveVoxelPlayer(world,1,0);
  assert.ok(moved.player.x>999999);
  assert.ok(Number.isFinite(moved.player.y));
});

test('voxel state exports a Unity-style scene snapshot',()=>{
  const world=createVoxelWorld(42);
  const scene=voxelUnityScene(world,4);
  assert.equal(scene.version,1);
  assert.equal(scene.sceneId,'predictlm-voxel-world');
  assert.ok(scene.objects.some(x=>x.id==='player'));
  assert.ok(scene.objects.some(x=>x.id.startsWith('block:')));
});
