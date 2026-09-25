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
  assert.ok(Math.hypot(fly.x-start.x,fly.y-start.y)>8);
  assert.ok(fly.z>=14&&fly.z<=92);
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
  assert.match(flySimulationBubble(next),/afastando|longe/i);
});

test('Fly simulation preserves the mapped FlyWire core metadata',()=>{
  const fly=createFlySimulationState();
  assert.equal(fly.core.mappedSubgraph.dataset,'FlyWire FAFB');
  assert.equal(fly.core.mappedSubgraph.release,'v783');
  assert.equal(fly.core.mappedSubgraph.neuronScale,139255);
  assert.equal(fly.core.mappedSubgraph.synapseScale,54500000);
});


test('fly exploration uses changing waypoints instead of a permanent circular orbit',()=>{
  let fly=createFlySimulationState();
  const firstTarget={x:fly.wanderTargetX,y:fly.wanderTargetY};
  const visited:Array<[number,number]>=[];
  for(let i=0;i<130;i++){
    fly=stepFlySimulation(fly,{
      personX:80,
      personY:70,
      personAction:'parado',
      personLocation:'longe'
    });
    if(i%10===0)visited.push([fly.x,fly.y]);
  }
  assert.ok(fly.targetAge<96);
  assert.ok(fly.wanderTargetX!==firstTarget.x||fly.wanderTargetY!==firstTarget.y);
  const xs=visited.map(v=>Math.round(v[0]/20));
  const ys=visited.map(v=>Math.round(v[1]/20));
  assert.ok(new Set(xs).size>=3||new Set(ys).size>=3);
});


test('fly samples the park lamp then puts it on cooldown instead of sticking there',()=>{
  let fly=createFlySimulationState();
  fly={
    ...fly,
    x:676,y:246,z:48,vx:1,vy:0,
    targetId:'world-lamp',
    targetLabel:'Poste de luz',
    targetDwellTicks:5,
    core:{...fly.core,threat:.1,inhibition:.3,exploration:.7}
  };
  const next=stepFlySimulation(fly,{
    personX:120,personY:480,personAction:'parado',personLocation:'Casa'
  });
  assert.equal(next.avoidTargetId,'world-lamp');
  assert.ok(next.avoidUntilTick>next.tick);
  assert.notEqual(next.targetId,'world-lamp');
});
