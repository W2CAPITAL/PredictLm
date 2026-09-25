import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceLifeAgentMind,commitLifeChoice,createLifeAgentMind,scoreMindObject} from '../src/lib/life-agent-mind';
import {createLifeSimulation} from '../src/lib/life-simulation-engine';
import {WORLD_OBJECTS,perceiveHumanWorld} from '../src/lib/life-world-open';

test('human mind exposes wants focus and persistent goals',()=>{
  const state=createLifeSimulation();
  const vision=perceiveHumanWorld(state);
  const mind=advanceLifeAgentMind(createLifeAgentMind(),state,vision);
  assert.ok(mind.currentWant);
  assert.ok(mind.currentFocus);
  assert.ok(mind.publicThought);
  assert.ok(mind.goals.length>=2);
});

test('recent repeated object use is penalized by boredom',()=>{
  const state=createLifeSimulation();
  const obj=WORLD_OBJECTS.find(x=>x.id==='home-pc')!;
  let mind=createLifeAgentMind();
  const first=scoreMindObject(mind,obj,state);
  mind={...mind,boredom:.9,objectMemory:[{objectId:obj.id,uses:8,lastTick:state.tick,valence:.3,preference:.7}]};
  const repeated=scoreMindObject(mind,obj,state);
  assert.ok(repeated<first);
});

test('committed choices build habits and remember the last choice',()=>{
  const mind=commitLifeChoice(createLifeAgentMind(),'usar computador',12,'computer');
  assert.equal(mind.lastChoice,'usar computador');
  assert.equal(mind.lastChoiceTick,12);
  assert.ok((mind.habits.computer||0)>0);
});
