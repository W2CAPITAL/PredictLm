export type BioSpeciesId='human'|'macaque'|'fly'|'celegans'|'mouse'|'zebrafish';

export type EvidenceClass='measured'|'published'|'derived-controller'|'simulated-runtime'|'unresolved';

export interface BioBrainSource{
  id:string;
  species:BioSpeciesId;
  label:string;
  evidence:EvidenceClass;
  scope:string;
  source:string;
  notes:string;
}

export interface BioLearningEvent{
  id?:string;
  surface:string;
  action:string;
  kind:'interaction'|'navigation'|'api'|'success'|'error'|'simulation'|'memory'|'research'|'build'|'media'|'legal'|'cognitive';
  at?:number;
  durationMs?:number;
  success?:boolean;
  novelty?:number;
  uncertainty?:number;
  salience?:number;
  metadata?:Record<string,string|number|boolean|null|undefined>;
}

export interface SpeciesSignal{
  species:BioSpeciesId;
  attention:number;
  novelty:number;
  memory:number;
  inhibition:number;
  action:number;
  sensory:number;
  social:number;
  prediction:number;
  weight:number;
  rationale:string;
}

export interface BioIntelligenceFusion{
  event:BioLearningEvent;
  species:SpeciesSignal[];
  consensus:{
    attention:number;
    novelty:number;
    memory:number;
    inhibition:number;
    action:number;
    sensory:number;
    social:number;
    prediction:number;
  };
  disagreement:number;
  learningPriority:number;
  researchGap:boolean;
  label:'brain-inspired-controller';
}

export interface BioIntelligenceState{
  version:1;
  experiences:number;
  lastUpdated:number;
  speciesUse:Record<BioSpeciesId,number>;
  recent:Array<{
    at:number;
    surface:string;
    action:string;
    kind:BioLearningEvent['kind'];
    priority:number;
    disagreement:number;
    success?:boolean;
  }>;
}

export const BIO_BRAIN_SOURCES:BioBrainSource[]=[
  {
    id:'human-h01',
    species:'human',
    label:'Human H01 cortical sample',
    evidence:'measured',
    scope:'partial human cortex at synaptic resolution; not a whole human connectome',
    source:'Google Research H01 / public connectomics references already registered in NeuroCore',
    notes:'Use direct human structure only where coverage exists; preserve unknowns elsewhere.'
  },
  {
    id:'macaque-digital-brain',
    species:'macaque',
    label:'Macaque cortical atlas + projectome',
    evidence:'published',
    scope:'cortical spatial transcriptomics, PFC projectomes and claustrum connectivity priors',
    source:'Digital Brain / Cell macaque datasets registered in NeuroCore SOURCE-MAP',
    notes:'Cortical proxy only; never relabel as measured human connectivity.'
  },
  {
    id:'flywire-fafb',
    species:'fly',
    label:'Drosophila FlyWire / FAFB',
    evidence:'measured',
    scope:'brain-wide fly connectome motifs and sensorimotor organization',
    source:'FlyWire / VirtualFlyBrain references registered in NeuroCore',
    notes:'Structural connectivity does not contain autobiographical memories or subjective thoughts.'
  },
  {
    id:'openworm-cook2019',
    species:'celegans',
    label:'C. elegans whole-animal connectomes',
    evidence:'published',
    scope:'anatomical chemical/electrical connectivity across whole animal, including neurons and effectors',
    source:'OpenWorm Connectome Toolbox; Cook et al. 2019',
    notes:'Useful for compact sensorimotor routing, recurrence and whole-organism action loops.'
  },
  {
    id:'microns-mouse',
    species:'mouse',
    label:'MICrONS mouse visual cortex',
    evidence:'measured',
    scope:'dense structural + functional connectomics across a millimeter-scale visual cortical volume',
    source:'MICrONS Consortium, Nature 2025; Allen Mouse Brain Atlas for anatomical framework',
    notes:'Dense but partial cortex; use visual hierarchy/connectivity motifs, not a whole-brain mouse mind.'
  },
  {
    id:'zebrafish-em',
    species:'zebrafish',
    label:'Larval zebrafish whole-brain EM resource',
    evidence:'measured',
    scope:'whole-brain larval EM volume with queryable synapses and reconstructed validated circuits',
    source:'Svara et al., Nature Methods 2022; mapzebrain/Z-Brain references',
    notes:'Whole-brain imaging resource does not mean every neuron/synapse has been fully proofread or functionally characterized.'
  }
];

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const num=(v:unknown,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;

function base(event:BioLearningEvent){
  const success=event.success===false?0:event.success===true?1:.55;
  const novelty=clamp(num(event.novelty,.45));
  const uncertainty=clamp(num(event.uncertainty,event.kind==='error'?.85:.38));
  const salience=clamp(num(event.salience,event.kind==='error'?.92:event.kind==='simulation'?.68:.52));
  const latency=event.durationMs?clamp(event.durationMs/5000):.18;
  return {success,novelty,uncertainty,salience,latency};
}

export function speciesSignals(event:BioLearningEvent):SpeciesSignal[]{
  const b=base(event);
  const fail=event.success===false||event.kind==='error';
  const simulation=event.kind==='simulation'||event.kind==='cognitive';
  const research=event.kind==='research';
  const actionish=['interaction','api','build','media','legal'].includes(event.kind);

  return [
    {
      species:'human',
      attention:clamp(.48+b.salience*.35+b.uncertainty*.12),
      novelty:clamp(.35+b.novelty*.42),
      memory:clamp(.5+b.salience*.24+(research?.12:0)),
      inhibition:clamp(.5+b.uncertainty*.3+(fail?.16:0)),
      action:clamp(.35+(actionish?.34:.12)),
      sensory:clamp(.28+(simulation?.18:0)),
      social:.38,
      prediction:clamp(.45+b.uncertainty*.28),
      weight:1,
      rationale:'executive control, working memory, uncertainty and evidence integration'
    },
    {
      species:'macaque',
      attention:clamp(.45+b.salience*.36),
      novelty:clamp(.38+b.novelty*.38),
      memory:clamp(.42+b.salience*.2),
      inhibition:clamp(.48+b.uncertainty*.22),
      action:clamp(.38+(actionish?.28:.12)),
      sensory:clamp(.42+(simulation?.18:0)),
      social:.44,
      prediction:clamp(.42+b.uncertainty*.2),
      weight:.82,
      rationale:'primate cortical hierarchy, long-range projectome and integration priors'
    },
    {
      species:'fly',
      attention:clamp(.42+b.salience*.42),
      novelty:clamp(.5+b.novelty*.35),
      memory:clamp(.34+b.salience*.22),
      inhibition:clamp(.38+(fail?.28:.08)),
      action:clamp(.5+(actionish?.32:.08)),
      sensory:clamp(.56+(simulation?.24:0)),
      social:.2,
      prediction:clamp(.3+b.uncertainty*.16),
      weight:.72,
      rationale:'fast sensorimotor salience, action selection and compact recurrent motifs'
    },
    {
      species:'celegans',
      attention:clamp(.3+b.salience*.34),
      novelty:clamp(.26+b.novelty*.24),
      memory:clamp(.28+b.salience*.18),
      inhibition:clamp(.34+(fail?.2:.06)),
      action:clamp(.58+(actionish?.24:.08)),
      sensory:clamp(.62+(simulation?.2:0)),
      social:.1,
      prediction:clamp(.24+b.uncertainty*.14),
      weight:.62,
      rationale:'whole-organism sensorimotor routing and compact recurrent connectivity'
    },
    {
      species:'mouse',
      attention:clamp(.5+b.salience*.3),
      novelty:clamp(.38+b.novelty*.32),
      memory:clamp(.38+b.salience*.2),
      inhibition:clamp(.42+b.uncertainty*.18),
      action:clamp(.28+(actionish?.18:.08)),
      sensory:clamp(.72+(simulation?.12:0)),
      social:.2,
      prediction:clamp(.58+b.uncertainty*.24),
      weight:.76,
      rationale:'functional visual connectomics, feature hierarchy and predictive response modeling'
    },
    {
      species:'zebrafish',
      attention:clamp(.44+b.salience*.32),
      novelty:clamp(.46+b.novelty*.3),
      memory:clamp(.34+b.salience*.2),
      inhibition:clamp(.38+b.uncertainty*.18),
      action:clamp(.5+(actionish?.2:.1)),
      sensory:clamp(.66+(simulation?.18:0)),
      social:.18,
      prediction:clamp(.46+b.uncertainty*.2),
      weight:.68,
      rationale:'brain-wide sensorimotor mapping and visually grounded circuit reconstruction'
    }
  ];
}

export function fuseBioIntelligence(event:BioLearningEvent):BioIntelligenceFusion{
  const rows=speciesSignals(event);
  const keys=['attention','novelty','memory','inhibition','action','sensory','social','prediction'] as const;
  const total=rows.reduce((s,r)=>s+r.weight,0)||1;
  const consensus={} as BioIntelligenceFusion['consensus'];
  for(const key of keys)consensus[key]=clamp(rows.reduce((s,r)=>s+r[key]*r.weight,0)/total);

  const disagreement=clamp(keys.reduce((sum,key)=>{
    const mean=consensus[key];
    return sum+rows.reduce((s,r)=>s+Math.abs(r[key]-mean)*r.weight,0)/total;
  },0)/keys.length*2.4);

  const failure=event.success===false||event.kind==='error';
  const learningPriority=clamp(
    consensus.attention*.2+
    consensus.memory*.18+
    consensus.prediction*.18+
    consensus.novelty*.16+
    disagreement*.12+
    (failure?.16:0)
  );

  return {
    event:{...event,at:event.at||Date.now()},
    species:rows,
    consensus,
    disagreement,
    learningPriority,
    researchGap:learningPriority>.62&&(disagreement>.18||num(event.uncertainty,.4)>.62),
    label:'brain-inspired-controller'
  };
}

export function createBioIntelligenceState():BioIntelligenceState{
  return {
    version:1,
    experiences:0,
    lastUpdated:Date.now(),
    speciesUse:{human:0,macaque:0,fly:0,celegans:0,mouse:0,zebrafish:0},
    recent:[]
  };
}

export function advanceBioIntelligence(previous:BioIntelligenceState|undefined,event:BioLearningEvent){
  const prev=previous?.version===1?previous:createBioIntelligenceState();
  const fusion=fuseBioIntelligence(event);
  const speciesUse={...prev.speciesUse};
  for(const row of fusion.species)speciesUse[row.species]=(speciesUse[row.species]||0)+row.weight*fusion.learningPriority;

  return {
    version:1 as const,
    experiences:prev.experiences+1,
    lastUpdated:Date.now(),
    speciesUse,
    recent:[{
      at:fusion.event.at||Date.now(),
      surface:event.surface,
      action:event.action,
      kind:event.kind,
      priority:Number(fusion.learningPriority.toFixed(3)),
      disagreement:Number(fusion.disagreement.toFixed(3)),
      success:event.success
    },...prev.recent].slice(0,160)
  };
}

export function bioIntelligenceContext(event:BioLearningEvent){
  const f=fuseBioIntelligence(event);
  const strongest=[...f.species].sort((a,b)=>(b.weight*b.attention)-(a.weight*a.attention)).slice(0,3);
  return [
    'BIOINTELLIGENCE FABRIC — brain-inspired software controller, not living tissue and not a claim of animal consciousness.',
    'Cross-species ensemble: '+strongest.map(x=>x.species+' ('+x.rationale+')').join(' | ')+'.',
    'Learning priority '+Math.round(f.learningPriority*100)+'%; disagreement '+Math.round(f.disagreement*100)+'%; research gap '+(f.researchGap?'yes':'no')+'.',
    'Measured/published connectome data constrains structure. Runtime memories and decisions are synthetic software state.',
    'Never describe controller outputs as recovered biological thoughts, memories or consciousness.'
  ].join('\n');
}
