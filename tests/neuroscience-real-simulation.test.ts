import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultLifNeuron,simulateSpikingNetwork,type SpikingNetworkExperiment} from '../src/lib/neuroscience/biophysical-solver';
import {minecraftNeuralDecision} from '../src/lib/simulation/minecraft-neural-controller';
import {SCIENTIFIC_DATASETS,buildScientificRunManifest} from '../src/lib/neuroscience/scientific-runtime';
import {
  ablateExperiment,
  firingRatesToCsv,
  injectCurrent,
  paperFigurePayload,
  shuffledSynapseControl,
  spikesToCsv
} from '../src/lib/neuroscience/scientific-experiments';

function experiment(seed=7):SpikingNetworkExperiment{
  return{
    id:'lif-regression',
    seed,
    dtMS:.5,
    durationMS:80,
    neurons:[defaultLifNeuron('a'),defaultLifNeuron('b')],
    synapses:[{
      id:'a>b',pre:'a',post:'b',receptor:'ampa',weightNS:4,delayMS:1.5,tauMS:5,reversalMV:0,
      provenance:{evidence:'derived',note:'test synapse'}
    }],
    stimuli:[{neuronId:'a',startMS:5,endMS:55,currentPA:420,provenance:{evidence:'simulated'}}],
    recordVoltageFor:['a','b'],
    metadata:{model:'LIF-conductance',claim:'numerical-neural-simulation',createdFrom:['unit-test']}
  };
}

test('LIF solver is deterministic for a documented seed and uses physical units',()=>{
  const a=simulateSpikingNetwork(experiment(42));
  const b=simulateSpikingNetwork(experiment(42));
  assert.deepEqual(a.spikes,b.spikes);
  assert.deepEqual(a.finalVoltageMV,b.finalVoltageMV);
  assert.equal(a.reproducibility.units,'mV, ms, nS, pA, pF');
  assert.ok(a.spikes.some(s=>s.neuronId==='a'));
});

test('scientific manifest keeps measured, simulated and unresolved claims separate',()=>{
  const exp=experiment(9);
  exp.neurons[0].provenance={evidence:'measured',dataset:'flywire-fafb-v783',recordId:'example-neuron-id'};
  const manifest=buildScientificRunManifest(exp);
  assert.ok(manifest.datasetIds.includes('flywire-fafb-v783'));
  assert.ok(manifest.claims.measured.length>0);
  assert.ok(manifest.claims.simulated.includes('membrane voltage'));
  assert.ok(manifest.claims.unresolved.some(x=>x.includes('whole-brain human')));
});

test('dataset manifest refuses whole-brain claims for H01 and MICrONS',()=>{
  const h01=SCIENTIFIC_DATASETS.find(x=>x.id==='h01-human-cortex')!;
  const microns=SCIENTIFIC_DATASETS.find(x=>x.id==='microns-cortical-mm3')!;
  assert.match(h01.scope,/1 mm/);
  assert.match(h01.limitation,/not a whole human brain/);
  assert.match(microns.limitation,/not a whole mouse brain/);
});

test('Minecraft neural controller is an actual deterministic spike simulation',()=>{
  const input={seed:123,tick:4,hunger01:.95,threat01:.1,novelty01:.2,socialDistance:3,shelterNeed01:.1};
  const a=minecraftNeuralDecision(input);
  const b=minecraftNeuralDecision(input);
  assert.deepEqual(a,b);
  assert.equal(a.solver,'LIF-conductance');
  assert.equal(a.evidence,'simulated');
  assert.ok(a.totalSpikes>0);
  assert.equal(a.action,'forage');
});


test('scientific experiment tools support current injection, ablation, negative controls and export',()=>{
  const base=experiment(17);
  const injected=injectCurrent(base,{
    neuronId:'b',startMS:10,endMS:30,currentPA:250,
    provenance:{evidence:'simulated',note:'standard current injection test'}
  });
  assert.equal(injected.stimuli.length,base.stimuli.length+1);

  const ablated=ablateExperiment(injected,{neuronIds:['a'],label:'remove-a'});
  assert.equal(ablated.neurons.some(n=>n.id==='a'),false);
  assert.equal(ablated.synapses.some(s=>s.pre==='a'||s.post==='a'),false);

  const shuffled=shuffledSynapseControl(base,99);
  assert.equal(shuffled.synapses.length,base.synapses.length);
  assert.match(shuffled.metadata.createdFrom.join(' '),/negative-control/);

  const result=simulateSpikingNetwork(injected);
  assert.match(spikesToCsv(result),/^experiment_id,seed,neuron_id,time_ms/m);
  assert.match(firingRatesToCsv(result),/firing_rate_hz/);
  const figure=paperFigurePayload(result,'Current injection response');
  assert.equal(figure.units.voltage,'mV');
  assert.equal(figure.parameters.seed,17);
});
