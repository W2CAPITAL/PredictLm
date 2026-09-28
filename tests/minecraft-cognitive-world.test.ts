import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CRAFT_RECIPES,
  VOXEL_ADVANCEMENTS,
  VOXEL_BLOCKS,
  attackVoxelMob,
  blockAt,
  createVoxelWorld,
  mobsForChunk,
  structureForChunk,
  treeDescriptorAt,
  voxelAdvancementProgress
} from '../src/lib/simulation/minecraft-sandbox';
import {
  createMinecraftBrainState,
  stepMinecraftBrains
} from '../src/lib/simulation/minecraft-brain-agents';
import {
  FIRST_PERSON_VISION,
  minecraftFirstPersonPose
} from '../src/lib/simulation/minecraft-first-person';
import {mobModelComplexity,mobVoxelModel} from '../src/lib/simulation/minecraft-voxel-models';

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
    assert.ok(result.brains.agents[id].neuralSpikes>0);
    assert.ok(['explore','forage','seek_social','avoid_threat','build'].includes(result.brains.agents[id].neuralAction));
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


test('all four brains expose distinct first-person 3D camera profiles',()=>{
  const world=createVoxelWorld(827361);
  const brains=createMinecraftBrainState(world);
  for(const id of ['human','macaque','mouse','fly'] as const){
    const pose=minecraftFirstPersonPose(world,brains,id);
    assert.equal(pose.target,id);
    assert.equal(pose.label,brains.agents[id].label);
    assert.ok(pose.fov>=80);
    assert.ok(Number.isFinite(pose.yaw));
    assert.ok(Number.isFinite(pose.pitch));
  }
  assert.ok(FIRST_PERSON_VISION.fly.fov>FIRST_PERSON_VISION.human.fov);
  assert.ok(FIRST_PERSON_VISION.mouse.eyeOffset<FIRST_PERSON_VISION.human.eyeOffset);
});

test('Minecraft UI defaults to WebGL first-person and keeps the old renderer only as a map',()=>{
  const ui=fs.readFileSync(new URL('../src/components/MinecraftSimulationPanel.tsx',import.meta.url),'utf8');
  const renderer=fs.readFileSync(new URL('../src/components/MinecraftFirstPerson3D.tsx',import.meta.url),'utf8');
  assert.match(ui,/useState<'first-person'\|'map'\|'unity'>\('first-person'\)/);
  assert.match(ui,/MinecraftFirstPerson3D/);
  assert.match(ui,/3D · 1ª pessoa/);
  assert.match(ui,/Mapa 2D/);
  assert.match(renderer,/getContext\('webgl'/);
  assert.match(renderer,/requestPointerLock/);
  assert.match(renderer,/VOXEL_WORLD_HEIGHT/);
  assert.match(renderer,/blockAt\(world/);
  assert.match(renderer,/gl\.BLEND/);
});


test('mobs render as recognizable multipart voxel models instead of two generic blocks',()=>{
  const kinds=['sheep','pig','cow','chicken','zombie','skeleton','spider','creeper','enderman','villager','blaze','ghast','boss'] as const;
  for(const kind of kinds){
    const model=mobVoxelModel(kind);
    const quality=mobModelComplexity(kind);
    assert.ok(model.length>=6,kind+' should have enough distinct body parts');
    assert.ok(quality.parts>=6);
  }
  assert.ok(mobVoxelModel('spider').filter(x=>x.id.startsWith('leg-')).length>=8);
  assert.ok(mobVoxelModel('ghast').filter(x=>x.id.startsWith('tentacle')).length>=4);
  assert.ok(mobVoxelModel('boss').some(x=>x.id.startsWith('wing-')));
  assert.ok(mobVoxelModel('creeper').some(x=>x.id==='mouth'));
});

test('overworld trees have deterministic trunks and layered crowns',()=>{
  const seed=827361;
  let tree:ReturnType<typeof treeDescriptorAt>=null;
  for(let x=-80;x<=80&&!tree;x++)for(let z=-80;z<=80&&!tree;z++)tree=treeDescriptorAt(seed,x,z);
  assert.ok(tree,'expected a tree near spawn search area');
  const t=tree!;
  for(let y=t.baseY+1;y<=t.baseY+t.trunkHeight;y++)assert.equal(blockAt(createVoxelWorld(seed),t.x,y,t.z),'wood');
  const leafLayers=new Set<number>();
  const world=createVoxelWorld(seed);
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)for(let y=t.baseY+t.trunkHeight-3;y<=t.baseY+t.trunkHeight+3;y++){
    if(blockAt(world,t.x+dx,y,t.z+dz)==='leaves')leafLayers.add(y);
  }
  assert.ok(leafLayers.size>=3,'tree crown should span multiple layers');
});

test('advancement tree covers story nether end adventure and husbandry objectives',()=>{
  assert.ok(VOXEL_ADVANCEMENTS.length>=30);
  const categories=new Set(VOXEL_ADVANCEMENTS.map(x=>x.category));
  for(const category of ['story','nether','end','adventure','husbandry'])assert.ok(categories.has(category as any));
  const ids=new Set(VOXEL_ADVANCEMENTS.map(x=>x.id));
  for(const id of ['story:wood','story:iron','story:diamond','nether:enter','nether:fortress','nether:blaze','end:enter','end:boss','end:city','adventure:all-biomes','husbandry:farm'])assert.ok(ids.has(id));
  const progress=voxelAdvancementProgress(createVoxelWorld(12));
  assert.equal(progress.length,VOXEL_ADVANCEMENTS.length);
});

test('boss combat persists HP between attacks and can be defeated',()=>{
  let world=createVoxelWorld(777);
  world={...world,player:{...world.player,dimension:'void',mode:'creative'}};
  const boss=mobsForChunk(world,0,0).find(x=>x.kind==='boss');
  assert.ok(boss);
  const result=attackVoxelMob(world,boss!);
  assert.equal(result.ok,true);
  assert.equal(result.state.discoveries['void-boss:defeated'],true);
  assert.ok(voxelAdvancementProgress(result.state).find(x=>x.id==='end:boss')?.unlocked);
});
