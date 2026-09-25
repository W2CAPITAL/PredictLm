export type ConnectomeProfile={
  id:string;
  species:string;
  dataset:string;
  release:string;
  scope:string;
  license:string;
  sourceUrl:string;
  paperUrl:string;
  neuronsApprox:number;
  synapsesApprox:number;
  notes:string[];
  structuralFeatures:string[];
};

export const FLYWIRE_FAFB_V783:ConnectomeProfile={
  id:'flywire-fafb-v783',
  species:'Drosophila melanogaster',
  dataset:'FlyWire FAFB',
  release:'v783',
  scope:'Whole adult female fly brain connectome',
  license:'CC BY-NC 4.0 public-release data',
  sourceUrl:'https://codex.flywire.ai/?dataset=fafb',
  paperUrl:'https://www.nature.com/articles/s41586-024-07558-y',
  neuronsApprox:139255,
  synapsesApprox:54500000,
  notes:[
    'Whole-brain synapse-resolution wiring diagram reconstructed from electron microscopy.',
    'Nature 2024 reports 139,255 neurons and 54.5 million chemical synapses.',
    'Network-statistics work reports rich-club organization involving about 30% of the connectome and analyses across 78 anatomically defined neuropils.',
    'Raw public-release FlyWire data is not redistributed inside PredictLM because its public-release license is non-commercial.'
  ],
  structuralFeatures:[
    'sensory-to-action pathways',
    'mushroom-body associative loops',
    'central-complex orientation/action-selection circuits',
    'reciprocal motifs',
    'feed-forward motifs',
    'three-node cycles',
    'rich-club integrator/broadcaster organization'
  ]
};

export const H01_HUMAN_CORTEX:ConnectomeProfile={
  id:'h01-human-cortex',
  species:'Homo sapiens',
  dataset:'H01',
  release:'2024 Science final analysis / public release',
  scope:'~1 mm³ temporal human cortex, not a whole human brain',
  license:'CC BY 4.0',
  sourceUrl:'https://h01-release.storage.googleapis.com/landing.html',
  paperUrl:'https://research.google/pubs/a-connectomic-study-of-a-petascale-fragment-of-human-cerebral-cortex/',
  neuronsApprox:16000,
  synapsesApprox:150000000,
  notes:[
    'Petascale nanoscale reconstruction of roughly one cubic millimeter of human temporal cortex.',
    'The public dataset includes all six cortical layers and excitatory/inhibitory synapse annotations.',
    'Final Google/Science summaries report roughly 57,000 cells, ~16,000 neurons and ~150 million synapses.',
    'This is a mapped cortical fragment, not a complete connectome of an entire human brain.'
  ],
  structuralFeatures:[
    'six-layer cortical organization',
    'excitatory pyramidal-cell population',
    'inhibitory interneuron population',
    'rare strong multi-synapse axonal inputs',
    'layer-dependent recurrent connectivity',
    'local excitation/inhibition balance'
  ]
};



export type BrainAtlasProfile={
  id:string;
  species:string;
  dataset:string;
  release:string;
  scope:string;
  license:string;
  sourceUrl:string;
  paperUrl:string;
  regions:number;
  cellTypes:number;
  spatialCells:number;
  snRnaCells:number;
  notes:string[];
  structuralFeatures:string[];
};

export const MACAQUE_CORTEX_SPATIAL_ATLAS:BrainAtlasProfile={
  id:'macaque-cortex-spatial-atlas-2023',
  species:'Macaca fascicularis (cynomolgus macaque)',
  dataset:'Macaque cortex single-cell spatial transcriptome atlas',
  release:'Cell 2023 / BSDC CSTR 33145.11.BSDC.1685409749.1663093488869060610',
  scope:'Whole cerebral cortex atlas across 143 macaque cortical regions; not a synapse-resolution connectome and not a whole-brain connectome',
  license:'Open-access paper; dataset redistribution follows source repository terms',
  sourceUrl:'https://macaque.digital-brain.cn/spatial-omics',
  paperUrl:'https://doi.org/10.1016/j.cell.2023.06.009',
  regions:143,
  cellTypes:264,
  spatialCells:42076954,
  snRnaCells:1493240,
  notes:[
    'Spatial transcriptomics and snRNA-seq atlas of the cynomolgus macaque cerebral cortex.',
    'The study reports 264 transcriptome-defined cortical cell types across 143 cortical regions.',
    'The spatial map contains 42,076,954 annotated cortical cells; snRNA-seq taxonomy used 1,493,240 cells from cortical regions.',
    'Use as a primate cortical proxy for organization and cell-type priors only; it does not provide human memories, human thoughts, or missing human synapses.',
    'The user-supplied BSDC dataset id 1888063966518173697 points to a mouse-brain spatial-transcriptome dataset, so it is not used as the macaque source.'
  ],
  structuralFeatures:[
    'whole-cortex regional parcellation',
    'six-layer cortical cell-type distributions',
    'glutamatergic and GABAergic cell-type priors',
    'non-neuronal cell-class distributions',
    'visual-system cortical hierarchy',
    'somatosensory-system cortical hierarchy',
    'primate-specific layer-4-enriched cell types'
  ]
};

export const CONNECTOME_PROFILES=[FLYWIRE_FAFB_V783,H01_HUMAN_CORTEX] as const;
export const BRAIN_ATLAS_PROFILES=[MACAQUE_CORTEX_SPATIAL_ATLAS] as const;

export function connectomeProvenanceSummary(){
  return CONNECTOME_PROFILES.map(p=>({
    id:p.id,
    dataset:p.dataset,
    release:p.release,
    scope:p.scope,
    license:p.license,
    neuronsApprox:p.neuronsApprox,
    synapsesApprox:p.synapsesApprox,
    sourceUrl:p.sourceUrl,
    paperUrl:p.paperUrl
  }));
}
