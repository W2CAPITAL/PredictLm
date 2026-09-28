import type {
  ConductanceSynapse,
  CurrentPulse,
  SpikingNetworkExperiment,
  SpikingSimulationResult
} from './biophysical-solver';

export interface AblationSpec{
  neuronIds?:string[];
  synapseIds?:string[];
  label:string;
}

export interface PairedExperimentResult{
  control:SpikingSimulationResult;
  intervention:SpikingSimulationResult;
  deltaFiringRateHz:Record<string,number>;
  interventionLabel:string;
}

export function injectCurrent(
  experiment:SpikingNetworkExperiment,
  pulse:CurrentPulse
):SpikingNetworkExperiment{
  return{
    ...experiment,
    stimuli:[...experiment.stimuli,pulse],
    metadata:{
      ...experiment.metadata,
      createdFrom:[...experiment.metadata.createdFrom,'current-injection:'+pulse.neuronId]
    }
  };
}

export function ablateExperiment(
  experiment:SpikingNetworkExperiment,
  spec:AblationSpec
):SpikingNetworkExperiment{
  const removedNeurons=new Set(spec.neuronIds||[]);
  const removedSynapses=new Set(spec.synapseIds||[]);
  return{
    ...experiment,
    id:experiment.id+'-ablation',
    neurons:experiment.neurons.filter(n=>!removedNeurons.has(n.id)),
    synapses:experiment.synapses.filter(s=>
      !removedSynapses.has(s.id)&&
      !removedNeurons.has(s.pre)&&
      !removedNeurons.has(s.post)
    ),
    stimuli:experiment.stimuli.filter(p=>!removedNeurons.has(p.neuronId)),
    recordVoltageFor:(experiment.recordVoltageFor||[]).filter(id=>!removedNeurons.has(id)),
    metadata:{
      ...experiment.metadata,
      createdFrom:[...experiment.metadata.createdFrom,'ablation:'+spec.label]
    }
  };
}

function seeded(seed:number){
  let x=(seed|0)||0x9e3779b9;
  return()=>{
    x^=x<<13;x^=x>>>17;x^=x<<5;
    return (x>>>0)/4294967296;
  };
}

export function shuffledSynapseControl(
  experiment:SpikingNetworkExperiment,
  seed=experiment.seed^0x51f15e
):SpikingNetworkExperiment{
  const rng=seeded(seed);
  const posts=experiment.synapses.map(s=>s.post);
  for(let i=posts.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [posts[i],posts[j]]=[posts[j],posts[i]];
  }
  const synapses:ConductanceSynapse[]=experiment.synapses.map((s,i)=>({
    ...s,
    id:s.id+':shuffle',
    post:posts[i],
    provenance:{
      evidence:'simulated',
      note:'Negative-control shuffled topology derived from '+s.id+'.'
    }
  }));
  return{
    ...experiment,
    id:experiment.id+'-shuffled-control',
    seed,
    synapses,
    metadata:{
      ...experiment.metadata,
      createdFrom:[...experiment.metadata.createdFrom,'negative-control:shuffled-synapses']
    }
  };
}

export function compareExperimentPair(
  control:SpikingSimulationResult,
  intervention:SpikingSimulationResult,
  interventionLabel:string
):PairedExperimentResult{
  const ids=new Set([...Object.keys(control.firingRateHz),...Object.keys(intervention.firingRateHz)]);
  const deltaFiringRateHz=Object.fromEntries(
    [...ids].map(id=>[id,(intervention.firingRateHz[id]||0)-(control.firingRateHz[id]||0)])
  );
  return{control,intervention,deltaFiringRateHz,interventionLabel};
}

function csvCell(value:string|number){
  const s=String(value);
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}

export function spikesToCsv(result:SpikingSimulationResult){
  return[
    'experiment_id,seed,neuron_id,time_ms',
    ...result.spikes.map(s=>[
      result.experimentId,result.seed,s.neuronId,s.timeMS
    ].map(csvCell).join(','))
  ].join('\n');
}

export function voltagesToCsv(result:SpikingSimulationResult){
  return[
    'experiment_id,seed,neuron_id,time_ms,voltage_mv',
    ...result.voltages.map(v=>[
      result.experimentId,result.seed,v.neuronId,v.timeMS,v.voltageMV
    ].map(csvCell).join(','))
  ].join('\n');
}

export function firingRatesToCsv(result:SpikingSimulationResult){
  return[
    'experiment_id,seed,neuron_id,firing_rate_hz',
    ...Object.entries(result.firingRateHz).map(([id,hz])=>[
      result.experimentId,result.seed,id,hz
    ].map(csvCell).join(','))
  ].join('\n');
}

export function paperFigurePayload(result:SpikingSimulationResult,caption:string){
  return{
    kind:'predictlm-neural-paper-figure',
    caption,
    units:{time:'ms',voltage:'mV',firingRate:'Hz'},
    parameters:{
      seed:result.seed,
      dtMS:result.dtMS,
      durationMS:result.durationMS,
      solver:result.reproducibility.solver
    },
    spikeRaster:result.spikes,
    voltageTraces:result.voltages,
    firingRateHz:result.firingRateHz
  };
}
