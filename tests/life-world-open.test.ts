import test from 'node:test';
import assert from 'node:assert/strict';
import {autonomousLifePlan,createLifeAgentState} from '../src/lib/life-simulation-agent';
import {createLifeSimulation} from '../src/lib/life-simulation-engine';
import {
  LIFE_WORLD_HEIGHT,
  LIFE_WORLD_WIDTH,
  WORLD_OBJECTS,
  perceiveFlyWorld,
  perceiveHumanWorld
} from '../src/lib/life-world-open';
import {createFlySimulationState,stepFlySimulation} from '../src/lib/cognitive/fly-simulation';

test('open world is larger and contains meaningful interactive objects',()=>{
  assert.equal(LIFE_WORLD_WIDTH,960);
  assert.equal(LIFE_WORLD_HEIGHT,600);
  const kinds=new Set(WORLD_OBJECTS.map(x=>x.kind));
  for(const kind of ['computer','phone','tree','bed','sofa','fridge','stove','bookshelf']){
    assert.ok(kinds.has(kind as any),kind);
  }
  assert.ok(WORLD_OBJECTS.length>=30);
});

test('human vision is directional instead of omniscient',()=>{
  const state=createLifeSimulation();
  const homeObjects=WORLD_OBJECTS.filter(x=>x.location==='Casa');
  const target=homeObjects.find(x=>x.kind==='fridge')!;
  state.person.x=target.x-45;
  state.person.y=target.y;
  state.person.heading=0;
  const forward=perceiveHumanWorld(state);
  assert.ok(forward.visible.some(x=>x.id===target.id));

  state.person.heading=Math.PI;
  const backward=perceiveHumanWorld(state);
  assert.equal(backward.visible.some(x=>x.id===target.id),false);
  assert.ok(backward.visible.length<WORLD_OBJECTS.length);
});

test('fly sees a wide local field but not the entire world',()=>{
  const state=createLifeSimulation();
  let fly=createFlySimulationState();
  fly={...fly,x:150,y:130,vx:1,vy:0};
  const vision=perceiveFlyWorld(fly,state);
  assert.equal(vision.fovDeg,320);
  assert.ok(vision.visible.length>0);
  assert.ok(vision.visible.length<WORLD_OBJECTS.length);
});

test('autonomous human plan chooses affordances instead of a fixed linear script',()=>{
  const state=createLifeSimulation();
  const agent=createLifeAgentState();
  const first=autonomousLifePlan(state,agent,'Decida livremente', {x:150,y:130});
  assert.ok(first.actions.some(x=>x.type==='approach_object'));
  assert.ok(first.actions.some(x=>x.type==='use_object'));
  assert.doesNotMatch(first.summary,/prioridade fixa/i);

  const changed=createLifeSimulation();
  changed.tick=19;
  changed.needs.hunger=18;
  changed.needs.social=25;
  changed.person.money=180;
  const second=autonomousLifePlan(changed,{...agent,autonomy:{...agent.autonomy,decisionCount:7}},'Decida livremente',{x:600,y:300});
  assert.ok(second.actions.length>=2);
  assert.notDeepEqual(
    first.actions.map(x=>x.objectId||x.target||x.type),
    second.actions.map(x=>x.objectId||x.target||x.type)
  );
});

test('fly chooses visible stimuli and may speak or stay silent autonomously',()=>{
  const state=createLifeSimulation();
  let fly=createFlySimulationState();
  let sawUtterance=false;
  let sawSilence=false;
  for(let i=0;i<40;i++){
    fly=stepFlySimulation(fly,{
      personX:state.person.x,
      personY:state.person.y,
      personAction:state.person.currentAction,
      personLocation:state.person.location,
      worldState:state
    });
    if(fly.lastUtterance)sawUtterance=true;
    else sawSilence=true;
  }
  assert.ok(fly.visible.length>0);
  assert.ok(sawSilence);
  assert.ok(sawUtterance||fly.silenceTicks>0);
});
