import {defaultLifNeuron,simulateSpikingNetwork,type ConductanceSynapse,type CurrentPulse,type SpikingNetworkExperiment} from '@/lib/neuroscience/biophysical-solver';

export type MinecraftNeuralAction='explore'|'forage'|'seek_social'|'avoid_threat'|'build';

export interface MinecraftNeuralObservation{
  seed:number;
  tick:number;
  hunger01:number;
  threat01:number;
  novelty01:number;
  socialDistance:number;
  shelterNeed01:number;
}

export type MinecraftNeuralProfile='generic'|'human'|'mouse'|'macaque'|'fly';

export interface MinecraftNeuralDecision{
  action:MinecraftNeuralAction;
  spikeCounts:Record<MinecraftNeuralAction,number>;
  totalSpikes:number;
  solver:'LIF-conductance';
  evidence:'simulated';
  profile:MinecraftNeuralProfile;
  transferPolicy:'profile-specific-synthetic-prior';
}

const ACTIONS:MinecraftNeuralAction[]=['explore','forage','seek_social','avoid_threat','build'];
const sensors=['hunger','threat','novelty','social','shelter'] as const;

function syn(pre:string,post:string,weightNS:number):ConductanceSynapse{
  return{
    id:pre+'>'+post,
    pre,post,receptor:'ampa',weightNS,delayMS:1.5,tauMS:5,reversalMV:0,
    provenance:{evidence:'derived',note:'Minecraft closed-loop controller mapping; not a measured biological synapse.'}
  };
}

export function minecraftNeuralDecision(obs:MinecraftNeuralObservation,profile:MinecraftNeuralProfile='generic'):MinecraftNeuralDecision{
  const neurons=[
    ...sensors.map(id=>defaultLifNeuron('sensor:'+id,{evidence:'derived',note:'Game sensor channel.'})),
    ...ACTIONS.map(id=>defaultLifNeuron('action:'+id,{evidence:'simulated',note:'Runtime motor-policy neuron.'}))
  ];
  const weights:Record<typeof sensors[number],Partial<Record<MinecraftNeuralAction,number>>>={
    hunger:{forage:12.5,explore:1.2},
    threat:{avoid_threat:13.5,seek_social:2.0},
    novelty:{explore:11.5,forage:1.0},
    social:{seek_social:12.0,build:1.4},
    shelter:{build:12.5,avoid_threat:1.6}
  };
  const profileGain:Record<MinecraftNeuralProfile,Record<MinecraftNeuralAction,number>>={
    generic:{explore:1,forage:1,seek_social:1,avoid_threat:1,build:1},
    human:{explore:.95,forage:1,seek_social:1.05,avoid_threat:1,build:1.18},
    mouse:{explore:1.02,forage:1.18,seek_social:.9,avoid_threat:1.18,build:.82},
    macaque:{explore:1.12,forage:.96,seek_social:1.08,avoid_threat:1.02,build:.92},
    fly:{explore:1.2,forage:1.02,seek_social:.82,avoid_threat:1.28,build:.65}
  };
  const synapses:ConductanceSynapse[]=[];
  for(const sensor of sensors)for(const action of ACTIONS){
    const w=weights[sensor][action]||0;
    if(w>0)synapses.push(syn('sensor:'+sensor,'action:'+action,w*profileGain[profile][action]));
  }
  const socialNeed=Math.max(0,Math.min(1,obs.socialDistance/24));
  const values:Record<typeof sensors[number],number>={
    hunger:obs.hunger01,
    threat:obs.threat01,
    novelty:obs.novelty01,
    social:socialNeed,
    shelter:obs.shelterNeed01
  };
  const stimuli:CurrentPulse[]=sensors.map(id=>({
    neuronId:'sensor:'+id,startMS:4,endMS:54,currentPA:170+values[id]*420,
    provenance:{evidence:'simulated',note:'Closed-loop Minecraft observation converted to injected current.'}
  }));
  const exp:SpikingNetworkExperiment={
    id:'minecraft-neural-'+obs.seed+'-'+obs.tick,
    seed:(obs.seed^Math.imul(obs.tick+1,2654435761))>>>0,
    dtMS:.5,
    durationMS:90,
    neurons,
    synapses,
    stimuli,
    metadata:{model:'LIF-conductance',claim:'numerical-neural-simulation',createdFrom:['minecraft-runtime-observation','controller-profile:'+profile,'synthetic-prior:not-biological-measurement']}
  };
  const result=simulateSpikingNetwork(exp);
  const spikeCounts=Object.fromEntries(ACTIONS.map(action=>[
    action,
    result.spikes.filter(s=>s.neuronId==='action:'+action).length
  ])) as Record<MinecraftNeuralAction,number>;
  const action=ACTIONS.slice().sort((a,b)=>spikeCounts[b]-spikeCounts[a]||ACTIONS.indexOf(a)-ACTIONS.indexOf(b))[0];
  return{action,spikeCounts,totalSpikes:result.spikes.length,solver:'LIF-conductance',evidence:'simulated',profile,transferPolicy:'profile-specific-synthetic-prior'};
}
