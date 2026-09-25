export type FrankSourceKind='human'|'fly'|'animal-fallback';

export interface FrankBrainSource{
  id:string;
  kind:FrankSourceKind;
  name:string;
  species:string;
  scale:string;
  role:string[];
  license:string;
  sourceUrl:string;
  notes:string[];
}

export const FRANK_BRAIN_SOURCES:FrankBrainSource[]=[
  {
    id:'h01',kind:'human',name:'H01 human temporal cortex',species:'Homo sapiens',
    scale:'~1 mm³ temporal cortex; ~57k cells; ~150M synapses',
    role:['synaptic microcircuit','E/I balance','cortical layers','strong multi-synapse inputs'],
    license:'CC BY 4.0',sourceUrl:'https://h01-release.storage.googleapis.com/landing.html',
    notes:['Real human cortical tissue at nanoscale. Not a whole human brain.']
  },
  {
    id:'bigbrain',kind:'human',name:'BigBrain',species:'Homo sapiens',
    scale:'whole postmortem brain; 20 µm isotropic 3D histology',
    role:['whole-brain spatial scaffold','cortical thickness','laminar geometry','subcortical localization'],
    license:'open dataset / site images CC BY-SA',sourceUrl:'https://bigbrainproject.org/',
    notes:['One donor; used as a detailed structural scaffold, not a synaptic connectome.']
  },
  {
    id:'julich',kind:'human',name:'Julich Brain Atlas / EBRAINS',species:'Homo sapiens',
    scale:'227 probabilistic cytoarchitectonic areas; inter-individual variability',
    role:['probabilistic region maps','cross-brain variability','cortical/subcortical parcellation'],
    license:'EBRAINS dataset-specific',sourceUrl:'https://atlases.ebrains.eu/viewer/',
    notes:['Probabilistic maps reflect variation across individual brains.']
  },
  {
    id:'allen-human',kind:'human',name:'Allen Human Brain Atlas',species:'Homo sapiens',
    scale:'multi-modal adult human atlas; anatomy + gene expression from multiple donor brains',
    role:['regional molecular priors','cross-donor variation','neurotransmitter/receptor priors'],
    license:'Allen Institute terms',sourceUrl:'https://human.brain-map.org/',
    notes:['Used only as region-level molecular priors; no claim of reconstructing donor thoughts or memories.']
  },
  {
    id:'hbp-hippocampus',kind:'human',name:'HBP/EBRAINS hippocampus models',species:'Homo sapiens + comparative models',
    scale:'single-cell, paired-recording, microcircuit and regional simulation resources',
    role:['episodic memory','spatial context','memory consolidation/retrieval'],
    license:'resource-specific',sourceUrl:'https://www.humanbrainproject.eu/en/brain-simulation/hippocampus/',
    notes:['Provides model structure and validation workflows rather than a complete human hippocampal connectome.']
  },
  {
    id:'flywire',kind:'fly',name:'FlyWire FAFB v783',species:'Drosophila melanogaster',
    scale:'139,255 neurons; ~54.5M chemical synapses; whole adult female fly brain',
    role:['whole-brain motifs','mushroom-body associative memory','central-complex action selection','rapid salience'],
    license:'CC BY-NC 4.0 public release',sourceUrl:'https://codex.flywire.ai/?dataset=fafb',
    notes:['Whole-brain reference; raw data is not redistributed in PredictLM.']
  },
  {
    id:'microns',kind:'animal-fallback',name:'MICrONS mouse visual cortex',species:'Mus musculus',
    scale:'~75k neurons with physiology; ~523M synapses in visual cortex mm³',
    role:['functional visual microcircuit','vision fallback','activity/connectivity coupling'],
    license:'dataset-specific open research access',sourceUrl:'https://www.microns-explorer.org/cortical-mm3',
    notes:['Used only when no equivalent human functional microcircuit is available.']
  }
];

export function frankSourceContext(){
  return FRANK_BRAIN_SOURCES.map(s=>s.name+': '+s.role.join(', ')+'; '+s.scale).join('\n');
}
