import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CRAFT_RECIPES,
  VOXEL_BLOCKS,
  createVoxelWorld,
  mobsForChunk,
  structureForChunk
} from '../src/lib/simulation/minecraft-sandbox';
import {
  createMinecraftBrainState,
  stepMinecraftBrains
} from '../src/lib/simulation/minecraft-brain-agents';

test('Simulation surface keeps Minecraft as the only public simulation mode',()=>{
  const ui=fs.readFileSync(new URL('../src/components/GrokSimulationPanel.tsx',import.meta.url),'utf8');
  assert.match(ui,/Minecraft Cognitive World/);
  assert.match(ui,/MinecraftSimulationPanel/);
  assert.doesNotMatch(ui,/simulationView/);
  assert.doesNotMatch(ui,/>Vida</);
  assert.doesNotMatch(ui,/Voxel \/ Minecraft/);
});

test('human macaque mouse and fly brains all take turns in the same Minecraft world',()=>{
  const world=createVoxelWorld(827361);
  const brains=createMinecraftBrainState(world);
  const result=stepMinecraftBrains(world,brains);
  assert.equal(result.brains.tick,1);
  for(const id of ['human','macaque','mouse','fly'] as const){
    assert.equal(result.brains.agents[id].decisions,1);
    assert.ok(result.brains.agents[id].lastAction.length>0);
    assert.ok(result.brains.agents[id].publicThought.length>0);
  }
  assert.ok(result.world.stats.distance>=world.stats.distance);
  assert.ok(result.brains.cognitive.tick>=4);
});

test('Minecraft runtime includes furniture gear and richer food crafting',()=>{
  for(const block of ['bed','table','chair','bookshelf','door','ladder','lantern','nether_bricks','end_stone']){
    assert.ok(block in VOXEL_BLOCKS,'missing block '+block);
  }
  const recipes=new Set(CRAFT_RECIPES.map(x=>x.id));
  for(const recipe of ['bed','table','chair','bookshelf','door','ladder','lantern','iron_helmet','iron_chestplate','bow','shield','golden_apple']){
    assert.ok(recipes.has(recipe),'missing recipe '+recipe);
  }
});

test('Nether and End generate their own structures and hostile ecosystems',()=>{
  const base=createVoxelWorld(99173);
  const nether={...base,player:{...base.player,dimension:'infernal' as const}};
  const end={...base,player:{...base.player,dimension:'void' as const}};

  let netherStructure=false,endStructure=false,netherMob=false,endMob=false;
  for(let cx=-20;cx<=20;cx++)for(let cz=-20;cz<=20;cz++){
    if(structureForChunk(nether,cx,cz).some(x=>x.kind==='nether_fortress'))netherStructure=true;
    if(structureForChunk(end,cx,cz).some(x=>x.kind==='stronghold'||x.kind==='end_city'))endStructure=true;
    if(mobsForChunk(nether,cx,cz).some(x=>x.kind==='blaze'||x.kind==='ghast'))netherMob=true;
    if(mobsForChunk(end,cx,cz).some(x=>x.kind==='enderman'||x.kind==='end_guard'))endMob=true;
  }
  assert.equal(netherStructure,true);
  assert.equal(endStructure,true);
  assert.equal(netherMob,true);
  assert.equal(endMob,true);
});
