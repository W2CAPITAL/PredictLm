import test from 'node:test';
import assert from 'node:assert/strict';
import {createLifeAgentState,executeNextLifeAgentAction,startLifeAgentPlan,type LifeAgentPlan} from '../src/lib/life-simulation-agent';
import {createLifeSimulation} from '../src/lib/life-simulation-engine';

test('move actions advance visibly across multiple executor ticks instead of teleporting',()=>{
  const state=createLifeSimulation();
  const agent=createLifeAgentState();
  const plan:LifeAgentPlan={
    id:'p-test',objective:'ir trabalhar',source:'deterministic',
    actions:[{id:'a-1',type:'move',target:'Trabalho'}],cursor:0,status:'planned',summary:'teste',createdAt:1
  };
  let a=startLifeAgentPlan(agent,plan);
  const x0=state.person.x,y0=state.person.y;
  const first=executeNextLifeAgentAction(state,a)!;
  assert.equal(first.completed,false);
  assert.equal(first.agent.plan?.cursor,0);
  assert.notEqual(first.state.person.x,x0);
  assert.notEqual(first.state.person.y,y0);
  assert.notEqual(first.state.person.location,'Trabalho');
});

test('approach_object walks toward the object and use_object leaves visible interaction state',()=>{
  let state=createLifeSimulation();
  state.person.location='Trabalho';
  state.person.x=720;state.person.y=120;
  let agent=createLifeAgentState();
  const plan:LifeAgentPlan={
    id:'p-object',objective:'usar computador',source:'deterministic',
    actions:[
      {id:'a-1',type:'approach_object',objectId:'work-pc1'},
      {id:'a-2',type:'use_object',objectId:'work-pc1',minutes:30}
    ],cursor:0,status:'planned',summary:'teste',createdAt:1
  };
  agent=startLifeAgentPlan(agent,plan);
  let guard=0;
  while(agent.plan?.cursor===0&&guard++<20){
    const result=executeNextLifeAgentAction(state,agent)!;
    state=result.state;agent=result.agent;
  }
  assert.equal(agent.plan?.cursor,1);
  const used=executeNextLifeAgentAction(state,agent)!;
  assert.equal(used.completed,true);
  assert.equal(used.state.objectInteraction?.objectId,'work-pc1');
  assert.match(used.state.objectInteraction?.verb||'',/trabalho|tarefas|produzindo/i);
  assert.ok((used.state.objectInteraction?.durationMs||0)>=5000);
  assert.ok((used.state.objectInteraction?.expiresAt||0)>(used.state.objectInteraction?.startedAt||0));
});
