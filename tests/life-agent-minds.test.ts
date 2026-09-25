
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLifeSimulation} from '../src/lib/life-simulation-engine';
import {createMacaqueSimulationState,stepMacaqueSimulation} from '../src/lib/cognitive/macaque-simulation';
import {advanceSyntheticMind,createSyntheticMindBundle} from '../src/lib/synthetic-life-memory';

test('macaque agent moves independently and exposes a public simulated thought',()=>{
  const world=createLifeSimulation();
  let macaque=createMacaqueSimulationState();
  const start={x:macaque.x,y:macaque.y};
  for(let i=0;i<12;i++)macaque=stepMacaqueSimulation(macaque,{worldState:world,fly:{x:520,y:320}});
  assert.ok(Math.hypot(macaque.x-start.x,macaque.y-start.y)>3);
  assert.ok(macaque.publicThought.length>15);
  assert.ok(['explore','inspect','forage','climb','rest','social'].includes(macaque.behavior));
});

test('lifetime memories are explicitly synthetic while runtime experiences stay separate',()=>{
  const bundle=createSyntheticMindBundle('Lia');
  for(const actor of ['human','macaque','fly'] as const){
    assert.ok(bundle[actor].memories.length>=6);
    assert.ok(bundle[actor].memories.every(x=>x.source==='synthetic-biography'));
    assert.equal(bundle[actor].biographyLabel,'synthetic');
  }
  let human=bundle.human;
  for(let i=0;i<7;i++)human=advanceSyntheticMind(human,{
    perception:'quadro de planejamento e computador no trabalho',
    action:'produzindo uma tarefa e revisando prioridades',
    location:'Trabalho',
    curiosity:.7,
    threat:.1
  });
  assert.ok(human.memories.some(x=>x.source==='runtime'));
  assert.match(human.publicThought,/Trabalho não é só ocupar um lugar/i);
});
