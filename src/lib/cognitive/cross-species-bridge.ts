export type BridgeSpecies='human'|'fly'|'mouse'|'macaque';

export interface CrossSpeciesBridge{
  function:string;
  preferred:'human';
  fallback:BridgeSpecies[];
  rationale:string;
  implementation:string;
}

export const CROSS_SPECIES_BRIDGES:CrossSpeciesBridge[]=[
  {
    function:'episodic/emotional memory',
    preferred:'human',
    fallback:['mouse','macaque','fly'],
    rationale:'Human hippocampus/amygdala evidence is primary; animal work can fill circuit/plasticity gaps without being treated as identical.',
    implementation:'Human H01/atlas priors + amygdala↔hippocampus emotion-memory coupling; fly mushroom-body only augments associative learning.'
  },
  {
    function:'action selection',
    preferred:'human',
    fallback:['macaque','mouse','fly'],
    rationale:'Human basal-ganglia/cortical models are preferred; Fly central complex is a compact fallback for orientation/action motifs.',
    implementation:'Human executive/basal-ganglia virtual populations + Fly central-complex controller.'
  },
  {
    function:'visual salience and fast orientation',
    preferred:'human',
    fallback:['macaque','mouse','fly'],
    rationale:'Human visual-system priors are primary; fly circuits contribute efficient panoramic salience/orientation motifs.',
    implementation:'Human directional FOV + Fly panoramic salience; never substitute fly vision for human phenomenology.'
  },
  {
    function:'cell-type and molecular priors',
    preferred:'human',
    fallback:['macaque','mouse'],
    rationale:'Allen human transcriptomics first; mouse/macaque atlases can supply comparative cell-type priors when human coverage is missing.',
    implementation:'Species-tagged molecular priors only; no cross-species donor identity mixing.'
  },
  {
    function:'whole-brain microscopic wiring',
    preferred:'human',
    fallback:['fly'],
    rationale:'No complete human synapse-resolution connectome exists; FlyWire offers a complete small-brain wiring diagram for generic network motifs.',
    implementation:'Use FlyWire recurrent/feed-forward/rich-club motifs as control inspiration, not as a literal human-brain replacement.'
  }
];

export function crossSpeciesBridgeContext(){
  return [
    'CROSS-SPECIES BRIDGE POLICY — human evidence first.',
    ...CROSS_SPECIES_BRIDGES.map(x=>x.function+': '+x.implementation+' Fallbacks='+x.fallback.join('→')+'.'),
    'Cross-species modules are analogical computational bridges, never claims of identical subjective experience or anatomy.'
  ].join('\n');
}
