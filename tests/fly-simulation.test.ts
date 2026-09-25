import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlySimulationState,flySimulationBubble,stepFlySimulation} from '../src/lib/cognitive/fly-simulation';
import {LIFE_WORLD_HEIGHT,LIFE_WORLD_WIDTH} from '../src/lib/life-world-open';

test('FlyCore simulation agent moves autonomously inside world bounds',()=>{
  let fly=createFlySimulationState();
  const start={x:fly.x,y:fly.y};
  for(let i=0;i<12;i++){
    fly=stepFlySimulation(fly,{
      personX:320,
      personY:215,
      personAction:'estudando',
      personLocation:'casa'
    });
  }
  assert.equal(fly.tick,12);
  assert.ok(fly.x>=18&&fly.x<=LIFE_WORLD_WIDTH-18);
  assert.ok(fly.y>=20&&fly.y<=LIFE_WORLD_HEIGHT-22);
  assert.ok(fly.x!==start.x||fly.y!==start.y);
  assert.match(flySimulationBubble(fly),/bzz/i);
});

test('FlyCore simulation reacts to nearby threat stimulus with avoidance',()=>{
  let fly=createFlySimulationState();
  fly={
    ...fly,
    x:320,
    y:215,
    core:{...fly.core,threat:.8,salience:.8}
  };
  const next=stepFlySimulation(fly,{
    personX:325,
    personY:220,
    personAction:'movimento brusco perigo ameaça',
    personLocation:'rua'
  });
  assert.ok(next.core.threat>.5);
  assert.equal(next.behavior,'avoid');
  assert.match(flySimulationBubble(next),/afastando/i);
});

test('Fly simulation preserves the mapped FlyWire core metadata',()=>{
  const fly=createFlySimulationState();
  assert.equal(fly.core.mappedSubgraph.dataset,'FlyWire FAFB');
  assert.equal(fly.core.mappedSubgraph.release,'v783');
  assert.equal(fly.core.mappedSubgraph.neuronScale,139255);
  assert.equal(fly.core.mappedSubgraph.synapseScale,54500000);
});
