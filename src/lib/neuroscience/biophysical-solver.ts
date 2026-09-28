export type NeuroEvidenceClass='measured'|'derived'|'simulated'|'unknown';
export type ReceptorKind='ampa'|'nmda'|'gaba';

export interface ScientificProvenance{
  evidence:NeuroEvidenceClass;
  dataset?:string;
  release?:string;
  sourceUrl?:string;
  doi?:string;
  recordId?:string;
  confidence?:number;
  note?:string;
}

export interface LifNeuronParams{
  id:string;
  capacitancePF:number;
  leakNS:number;
  restMV:number;
  resetMV:number;
  thresholdMV:number;
  refractoryMS:number;
  noiseStdPA:number;
  provenance:ScientificProvenance;
}

export interface ConductanceSynapse{
  id:string;
  pre:string;
  post:string;
  receptor:ReceptorKind;
  weightNS:number;
  delayMS:number;
  tauMS:number;
  reversalMV:number;
  plasticity?:{
    kind:'stdp';
    aPlus:number;
    aMinus:number;
    tauPreMS:number;
    tauPostMS:number;
    minWeightNS:number;
    maxWeightNS:number;
  };
  provenance:ScientificProvenance;
}

export interface CurrentPulse{
  neuronId:string;
  startMS:number;
  endMS:number;
  currentPA:number;
  provenance:ScientificProvenance;
}

export interface SpikingNetworkExperiment{
  id:string;
  seed:number;
  dtMS:number;
  durationMS:number;
  neurons:LifNeuronParams[];
  synapses:ConductanceSynapse[];
  stimuli:CurrentPulse[];
  recordVoltageFor?:string[];
  metadata:{
    species?:string;
    model:'LIF-conductance';
    claim:'numerical-neural-simulation';
    createdFrom:string[];
  };
}

export interface SpikeEvent{neuronId:string;timeMS:number}
export interface VoltageSample{neuronId:string;timeMS:number;voltageMV:number}
export interface SpikingSimulationResult{
  experimentId:string;
  seed:number;
  dtMS:number;
  durationMS:number;
  spikes:SpikeEvent[];
  voltages:VoltageSample[];
  firingRateHz:Record<string,number>;
  finalVoltageMV:Record<string,number>;
  finalSynapticWeightNS:Record<string,number>;
  reproducibility:{
    deterministicGivenSeed:boolean;
    solver:'Euler-explicit';
    units:'mV, ms, nS, pA, pF';
  };
}

function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}

function seeded(seed:number){
  let x=(seed|0)||0x6d2b79f5;
  return()=>{
    x^=x<<13;x^=x>>>17;x^=x<<5;
    return (x>>>0)/4294967296;
  };
}

function gaussian(rng:()=>number){
  const u1=Math.max(1e-12,rng()),u2=Math.max(1e-12,rng());
  return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
}

function validateExperiment(exp:SpikingNetworkExperiment){
  if(!Number.isFinite(exp.dtMS)||exp.dtMS<=0||exp.dtMS>5)throw new Error('dtMS must be >0 and <=5 ms');
  if(!Number.isFinite(exp.durationMS)||exp.durationMS<=0)throw new Error('durationMS must be positive');
  const ids=new Set(exp.neurons.map(n=>n.id));
  if(ids.size!==exp.neurons.length)throw new Error('neuron ids must be unique');
  for(const n of exp.neurons){
    if(n.capacitancePF<=0||n.leakNS<=0||n.refractoryMS<0)throw new Error('invalid LIF parameters for '+n.id);
  }
  for(const s of exp.synapses){
    if(!ids.has(s.pre)||!ids.has(s.post))throw new Error('synapse references unknown neuron: '+s.id);
    if(s.delayMS<0||s.tauMS<=0||s.weightNS<0)throw new Error('invalid synapse parameters: '+s.id);
  }
}

export function simulateSpikingNetwork(exp:SpikingNetworkExperiment):SpikingSimulationResult{
  validateExperiment(exp);
  const rng=seeded(exp.seed);
  const steps=Math.ceil(exp.durationMS/exp.dtMS);
  const neurons=new Map(exp.neurons.map(n=>[n.id,n]));
  const voltage=new Map(exp.neurons.map(n=>[n.id,n.restMV]));
  const refractoryUntil=new Map(exp.neurons.map(n=>[n.id,-Infinity]));
  const conductance=new Map<string,{ampa:number;nmda:number;gaba:number}>();
  const synWeight=new Map(exp.synapses.map(s=>[s.id,s.weightNS]));
  const preTrace=new Map(exp.neurons.map(n=>[n.id,0]));
  const postTrace=new Map(exp.neurons.map(n=>[n.id,0]));
  const outgoing=new Map<string,ConductanceSynapse[]>();
  for(const n of exp.neurons)conductance.set(n.id,{ampa:0,nmda:0,gaba:0});
  for(const s of exp.synapses)outgoing.set(s.pre,[...(outgoing.get(s.pre)||[]),s]);

  const scheduled=new Map<number,ConductanceSynapse[]>();
  const spikes:SpikeEvent[]=[];
  const voltages:VoltageSample[]=[];
  const record=new Set(exp.recordVoltageFor||[]);
  const spikeCount:Record<string,number>=Object.fromEntries(exp.neurons.map(n=>[n.id,0]));

  const receptorTau=(id:string,receptor:ReceptorKind)=>{
    const list=exp.synapses.filter(s=>s.post===id&&s.receptor===receptor);
    return list.length?list.reduce((a,b)=>a+b.tauMS,0)/list.length:(receptor==='gaba'?10:receptor==='nmda'?60:5);
  };

  for(let step=0;step<steps;step++){
    const t=step*exp.dtMS;

    for(const n of exp.neurons){
      const g=conductance.get(n.id)!;
      g.ampa*=Math.exp(-exp.dtMS/receptorTau(n.id,'ampa'));
      g.nmda*=Math.exp(-exp.dtMS/receptorTau(n.id,'nmda'));
      g.gaba*=Math.exp(-exp.dtMS/receptorTau(n.id,'gaba'));
      preTrace.set(n.id,(preTrace.get(n.id)||0)*Math.exp(-exp.dtMS/20));
      postTrace.set(n.id,(postTrace.get(n.id)||0)*Math.exp(-exp.dtMS/20));
    }

    for(const s of scheduled.get(step)||[]){
      const g=conductance.get(s.post)!;
      g[s.receptor]+=synWeight.get(s.id)??s.weightNS;
      if(s.plasticity){
        const w=synWeight.get(s.id)??s.weightNS;
        const dw=s.plasticity.aPlus*(preTrace.get(s.pre)||0);
        synWeight.set(s.id,clamp(w+dw,s.plasticity.minWeightNS,s.plasticity.maxWeightNS));
      }
    }
    scheduled.delete(step);

    for(const n of exp.neurons){
      if(t<refractoryUntil.get(n.id)!){
        voltage.set(n.id,n.resetMV);
        if(record.has(n.id))voltages.push({neuronId:n.id,timeMS:t,voltageMV:n.resetMV});
        continue;
      }

      const v=voltage.get(n.id)!;
      const g=conductance.get(n.id)!;
      const pulsePA=exp.stimuli.reduce((sum,p)=>sum+(p.neuronId===n.id&&t>=p.startMS&&t<p.endMS?p.currentPA:0),0);
      const noisePA=n.noiseStdPA>0?gaussian(rng)*n.noiseStdPA:0;
      const synPA=
        g.ampa*(0-v)+
        g.nmda*(0-v)+
        g.gaba*(-75-v);
      const leakPA=-n.leakNS*(v-n.restMV);
      const dv=exp.dtMS*(leakPA+synPA+pulsePA+noisePA)/n.capacitancePF;
      const nextV=v+dv;

      if(nextV>=n.thresholdMV){
        spikes.push({neuronId:n.id,timeMS:t});
        spikeCount[n.id]=(spikeCount[n.id]||0)+1;
        voltage.set(n.id,n.resetMV);
        refractoryUntil.set(n.id,t+n.refractoryMS);
        preTrace.set(n.id,(preTrace.get(n.id)||0)+1);
        postTrace.set(n.id,(postTrace.get(n.id)||0)+1);

        for(const syn of outgoing.get(n.id)||[]){
          const delaySteps=Math.max(1,Math.round(syn.delayMS/exp.dtMS));
          const arrival=step+delaySteps;
          scheduled.set(arrival,[...(scheduled.get(arrival)||[]),syn]);
          if(syn.plasticity){
            const w=synWeight.get(syn.id)??syn.weightNS;
            const dw=-syn.plasticity.aMinus*(postTrace.get(syn.post)||0);
            synWeight.set(syn.id,clamp(w+dw,syn.plasticity.minWeightNS,syn.plasticity.maxWeightNS));
          }
        }
      }else{
        voltage.set(n.id,nextV);
      }

      if(record.has(n.id))voltages.push({neuronId:n.id,timeMS:t,voltageMV:voltage.get(n.id)!});
    }
  }

  const seconds=exp.durationMS/1000;
  const firingRateHz=Object.fromEntries(exp.neurons.map(n=>[n.id,(spikeCount[n.id]||0)/seconds]));
  return{
    experimentId:exp.id,
    seed:exp.seed,
    dtMS:exp.dtMS,
    durationMS:exp.durationMS,
    spikes,
    voltages,
    firingRateHz,
    finalVoltageMV:Object.fromEntries([...voltage.entries()]),
    finalSynapticWeightNS:Object.fromEntries([...synWeight.entries()]),
    reproducibility:{deterministicGivenSeed:true,solver:'Euler-explicit',units:'mV, ms, nS, pA, pF'}
  };
}

export function defaultLifNeuron(id:string,provenance:ScientificProvenance={evidence:'derived'}):LifNeuronParams{
  return{
    id,
    capacitancePF:200,
    leakNS:10,
    restMV:-65,
    resetMV:-68,
    thresholdMV:-50,
    refractoryMS:2,
    noiseStdPA:0,
    provenance
  };
}
