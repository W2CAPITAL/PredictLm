import test from 'node:test';
import assert from 'node:assert/strict';
import {createMacaqueSimulationState,stepMacaqueSimulation} from '../src/lib/cognitive/macaque-simulation';
import {createLifeSimulation} from '../src/lib/life-simulation-engine';
import {LIFE_WORLD_HEIGHT,LIFE_WORLD_WIDTH} from '../src/lib/life-world-open';

test('Macaque agent actually advances while simulation ticks',()=>{
  const world=createLifeSimulation();
  let macaque=createMacaqueSimulationState();
  const start={x:macaque.x,y:macaque.y};
  for(let i=0;i<16;i++)macaque=stepMacaqueSimulation(macaque,{worldState:world});
  assert.equal(macaque.tick,16);
  assert.ok(Math.hypot(macaque.x-start.x,macaque.y-start.y)>8);
  assert.ok(macaque.x>=22&&macaque.x<=LIFE_WORLD_WIDTH-22);
  assert.ok(macaque.y>=22&&macaque.y<=LIFE_WORLD_HEIGHT-22);
});

test('Macaque completes an object interaction then cools that target down',()=>{
  const world=createLifeSimulation();
  let macaque=createMacaqueSimulationState();
  macaque={
    ...macaque,
    x:292,y:72,vx:0,vy:0,
    targetId:'macaque-fruit-tree',
    targetLabel:'Árvore frutífera',
    actionProgress:.9
  };
  const next=stepMacaqueSimulation(macaque,{worldState:world});
  assert.equal(next.cooldownTargetId,'macaque-fruit-tree');
  assert.ok(next.cooldownUntilTick>next.tick);
  assert.equal(next.behavior,'explore');
});

test('Macaque anti-stall replaces a stuck route',()=>{
  const world=createLifeSimulation();
  let macaque=createMacaqueSimulationState();
  macaque={...macaque,vx:0,vy:0,lastX:macaque.x,lastY:macaque.y,stalledTicks:4,targetAge:50};
  const next=stepMacaqueSimulation(macaque,{worldState:world});
  assert.equal(next.stalledTicks,0);
  assert.ok(next.wanderTargetX!==macaque.wanderTargetX||next.wanderTargetY!==macaque.wanderTargetY);
});
