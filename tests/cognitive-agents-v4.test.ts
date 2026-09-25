import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceCognitivePopulation,
  createCognitivePopulation
} from '../src/lib/cognitive/agent-population';
import {
  applyCognitiveOutcome,
  captureConversationMemory,
  cognitiveDirectRecall,
  createCognitiveState
} from '../src/lib/cognitive/cognitive-workspace';
import {
  createLifeSimulation,
  simulationSummary,
  stepLifeSimulation
} from '../src/lib/life-simulation-engine';
import {
  createFlySimulationState,
  stepFlySimulation
} from '../src/lib/cognitive/fly-simulation';

test('cognitive population contains distinct simulated humans with inspectable public state',()=>{
  const initial=createCognitivePopulation();
  assert.ok(initial.agents.length>=4);
  assert.equal(new Set(initial.agents.map(x=>x.name)).size,initial.agents.length);

  const next=advanceCognitivePopulation(initial,'Quero entender um objeto estranho que apareceu no ambiente.');
  assert.equal(next.tick,1);
  for(const agent of next.agents){
    assert.ok(agent.currentGoal.length>0);
    assert.ok(agent.currentFocus.length>0);
    assert.ok(agent.publicReport.length>20);
    assert.ok(agent.episodic.length>=2);
    assert.ok(agent.confidence>=0&&agent.confidence<=1);
    assert.ok(agent.uncertainty>=0&&agent.uncertainty<=1);
  }
});

test('memory recall does not recursively store its generated recall as autobiographical truth',()=>{
  let state=createCognitiveState();
  state=captureConversationMemory(
    applyCognitiveOutcome(state,{
      prompt:'Ontem eu encontrei uma chave azul na simulação.',
      answer:'Esse evento ficou registrado no estado da simulação.'
    }),
    {
      prompt:'Ontem eu encontrei uma chave azul na simulação.',
      answer:'Esse evento ficou registrado no estado da simulação.',
      mode:'dual'
    }
  );
  const before=state.memory.autobiographical.length;
  const recall=cognitiveDirectRecall(state,'dual','O que você lembra da sua vida real?')||'';
  assert.match(recall,/estado de software|registrado/i);

  state=captureConversationMemory(state,{
    prompt:'O que você lembra da sua vida real?',
    answer:recall,
    mode:'dual'
  });
  assert.equal(state.memory.autobiographical.length,before+1);
  const newest=state.memory.autobiographical[0]?.text||'';
  assert.match(newest,/consultado sem regravar/i);
  assert.doesNotMatch(newest,/Estados cognitivos simulados atuais/i);
});

test('human autonomy keeps intentions for multiple ticks and records why it chose them',()=>{
  let state=createLifeSimulation('Lia',431);
  const destinations:string[]=[];
  for(let i=0;i<12;i++){
    state=stepLifeSimulation(state,10);
    destinations.push(state.autonomy?.destination||'');
    assert.ok((state.autonomy?.decisionReason||'').length>10);
  }
  const unique=new Set(destinations);
  assert.ok(unique.size>=1);
  assert.ok(destinations.some((value,index)=>index>0&&value===destinations[index-1]));
  assert.match(simulationSummary(state),/Decisão autônoma:/);
});

test('fly autonomy uses target commitment rather than a fixed circular phase loop',()=>{
  let fly=createFlySimulationState();
  const decisions:string[]=[];
  const targets:string[]=[];
  for(let i=0;i<20;i++){
    fly=stepFlySimulation(fly,{
      personX:690,
      personY:420,
      personAction:'lendo em silêncio',
      personLocation:'Biblioteca'
    });
    decisions.push(fly.decision);
    targets.push(fly.targetLabel);
    assert.ok(Number.isFinite(fly.targetX));
    assert.ok(Number.isFinite(fly.targetY));
  }
  assert.ok(decisions.every(Boolean));
  assert.ok(new Set(targets).size>=1);
  assert.ok(fly.targetTicks>=0);
});
