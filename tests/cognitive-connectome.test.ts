import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceCognitiveWorkspace,
  applyCognitiveOutcome,
  applyMappedSubsetEvidence,
  captureConversationMemory,
  cognitiveDirectRecall,
  cognitivePromptContext,
  createCognitiveState
} from '../src/lib/cognitive/cognitive-workspace';
import {
  parseFlyWireConnectionsCsv,
  parseH01EdgeSubsetCsv,
  summarizeConnectomeEdges
} from '../src/lib/cognitive/connectome-import';
import {
  FLYWIRE_FAFB_V783,
  H01_HUMAN_CORTEX
} from '../src/lib/cognitive/connectome-provenance';

test('connectome provenance uses real mapped FlyWire and H01 scales',()=>{
  assert.equal(FLYWIRE_FAFB_V783.release,'v783');
  assert.equal(FLYWIRE_FAFB_V783.neuronsApprox,139255);
  assert.equal(FLYWIRE_FAFB_V783.synapsesApprox,54500000);
  assert.match(FLYWIRE_FAFB_V783.scope,/whole adult female fly brain/i);

  assert.equal(H01_HUMAN_CORTEX.neuronsApprox,16000);
  assert.equal(H01_HUMAN_CORTEX.synapsesApprox,150000000);
  assert.match(H01_HUMAN_CORTEX.scope,/1 mm³/i);
  assert.match(H01_HUMAN_CORTEX.scope,/not a whole human brain/i);
});

test('dual connectome workspace advances fly and human cores independently',()=>{
  const initial=createCognitiveState();
  const next=advanceCognitiveWorkspace(initial,'Verifique este fato e me diga se devo agir agora.');
  assert.equal(next.tick,1);
  assert.equal(next.fly.tick,1);
  assert.equal(next.human.tick,1);
  assert.ok(next.workspace.broadcast.length>=3);
  assert.ok(next.workspace.uncertainty>=0&&next.workspace.uncertainty<=1);
  assert.ok(next.fly.mappedSubgraph.neuronScale===139255);
  assert.ok(next.human.mappedFragment.completeHumanBrain===false);
});

test('FlyWire CSV subset is parsed as real weighted connectivity evidence',()=>{
  const csv=[
    'pre_root_id,post_root_id,neuropil,syn_count,nt_type',
    '7201,7202,MB,14,acetylcholine',
    '7202,7203,CX,9,GABA',
    '7203,7201,CX,7,glutamate'
  ].join('\n');
  const edges=parseFlyWireConnectionsCsv(csv);
  const summary=summarizeConnectomeEdges(edges);
  assert.equal(summary.nodes,3);
  assert.equal(summary.edges,3);
  assert.equal(summary.totalWeight,30);
  assert.equal(summary.regions,2);
  assert.ok(summary.excitation>0);
  assert.ok(summary.inhibition>0);

  const state=applyMappedSubsetEvidence(createCognitiveState(),'fly',summary);
  assert.equal(state.mappedEvidence.fly?.source,'imported-real-subset');
  assert.equal(state.mappedEvidence.fly?.edges,3);
  assert.match(cognitivePromptContext(state),/Imported FlyWire real-subset evidence/);
});

test('H01 CSV subset adjusts excitation and inhibition in the human controller',()=>{
  const csv=[
    'pre_id,post_id,syn_count,type,layer',
    'h1,h2,20,excitatory,L3',
    'h3,h2,10,inhibitory,L2',
    'h2,h4,30,excitatory,L5'
  ].join('\n');
  const edges=parseH01EdgeSubsetCsv(csv);
  const summary=summarizeConnectomeEdges(edges);
  assert.equal(summary.nodes,4);
  assert.equal(summary.edges,3);
  assert.equal(summary.totalWeight,60);
  assert.ok(summary.excitation>summary.inhibition);

  const before=createCognitiveState();
  const after=applyMappedSubsetEvidence(before,'human',summary);
  assert.equal(after.mappedEvidence.human?.source,'imported-real-subset');
  assert.ok(after.human.excitation>before.human.excitation);
  assert.match(cognitivePromptContext(after),/Imported H01 real-subset evidence/);
});

test('answer outcome feeds prediction error and episodic memory',()=>{
  const pre=advanceCognitiveWorkspace(createCognitiveState(),'Explique de forma simples.');
  const good=applyCognitiveOutcome(pre,{
    prompt:'Explique de forma simples.',
    answer:'Claro. A ideia principal é esta: primeiro entendemos o problema e depois aplicamos a solução em etapas.'
  });
  assert.equal(good.memory.episodic.length,1);
  assert.ok(good.memory.episodic[0].reward>0.5);

  const bad=applyCognitiveOutcome(good,{
    prompt:'Explique novamente.',
    answer:'Não consegui. Provider falhou e runtime está indisponível.'
  });
  assert.equal(bad.memory.episodic.length,2);
  assert.ok(bad.memory.episodic[1].predictionError>=bad.memory.episodic[1].reward);
});


test('provider identity never replaces the cognitive agent identity',()=>{
  let state=createCognitiveState();
  state=captureConversationMemory(
    applyCognitiveOutcome(state,{
      prompt:'Eu gosto de batatas',
      answer:'Boa. Batatas podem ser preparadas de várias formas.'
    }),
    {prompt:'Eu gosto de batatas',answer:'Boa. Batatas podem ser preparadas de várias formas.',mode:'dual'}
  );
  const identity=cognitiveDirectRecall(state,'dual','Quem é você?')||'';
  assert.match(identity,/PredictLM Cognitive Lab/);
  assert.doesNotMatch(identity,/Meu nome é Nemotron/i);
  const flyIdentity=cognitiveDirectRecall(state,'fly','Qual é seu nome?')||'';
  assert.match(flyIdentity,/Mosca Predict/);
});

test('memory questions recall persistent autobiographical and episodic state',()=>{
  let state=createCognitiveState();
  state=captureConversationMemory(
    applyCognitiveOutcome(state,{
      prompt:'Meu nome é Davi e eu gosto de macacos',
      answer:'Vou lembrar disso.'
    }),
    {prompt:'Meu nome é Davi e eu gosto de macacos',answer:'Vou lembrar disso.',mode:'dual'}
  );
  const recall=cognitiveDirectRecall(state,'dual','Qual sua lembrança?')||'';
  assert.match(recall,/Davi/i);
  assert.match(recall,/Episódio|Conversa/i);
  assert.ok(state.memory.autobiographical.length>=2);
  assert.ok(state.consciousAccess.memoryAccess>0);
});

test('functional conscious-access map combines human and fly-derived controls',()=>{
  const state=advanceCognitiveWorkspace(createCognitiveState(),'Estou vendo algo novo e preciso decidir o que fazer.');
  for(const value of Object.values(state.consciousAccess)){
    assert.ok(value>=0&&value<=1);
  }
  const context=cognitivePromptContext(state);
  assert.match(context,/CONSCIOUS ACCESS MAP/);
  assert.match(context,/Memória associativa|associative/i);
  assert.match(context,/FlyWire-whole-fly/);
});
