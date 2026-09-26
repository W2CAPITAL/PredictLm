import test from 'node:test';
import assert from 'node:assert/strict';
import {fusionHealth,REQUESTED_FUSION_REPOS} from '../src/lib/fusion/capability-fabric';
import {fusionImplementationAudit} from '../src/lib/fusion/implementation-audit';
import {gameStudioPlan} from '../src/lib/game-studio-fabric';
import {planAgenticRun,selectSkillContracts} from '../src/lib/agent-runtime/agentic-fabric';

test('all user-requested capability sources remain registered',()=>{
  const health=fusionHealth();
  assert.equal(health.requestedCoverage.expected,46);
  assert.equal(health.requestedCoverage.covered,46);
  assert.deepEqual(health.requestedCoverage.missing,[]);
  assert.equal(health.requestedCoverage.complete,true);
  assert.equal(REQUESTED_FUSION_REPOS.length,46);
});

test('implementation audit maps every requested source to real app surfaces',()=>{
  const audit=fusionImplementationAudit();
  assert.equal(audit.expected,46);
  assert.equal(audit.registered,46);
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
  assert.ok(!build.includes('game-studio-fabric'));
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
