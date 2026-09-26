import test from 'node:test';
import assert from 'node:assert/strict';
import {fusionHealth,REQUESTED_FUSION_REPOS} from '../src/lib/fusion/capability-fabric';
import {fusionImplementationAudit} from '../src/lib/fusion/implementation-audit';
import {gameStudioPlan} from '../src/lib/game-studio-fabric';
import {planAgenticRun,selectSkillContracts} from '../src/lib/agent-runtime/agentic-fabric';

test('all user-requested capability sources remain registered',()=>{
  const health=fusionHealth();
  const expected=REQUESTED_FUSION_REPOS.length;
  assert.equal(health.requestedCoverage.expected,expected);
  assert.equal(health.requestedCoverage.covered,expected);
  assert.deepEqual(health.requestedCoverage.missing,[]);
  assert.equal(health.requestedCoverage.complete,true);
  assert.ok(REQUESTED_FUSION_REPOS.includes('OpenBMB/ChatDev'));
});

test('implementation audit maps every requested source to real app surfaces',()=>{
  const audit=fusionImplementationAudit();
  const expected=REQUESTED_FUSION_REPOS.length;
  assert.equal(audit.expected,expected);
  assert.equal(audit.registered,expected);
  assert.equal(audit.complete,true);
  assert.deepEqual(audit.missing,[]);
  for(const row of audit.rows){
    assert.equal(row.registered,true,row.repo+' must remain registered');
    assert.ok(row.surfaces.length>0,row.repo+' must have at least one surface');
    assert.ok(row.modules.length>0,row.repo+' must map to at least one runtime module');
  }
});

test('Game Studio skill is selected for Simulation but not generic Build',()=>{
  const sim=selectSkillContracts('simulação de vida multiagente com memória e mundo persistente','simulation',10).map(x=>x.id);
  const build=selectSkillContracts('crie um jogo web em React e TypeScript','build',10).map(x=>x.id);
  assert.ok(sim.includes('game-studio-fabric'));
  assert.ok(sim.includes('mirofish-simulation'));
  assert.ok(!build.includes('game-studio-fabric'));
  assert.ok(!build.includes('mirofish-simulation'));
});

test('Simulation agent plan uses studio roles while Build keeps normal build roles',()=>{
  const sim=planAgenticRun('rode uma simulação social persistente com NPCs autônomos','simulation',true);
  assert.ok(sim.roles.includes('game-producer'));
  assert.ok(sim.roles.includes('playtest-reviewer'));

  const build=planAgenticRun('implemente um jogo web em React','build',true);
  assert.ok(build.roles.includes('architect'));
  assert.ok(build.roles.includes('implementer'));
  assert.ok(!build.roles.includes('game-producer'));
});

test('Game Studio plan validates the Life Simulation loop',()=>{
  const plan=gameStudioPlan('simulação de vida com agentes autônomos, relações e mundo visual',true);
  assert.equal(plan.active,true);
  assert.equal(plan.engine,'web');
  assert.ok(plan.gates.some(x=>/world-state/i.test(x)));
  assert.ok(plan.gates.some(x=>/memory/i.test(x)));
  assert.ok(plan.roles.includes('simulation-producer'));
});


test('Minecraft and Unity sources map to the Simulation runtime they actually improve',()=>{
  const audit=fusionImplementationAudit();
  const byRepo=new Map(audit.rows.map(row=>[row.repo,row]));
  const minecraftRepos=[
    'fogleman/Craft',
    'dgreenheck/minecraft-threejs-clone',
    '0xfabian/mc',
    'pquiring/jfcraft',
    'obiwac/python-minecraft-clone',
    'Aidanhouk/Minecraft-Clone',
    'zardoy/minecraft-web-client',
    'zardoy/mcraft-arwes',
    'JEFFY1234599/block-craft-browser-edition',
    'TheDoctor200/MinecraftDungeonsLauncher',
    'GuyRoosevelt/Minecraft-Dungeons-The-Awakening'
  ];
  for(const repo of minecraftRepos){
    const row=byRepo.get(repo);
    assert.ok(row,repo+' missing from audit');
    assert.ok(row!.surfaces.includes('simulation'),repo+' must affect Simulation');
    assert.ok(row!.modules.includes('src/lib/simulation/minecraft-sandbox.ts'),repo+' must map to voxel runtime');
  }
  const unity=byRepo.get('jbruening/UnEngine');
  assert.ok(unity);
  assert.ok(unity!.surfaces.includes('simulation'));
  assert.ok(unity!.surfaces.includes('build'));
  assert.ok(unity!.surfaces.includes('media'));
  assert.ok(unity!.surfaces.includes('video'));
  assert.ok(unity!.modules.includes('src/lib/unity-fabric.ts'));
});


test('official MiroFish is a first-class reference for Simulation with a native clean-room runtime',()=>{
  const audit=fusionImplementationAudit();
  const row=audit.rows.find(item=>item.repo==='666ghj/MiroFish');
  assert.ok(row);
  assert.equal(row!.mode,'reference');
  assert.ok(row!.surfaces.includes('simulation'));
  assert.ok(row!.surfaces.includes('memory'));
  assert.ok(row!.modules.includes('src/lib/simulation/mirofish-fabric.ts'));
});
