export interface HumanBrainDatasetProfile{
  id:string;
  label:string;
  people:number;
  scale:string;
  contribution:string[];
  sourceUrl:string;
  licenseNote:string;
}

export const HUMAN_BRAIN_ENSEMBLE:HumanBrainDatasetProfile[]=[
  {
    id:'h01',
    label:'H01 human temporal cortex',
    people:1,
    scale:'~1 mm³ cortex · ~16k neurons · ~150M synapses',
    contribution:['synapse-scale local wiring','six cortical layers','excitatory/inhibitory local balance','rare strong multisynaptic inputs'],
    sourceUrl:'https://research.google/pubs/a-connectomic-study-of-a-petascale-fragment-of-human-cerebral-cortex/',
    licenseNote:'public H01 release; do not bundle petabyte raw volume'
  },
  {
    id:'bigbrain',
    label:'BigBrain',
    people:1,
    scale:'whole human brain · 20 µm histological 3D model',
    contribution:['whole-brain geometry','cortical thickness/layers','subcortical spatial scaffold','3D anatomical registration'],
    sourceUrl:'https://bigbrainproject.org/',
    licenseNote:'open dataset; attribution/licence applies to redistributed data'
  },
  {
    id:'julich',
    label:'Julich-Brain Atlas',
    people:23,
    scale:'>200 probabilistic cytoarchitectonic areas from 23 post-mortem brains',
    contribution:['inter-person variability','probabilistic regional boundaries','receptor/cytoarchitecture integration','multi-person anatomical priors'],
    sourceUrl:'https://julich-brain-atlas.de/atlas',
    licenseNote:'atlas access via EBRAINS; use public derived parameters unless raw-data terms are satisfied'
  },
  {
    id:'hcp',
    label:'Human Connectome Project Young Adult',
    people:1200,
    scale:'3T/7T MRI + MEG population connectomics',
    contribution:['macro-scale structural connectivity','functional network variability','population priors','behavior/connectivity relationships'],
    sourceUrl:'https://www.humanconnectome.org/study/hcp-young-adult',
    licenseNote:'open-access and restricted tiers exist; only public aggregate priors are embedded'
  },
  {
    id:'hbp-ebrains',
    label:'Human Brain Project / EBRAINS',
    people:0,
    scale:'multiscale models, brain atlases, consciousness/cognition, neurorobotics and neuromorphic models',
    contribution:['brain-state dynamics','embodied cognitive architectures','hippocampal/cerebellar/basal-ganglia models','multiscale simulation priors'],
    sourceUrl:'https://www.humanbrainproject.eu/en/',
    licenseNote:'models/datasets have resource-specific terms; Frank embeds only derived architectural priors unless a compatible dataset is explicitly imported'
  },
  {
    id:'allen-human',
    label:'Allen Human Brain Atlas',
    people:6,
    scale:'six adult human brains · all-genes/all-structures microarray',
    contribution:['gene-expression priors','regional molecular variation','cell-type/transcriptomic context','cross-donor reproducibility'],
    sourceUrl:'https://human.brain-map.org/',
    licenseNote:'public atlas/data access; raw donor data is not bundled in PredictLM'
  }
];

export const HUMAN_ENSEMBLE_SUBJECTS=HUMAN_BRAIN_ENSEMBLE.reduce((sum,x)=>sum+x.people,0);

export function humanBrainEnsembleContext(){
  return [
    'FRANK STEIN MULTI-HUMAN ENSEMBLE — public aggregate/derived priors only.',
    ...HUMAN_BRAIN_ENSEMBLE.map(x=>x.label+': '+x.scale+'; contributes '+x.contribution.join(', ')+'.'),
    'The ensemble does not merge donor identities or memories. It combines structural/molecular/network priors from different human datasets.'
  ].join('\n');
}
