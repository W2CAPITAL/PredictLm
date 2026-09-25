export type CognitiveEvidenceSource='H01-human-cortex'|'Macaque-cortex-atlas'|'human-macaque-proxy'|'FlyWire-whole-fly'|'dual-connectome'|'multi-species'|'software-memory';

export interface CognitiveFunctionNode{
  id:string;
  label:string;
  domain:'conscious-access'|'memory'|'perception'|'agency';
  source:CognitiveEvidenceSource;
  role:string;
  implementation:string;
}

export const COGNITIVE_FUNCTIONAL_MAP:CognitiveFunctionNode[]=[
  {
    id:'attention',label:'Atenção seletiva',domain:'conscious-access',source:'multi-species',
    role:'Seleciona estímulos relevantes para processamento global.',
    implementation:'Fly salience + Human attention + Macaque regional integration + workspace salience.'
  },
  {
    id:'perceptual-binding',label:'Binding perceptivo',domain:'conscious-access',source:'multi-species',
    role:'Combina percepção atual em um estado coerente do ambiente.',
    implementation:'Human recurrent integration + Macaque cortical-regional prior + Fly central complex + visual snapshots.'
  },
  {
    id:'global-broadcast',label:'Broadcast global',domain:'conscious-access',source:'multi-species',
    role:'Disponibiliza informação selecionada para memória, decisão e resposta.',
    implementation:'Global Workspace broadcast controls.'
  },
  {
    id:'self-model',label:'Self-model',domain:'conscious-access',source:'software-memory',
    role:'Mantém identidade contínua do agente independente do provider.',
    implementation:'Persistent identity traces + mode identity + metacognition.'
  },
  {
    id:'continuity',label:'Continuidade',domain:'conscious-access',source:'software-memory',
    role:'Liga estados presentes a episódios anteriores.',
    implementation:'IndexedDB autobiographical + episodic memory.'
  },
  {
    id:'reportability',label:'Reportabilidade',domain:'conscious-access',source:'dual-connectome',
    role:'Permite relatar conteúdo que entrou no workspace sem expor chain-of-thought.',
    implementation:'Workspace public state + calibrated response layer.'
  },
  {
    id:'arousal',label:'Arousal',domain:'conscious-access',source:'multi-species',
    role:'Modula prontidão e intensidade de processamento.',
    implementation:'Human neuro arousal + Fly sensory drive.'
  },
  {
    id:'working-memory',label:'Memória de trabalho',domain:'memory',source:'H01-human-cortex',
    role:'Mantém informação ativa no turno e contexto recente.',
    implementation:'Human working-memory drive + recent working buffer.'
  },
  {
    id:'episodic-memory',label:'Memória episódica',domain:'memory',source:'software-memory',
    role:'Registra interações e resultados em sequência temporal.',
    implementation:'Persistent CognitiveEpisode stream in IndexedDB.'
  },
  {
    id:'autobiographical-memory',label:'Memória autobiográfica',domain:'memory',source:'software-memory',
    role:'Mantém identidade, fatos pessoais aprendidos e continuidade do agente.',
    implementation:'Salience-weighted autobiographical traces; provider identity is excluded.'
  },
  {
    id:'semantic-memory',label:'Memória semântica',domain:'memory',source:'software-memory',
    role:'Mantém fatos e conceitos estáveis do próprio sistema.',
    implementation:'Persistent semantic traces.'
  },
  {
    id:'associative-memory',label:'Memória associativa',domain:'memory',source:'FlyWire-whole-fly',
    role:'Relaciona estímulos, recompensa, novidade e comportamento.',
    implementation:'Fly mushroom-body drive + salience-weighted associations.'
  },
  {
    id:'perceptual-memory',label:'Memória perceptiva',domain:'memory',source:'multi-species',
    role:'Registra o que humano e mosca realmente perceberam na simulação.',
    implementation:'Human FOV / Fly panoramic snapshots persisted as perceptual traces.'
  },
  {
    id:'prediction-error',label:'Prediction error',domain:'memory',source:'multi-species',
    role:'Atualiza confiança e associação depois do resultado.',
    implementation:'Fly prediction error + Human predictive error + explicit feedback.'
  },
  {
    id:'visual-human',label:'Visão humana simulada',domain:'perception',source:'human-macaque-proxy',
    role:'Campo visual de software orientado e limitado por direção/distância, com prior cortical visual de primata.',
    implementation:'125° software FOV + Human Core + Macaque visual-hierarchy proxy; not a measured human visual connectome.'
  },
  {
    id:'visual-fly',label:'Visão da mosca',domain:'perception',source:'FlyWire-whole-fly',
    role:'Percepção panorâmica rápida de estímulos próximos.',
    implementation:'320° field with attraction/salience weighting.'
  },
  {
    id:'macaque-cell-priors',label:'Priors celulares de primata',domain:'perception',source:'Macaque-cortex-atlas',
    role:'Fornece organização cortical ampla por regiões, camadas e classes celulares fora da cobertura direta do H01.',
    implementation:'143 cortical regions + 264 transcriptome-defined cell types from the macaque spatial atlas.'
  },
  {
    id:'macaque-cortical-hierarchy',label:'Hierarquia cortical de primata',domain:'perception',source:'Macaque-cortex-atlas',
    role:'Fornece priors de hierarquia visual e somatossensorial em córtex de primata.',
    implementation:'Macaque visual/somatosensory regional hierarchy; provenance remains non-human primate.'
  },
  {
    id:'macaque-pfc-projectome',label:'Projectome PFC de macaque',domain:'agency',source:'Macaque-cortex-atlas',
    role:'Fornece prior de projeções de longo alcance do córtex pré-frontal de primata.',
    implementation:'2,231 reconstructed PFC neurons + 32 projectome subtypes; projection-level proxy, not synapses.'
  },
  {
    id:'macaque-claustrum-connectivity',label:'Conectividade do claustro macaque',domain:'conscious-access',source:'Macaque-cortex-atlas',
    role:'Fornece prior de integração córtex↔subcórtex do claustro em primata.',
    implementation:'Tracer-derived 148 cortical + 15 subcortical target sites; not a whole-brain synaptic connectome.'
  },
  {
    id:'human-proxy-ledger',label:'Cobertura humano↔macaco',domain:'conscious-access',source:'human-macaque-proxy',
    role:'Distingue medição humana direta, proxy de macaque e regiões ainda sem cobertura.',
    implementation:'Explicit coverage ledger; macaque data never silently relabeled as human.'
  },
  {
    id:'action-selection',label:'Seleção de ação',domain:'agency',source:'FlyWire-whole-fly',
    role:'Escolhe entre alternativas sem roteiro linear.',
    implementation:'Fly central-complex/action-selection + scored human affordances.'
  },
  {
    id:'executive-control',label:'Controle executivo',domain:'agency',source:'H01-human-cortex',
    role:'Organiza objetivos e inibe ações irrelevantes.',
    implementation:'Human executive control + inhibition.'
  }
];

export function cognitiveFunctionalMapContext(){
  return COGNITIVE_FUNCTIONAL_MAP.map(node=>
    node.label+' ['+node.source+']: '+node.implementation
  ).join('\n');
}
