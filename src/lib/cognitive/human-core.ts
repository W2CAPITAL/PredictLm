import {advanceNeuroState,createNeuroState,type NeuroState} from '../neurocore';
import {H01_HUMAN_CORTEX,MACAQUE_CORTEX_SPATIAL_ATLAS} from './connectome-provenance';
import {createMacaqueCoreState,type MacaqueCoreState} from './macaque-core';

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
  crossSpeciesProxy:{
    enabled:true;
    sourceDataset:string;
    sourceSpecies:string;
    proxyScope:string;
    proxyWeight:number;
    visualHierarchy:number;
    somatosensoryHierarchy:number;
    corticalRegionalIntegration:number;
    unresolved:string[];
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
    },
    crossSpeciesProxy:{
      enabled:true,
      sourceDataset:MACAQUE_CORTEX_SPATIAL_ATLAS.dataset,
      sourceSpecies:MACAQUE_CORTEX_SPATIAL_ATLAS.species,
      proxyScope:'Homologous broad cortical organization outside the H01 fragment; provenance remains macaque-proxy.',
      proxyWeight:.18,
      visualHierarchy:.5,
      somatosensoryHierarchy:.5,
      corticalRegionalIntegration:.47,
      unresolved:[
        'whole-brain human synaptic connectome',
        'human subcortical structures not covered by the macaque cortical atlas',
        'human autobiographical memories or thoughts'
      ]
    }
  };
}

export function advanceHumanCore(previous:HumanCoreState|undefined,prompt:string,macaqueInput?:MacaqueCoreState):HumanCoreState{
  const prev=previous?.version===1?previous:createHumanCoreState();
  const macaque=macaqueInput?.version===1?macaqueInput:createMacaqueCoreState();
  const proxyWeight=clamp(prev.crossSpeciesProxy?.proxyWeight??.18,0,.28);
  const neuro=advanceNeuroState(prev.neuro,prompt);
  const q=norm(prompt);
  const factual=/\b(quem|qual|explique|verdade|fato|confirme|fonte|sabia|e verdade|é verdade)\b/.test(q)?1:0;
  const planning=/\b(crie|faca|faça|planeje|implemente|integre|corrija|como posso|passo)\b/.test(q)?1:0;
  const social=/\b(namora|gosta|amor|pessoa|amigo|relacao|relação|sentimento)\b/.test(q)?1:0;
  const ambiguity=/\b(talvez|acho|sera|será|duvida|dúvida|nao sei|não sei)\b/.test(q)?1:0;
  const load=clamp(.18+prompt.length/1200+factual*.18+planning*.22);

  const excitation=clamp(prev.excitation*.64+neuro.circuits.salience*.18+neuro.circuits.planning*.12+load*.06);
  const inhibition=clamp(prev.inhibition*.6+neuro.circuits.inhibition*.28+neuro.circuits.threat*.12);
  const recurrentIntegration=clamp(prev.recurrentIntegration*.52+neuro.circuits.workingMemory*.17+neuro.circuits.planning*.15+neuro.circuits.attention*.09+macaque.regionalIntegration*.07);
  const strongInputGain=clamp(prev.strongInputGain*.72+Math.max(factual,planning,social)*.18+neuro.circuits.salience*.1);
  const predictiveError=clamp(prev.predictiveError*.62+neuro.uncertainty*.24+ambiguity*.14);
  const executiveControl=clamp(prev.executiveControl*.58+neuro.circuits.planning*.24+inhibition*.18);
  const workingMemory=clamp(prev.workingMemory*.52+neuro.circuits.workingMemory*.38+load*.1);
  const metacognition=clamp(prev.metacognition*.58+(1-neuro.confidence)*.18+factual*.14+ambiguity*.1);

  const layerDrive={
    L1:clamp(prev.corticalLayers.L1*.72+neuro.circuits.sensory*.22+macaque.corticalLayers.L1*proxyWeight*.06),
    L2:clamp(prev.corticalLayers.L2*.64+social*.11+neuro.circuits.attention*.18+macaque.corticalLayers.L2*proxyWeight*.07),
    L3:clamp(prev.corticalLayers.L3*.59+recurrentIntegration*.26+neuro.circuits.workingMemory*.09+macaque.corticalLayers.L3*proxyWeight*.06),
    L4:clamp(prev.corticalLayers.L4*.57+neuro.circuits.sensory*.2+factual*.12+macaque.corticalLayers.L4*proxyWeight*.07+macaque.primateSpecificL4*proxyWeight*.04),
    L5:clamp(prev.corticalLayers.L5*.55+neuro.circuits.action*.2+planning*.18+macaque.corticalLayers.L5*proxyWeight*.07),
    L6:clamp(prev.corticalLayers.L6*.59+executiveControl*.22+predictiveError*.13+macaque.corticalLayers.L6*proxyWeight*.06)
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
    metacognition,
    crossSpeciesProxy:{
      ...prev.crossSpeciesProxy,
      enabled:true,
      sourceDataset:MACAQUE_CORTEX_SPATIAL_ATLAS.dataset,
      sourceSpecies:MACAQUE_CORTEX_SPATIAL_ATLAS.species,
      proxyWeight,
      visualHierarchy:macaque.visualHierarchy,
      somatosensoryHierarchy:macaque.somatosensoryHierarchy,
      corticalRegionalIntegration:macaque.regionalIntegration
    }
  };
}

export function humanCoreContext(state:HumanCoreState){
  return [
    'HUMAN CONNECTOME CORE — cortical controller derived from the H01 mapped human temporal-cortex fragment.',
    'H01 is approximately 1 mm³ of real human cortex, not a complete mapped human brain.',
    'Where H01 has no broad cortical coverage, the controller may use a low-weight macaque cortical proxy from the 143-region/264-cell-type atlas. Macaque-derived values remain explicitly labeled proxy data, never direct human measurements.',
    'Macaque proxy weight '+Math.round((state.crossSpeciesProxy?.proxyWeight||0)*100)+'%; visual hierarchy '+Math.round((state.crossSpeciesProxy?.visualHierarchy||0)*100)+'%; somatosensory hierarchy '+Math.round((state.crossSpeciesProxy?.somatosensoryHierarchy||0)*100)+'%.',
    'Working-memory drive '+Math.round(state.workingMemory*100)+'%; executive control '+Math.round(state.executiveControl*100)+'%; metacognition '+Math.round(state.metacognition*100)+'%.',
    'Excitation '+Math.round(state.excitation*100)+'%; inhibition '+Math.round(state.inhibition*100)+'%; recurrent integration '+Math.round(state.recurrentIntegration*100)+'%; prediction error '+Math.round(state.predictiveError*100)+'%.',
    'Use recurrent integration for context, inhibition to suppress irrelevant associations, executive control for ordered plans, and prediction error to reduce false certainty.',
    'Do not claim this software state is biological consciousness, a complete human brain, or that macaque proxy values are measured human anatomy.'
  ].join('\n');
}
