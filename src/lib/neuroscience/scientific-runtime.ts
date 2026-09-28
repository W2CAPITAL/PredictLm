import type {ScientificProvenance,SpikingNetworkExperiment,SpikingSimulationResult} from './biophysical-solver';

export type ScientificSimulationMode='toy-browser'|'full-external';

export interface DatasetManifest{
  id:string;
  species:string;
  scope:string;
  release:string;
  sourceUrl:string;
  doi?:string;
  license:string;
  capability:'synapse-connectome'|'projection-atlas'|'cell-atlas'|'volume-connectome';
  limitation:string;
}

export const SCIENTIFIC_DATASETS:DatasetManifest[]=[
  {
    id:'flywire-fafb-v783',
    species:'Drosophila melanogaster',
    scope:'whole adult female fly brain',
    release:'v783 / Nature 2024',
    sourceUrl:'https://codex.flywire.ai/',
    doi:'10.1038/s41586-024-07558-y',
    license:'source terms apply; raw data is not bundled',
    capability:'synapse-connectome',
    limitation:'connectivity is measured; membrane dynamics and behavior parameters still require a model'
  },
  {
    id:'h01-human-cortex',
    species:'Homo sapiens',
    scope:'~1 mm³ temporal cortex fragment',
    release:'Science 2024',
    sourceUrl:'https://h01-release.storage.googleapis.com/landing.html',
    doi:'10.1126/science.adk4858',
    license:'CC BY 4.0 for released dataset components',
    capability:'volume-connectome',
    limitation:'not a whole human brain and not a source of memories, thoughts or clinical inference'
  },
  {
    id:'microns-cortical-mm3',
    species:'Mus musculus',
    scope:'~1 mm³ visual cortex',
    release:'Nature 2025',
    sourceUrl:'https://www.microns-explorer.org/cortical-mm3',
    doi:'10.1038/s41586-025-08790-w',
    license:'source terms apply',
    capability:'volume-connectome',
    limitation:'not a whole mouse brain'
  },
  {
    id:'allen-mouse-connectivity',
    species:'Mus musculus',
    scope:'whole-brain mesoscale projection atlas',
    release:'Allen public atlas',
    sourceUrl:'https://connectivity.brain-map.org/',
    license:'source terms apply',
    capability:'projection-atlas',
    limitation:'projection density is not individual synapse connectivity'
  }
];

export interface ScientificRunManifest{
  id:string;
  createdAt:string;
  mode:ScientificSimulationMode;
  engine:'predictlm-lif'|'NEST';
  seed:number;
  dtMS:number;
  durationMS:number;
  datasetIds:string[];
  provenance:ScientificProvenance[];
  claims:{
    measured:string[];
    simulated:string[];
    unresolved:string[];
  };
}

export function buildScientificRunManifest(exp:SpikingNetworkExperiment,mode:ScientificSimulationMode='toy-browser'):ScientificRunManifest{
  const provenance=[...exp.neurons.map(n=>n.provenance),...exp.synapses.map(s=>s.provenance),...exp.stimuli.map(s=>s.provenance)];
  const datasetIds=Array.from(new Set(provenance.map(p=>p.dataset).filter(Boolean) as string[]));
  return{
    id:exp.id,
    createdAt:new Date(0).toISOString(),
    mode,
    engine:mode==='full-external'?'NEST':'predictlm-lif',
    seed:exp.seed,
    dtMS:exp.dtMS,
    durationMS:exp.durationMS,
    datasetIds,
    provenance,
    claims:{
      measured:provenance.filter(p=>p.evidence==='measured').map(p=>p.note||p.recordId||p.dataset||'measured datum'),
      simulated:['membrane voltage','spike timing','synaptic conductance','runtime action policy'],
      unresolved:['unmeasured ion-channel parameters unless explicitly supplied','whole-brain human dynamics','subjective mental states']
    }
  };
}

export interface ScientificValidation{
  firingRateRMSEHz?:number;
  firingRateCorrelation?:number;
  spikeCount:number;
  status:'unvalidated'|'partial'|'validated-against-supplied-reference';
  note:string;
}

export function validateAgainstFiringRates(result:SpikingSimulationResult,referenceHz?:Record<string,number>):ScientificValidation{
  if(!referenceHz)return{spikeCount:result.spikes.length,status:'unvalidated',note:'No experimental firing-rate reference supplied.'};
  const ids=Object.keys(referenceHz).filter(id=>id in result.firingRateHz);
  if(!ids.length)return{spikeCount:result.spikes.length,status:'unvalidated',note:'Reference and simulation contain no common neuron IDs.'};
  const errors=ids.map(id=>result.firingRateHz[id]-referenceHz[id]);
  const rmse=Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/errors.length);
  const xs=ids.map(id=>result.firingRateHz[id]),ys=ids.map(id=>referenceHz[id]);
  const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length;
  const num=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0);
  const dx=Math.sqrt(xs.reduce((s,x)=>s+(x-mx)**2,0));
  const dy=Math.sqrt(ys.reduce((s,y)=>s+(y-my)**2,0));
  const corr=dx&&dy?num/(dx*dy):0;
  return{
    firingRateRMSEHz:rmse,
    firingRateCorrelation:corr,
    spikeCount:result.spikes.length,
    status:'validated-against-supplied-reference',
    note:'Quantitative comparison against the supplied firing-rate reference.'
  };
}

export const SCIENTIFIC_PRODUCT_COPY={
  browser:'Numerical neural simulation (toy scale, browser).',
  full:'External scientific neural simulation job (NEST-compatible).',
  forbidden:[
    'real brain running in the browser',
    'imported biological memories',
    'macaque measurements relabeled as human measurements',
    'LLM output presented as a numerical solver result'
  ]
};
