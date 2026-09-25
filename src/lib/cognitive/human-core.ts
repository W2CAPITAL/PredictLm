import {advanceNeuroState,createNeuroState,type NeuroState} from '../neurocore';
import {H01_HUMAN_CORTEX} from './connectome-provenance';

export interface HumanCoreState{
  version:1;
  tick:number;
  neuro:NeuroState;
  corticalLayers:{L1:number;L2:number;L3:number;L4:number;L5:number;L6:number};
  excitation:number;
  inhibition:number;
  recurrentIntegration:number;
  strongInputGain:number;
  predictiveError:number;
  executiveControl:number;
  workingMemory:number;
  metacognition:number;
  mappedFragment:{
    dataset:string;
    scope:string;
    neuronScale:number;
    synapseScale:number;
    completeHumanBrain:false;
  };
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const norm=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();

export function createHumanCoreState():HumanCoreState{
  return {
    version:1,
    tick:0,
    neuro:createNeuroState(),
    corticalLayers:{L1:.24,L2:.36,L3:.42,L4:.38,L5:.44,L6:.4},
    excitation:.56,
    inhibition:.44,
    recurrentIntegration:.46,
    strongInputGain:.18,
    predictiveError:.36,
    executiveControl:.52,
    workingMemory:.48,
    metacognition:.45,
    mappedFragment:{
      dataset:H01_HUMAN_CORTEX.dataset,
      scope:H01_HUMAN_CORTEX.scope,
      neuronScale:H01_HUMAN_CORTEX.neuronsApprox,
      synapseScale:H01_HUMAN_CORTEX.synapsesApprox,
      completeHumanBrain:false
    }
  };
}

export function advanceHumanCore(previous:HumanCoreState|undefined,prompt:string):HumanCoreState{
  const prev=previous?.version===1?previous:createHumanCoreState();
  const neuro=advanceNeuroState(prev.neuro,prompt);
  const q=norm(prompt);
  const factual=/\b(quem|qual|explique|verdade|fato|confirme|fonte|sabia|e verdade|é verdade)\b/.test(q)?1:0;
  const planning=/\b(crie|faca|faça|planeje|implemente|integre|corrija|como posso|passo)\b/.test(q)?1:0;
  const social=/\b(namora|gosta|amor|pessoa|amigo|relacao|relação|sentimento)\b/.test(q)?1:0;
  const ambiguity=/\b(talvez|acho|sera|será|duvida|dúvida|nao sei|não sei)\b/.test(q)?1:0;
  const load=clamp(.18+prompt.length/1200+factual*.18+planning*.22);

  const excitation=clamp(prev.excitation*.64+neuro.circuits.salience*.18+neuro.circuits.planning*.12+load*.06);
  const inhibition=clamp(prev.inhibition*.6+neuro.circuits.inhibition*.28+neuro.circuits.threat*.12);
  const recurrentIntegration=clamp(prev.recurrentIntegration*.56+neuro.circuits.workingMemory*.18+neuro.circuits.planning*.16+neuro.circuits.attention*.1);
  const strongInputGain=clamp(prev.strongInputGain*.72+Math.max(factual,planning,social)*.18+neuro.circuits.salience*.1);
  const predictiveError=clamp(prev.predictiveError*.62+neuro.uncertainty*.24+ambiguity*.14);
  const executiveControl=clamp(prev.executiveControl*.58+neuro.circuits.planning*.24+inhibition*.18);
  const workingMemory=clamp(prev.workingMemory*.52+neuro.circuits.workingMemory*.38+load*.1);
  const metacognition=clamp(prev.metacognition*.58+(1-neuro.confidence)*.18+factual*.14+ambiguity*.1);

  const layerDrive={
    L1:clamp(prev.corticalLayers.L1*.75+neuro.circuits.sensory*.25),
    L2:clamp(prev.corticalLayers.L2*.68+social*.12+neuro.circuits.attention*.2),
    L3:clamp(prev.corticalLayers.L3*.62+recurrentIntegration*.28+neuro.circuits.workingMemory*.1),
    L4:clamp(prev.corticalLayers.L4*.64+neuro.circuits.sensory*.22+factual*.14),
    L5:clamp(prev.corticalLayers.L5*.58+neuro.circuits.action*.22+planning*.2),
    L6:clamp(prev.corticalLayers.L6*.62+executiveControl*.24+predictiveError*.14)
  };

  return {
    ...prev,
    tick:prev.tick+1,
    neuro,
    corticalLayers:layerDrive,
    excitation,
    inhibition,
    recurrentIntegration,
    strongInputGain,
    predictiveError,
    executiveControl,
    workingMemory,
    metacognition
  };
}

export function humanCoreContext(state:HumanCoreState){
  return [
    'HUMAN CONNECTOME CORE — cortical controller derived from the H01 mapped human temporal-cortex fragment.',
    'H01 is approximately 1 mm³ of real human cortex, not a complete mapped human brain.',
    'Working-memory drive '+Math.round(state.workingMemory*100)+'%; executive control '+Math.round(state.executiveControl*100)+'%; metacognition '+Math.round(state.metacognition*100)+'%.',
    'Excitation '+Math.round(state.excitation*100)+'%; inhibition '+Math.round(state.inhibition*100)+'%; recurrent integration '+Math.round(state.recurrentIntegration*100)+'%; prediction error '+Math.round(state.predictiveError*100)+'%.',
    'Use recurrent integration for context, inhibition to suppress irrelevant associations, executive control for ordered plans, and prediction error to reduce false certainty.',
    'Do not claim this software state is biological consciousness or a full simulation of the human cortex.'
  ].join('\n');
}
