import type {HumanCoreState} from './human-core';
import type {MacaqueCoreState} from './macaque-core';

export type CrossSpeciesEvidence='direct-human'|'macaque-proxy'|'unresolved';

export interface HumanPrimateCoverageItem{
  id:string;
  label:string;
  evidence:CrossSpeciesEvidence;
  source:string;
  confidence:'high'|'moderate'|'low'|'unknown';
  note:string;
}

export const HUMAN_PRIMATE_COVERAGE:HumanPrimateCoverageItem[]=[
  {
    id:'temporal-local-microcircuit',
    label:'Microcircuito cortical temporal local',
    evidence:'direct-human',
    source:'H01 human cortex',
    confidence:'high',
    note:'Cobertura humana direta em ~1 mm³ de córtex temporal, incluindo camadas e sinapses locais.'
  },
  {
    id:'cortical-layer-cell-priors',
    label:'Distribuição cortical por camadas e tipos celulares',
    evidence:'macaque-proxy',
    source:'Macaque cortex spatial transcriptome atlas',
    confidence:'moderate',
    note:'Proxy de primata não-humano para organização cortical ampla fora do fragmento H01.'
  },
  {
    id:'visual-hierarchy',
    label:'Hierarquia cortical visual ampla',
    evidence:'macaque-proxy',
    source:'Macaque cortex spatial transcriptome atlas',
    confidence:'moderate',
    note:'Usa relações regionais/celulares do córtex de macaque como prior, não como medição humana.'
  },
  {
    id:'somatosensory-hierarchy',
    label:'Hierarquia cortical somatossensorial ampla',
    evidence:'macaque-proxy',
    source:'Macaque cortex spatial transcriptome atlas',
    confidence:'moderate',
    note:'Proxy cortical de primata para regiões humanas ainda não digitalizadas em resolução equivalente.'
  },
  {
    id:'whole-brain-synaptic-connectome',
    label:'Conectoma sináptico humano de cérebro inteiro',
    evidence:'unresolved',
    source:'none',
    confidence:'unknown',
    note:'Nem H01 nem o atlas de macaque fornecem um conectoma sináptico humano de cérebro inteiro.'
  },
  {
    id:'subcortical-whole-brain',
    label:'Estruturas subcorticais humanas completas',
    evidence:'unresolved',
    source:'none',
    confidence:'unknown',
    note:'O atlas de macaque usado aqui cobre córtex cerebral e não preenche cerebelo, tronco, tálamo, gânglios da base ou outras estruturas como se fossem humanas.'
  },
  {
    id:'biographical-memory',
    label:'Memórias e pensamentos biológicos',
    evidence:'unresolved',
    source:'none',
    confidence:'unknown',
    note:'Nenhum desses datasets contém memórias pessoais, experiência subjetiva ou pensamentos atuais.'
  }
];

export function humanPrimateCoverageSummary(){
  return {
    directHuman:HUMAN_PRIMATE_COVERAGE.filter(x=>x.evidence==='direct-human'),
    macaqueProxy:HUMAN_PRIMATE_COVERAGE.filter(x=>x.evidence==='macaque-proxy'),
    unresolved:HUMAN_PRIMATE_COVERAGE.filter(x=>x.evidence==='unresolved')
  };
}

export function humanPrimateBridgeContext(human:HumanCoreState,macaque:MacaqueCoreState){
  const summary=humanPrimateCoverageSummary();
  return [
    'HUMAN↔MACAQUE CROSS-SPECIES COVERAGE LEDGER:',
    'Direct human evidence: '+summary.directHuman.map(x=>x.label).join(', ')+'.',
    'Macaque proxy coverage: '+summary.macaqueProxy.map(x=>x.label).join(', ')+'.',
    'Still unresolved: '+summary.unresolved.map(x=>x.label).join(', ')+'.',
    'Proxy weight '+Math.round((human.crossSpeciesProxy?.proxyWeight||0)*100)+'%; macaque regional integration '+Math.round(macaque.regionalIntegration*100)+'%.',
    'Rule: macaque data can fill software priors for homologous cortical organization, but provenance must stay macaque-proxy and must never be presented as direct human measurement.'
  ].join('\n');
}
