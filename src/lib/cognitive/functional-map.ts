export type CognitiveEvidenceSource='H01-human-cortex'|'FlyWire-whole-fly'|'dual-connectome'|'software-memory';

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
    id:'attention',label:'Atenção seletiva',domain:'conscious-access',source:'dual-connectome',
    role:'Seleciona estímulos relevantes para processamento global.',
    implementation:'Fly salience + Human attention + workspace salience.'
  },
  {
    id:'perceptual-binding',label:'Binding perceptivo',domain:'conscious-access',source:'dual-connectome',
    role:'Combina percepção atual em um estado coerente do ambiente.',
    implementation:'Human recurrent integration + Fly central complex + visual snapshots.'
  },
  {
    id:'global-broadcast',label:'Broadcast global',domain:'conscious-access',source:'dual-connectome',
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
    id:'arousal',label:'Arousal',domain:'conscious-access',source:'dual-connectome',
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
    id:'perceptual-memory',label:'Memória perceptiva',domain:'memory',source:'dual-connectome',
    role:'Registra o que humano e mosca realmente perceberam na simulação.',
    implementation:'Human FOV / Fly panoramic snapshots persisted as perceptual traces.'
  },
  {
    id:'prediction-error',label:'Prediction error',domain:'memory',source:'dual-connectome',
    role:'Atualiza confiança e associação depois do resultado.',
    implementation:'Fly prediction error + Human predictive error + explicit feedback.'
  },
  {
    id:'visual-human',label:'Visão humana',domain:'perception',source:'H01-human-cortex',
    role:'Campo visual orientado e limitado por direção/distância.',
    implementation:'125° FOV with object visibility and distance.'
  },
  {
    id:'visual-fly',label:'Visão da mosca',domain:'perception',source:'FlyWire-whole-fly',
    role:'Percepção panorâmica rápida de estímulos próximos.',
    implementation:'320° field with attraction/salience weighting.'
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
