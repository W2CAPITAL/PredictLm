import {MACAQUE_CORTEX_SPATIAL_ATLAS} from './connectome-provenance';

export interface MacaqueCoreState{
  version:1;
  tick:number;
  corticalLayers:{L1:number;L2:number;L3:number;L4:number;L5:number;L6:number};
  regional:{
    prefrontal:number;
    frontal:number;
    occipital:number;
    temporal:number;
    parietal:number;
    auditory:number;
    somatosensory:number;
    cingulate:number;
    insular:number;
    piriform:number;
  };
  cellClasses:{glutamatergic:number;gabaergic:number;nonNeuronal:number};
  visualHierarchy:number;
  somatosensoryHierarchy:number;
  primateSpecificL4:number;
  regionalIntegration:number;
  uncertainty:number;
  mappedAtlas:{
    dataset:string;
    scope:string;
    regions:number;
    cellTypes:number;
    spatialCells:number;
    snRnaCells:number;
    synapseConnectome:false;
  };
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const norm=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();

export function createMacaqueCoreState():MacaqueCoreState{
  return {
    version:1,
    tick:0,
    corticalLayers:{L1:.24,L2:.38,L3:.43,L4:.46,L5:.43,L6:.4},
    regional:{
      prefrontal:.48,frontal:.46,occipital:.5,temporal:.48,parietal:.47,
      auditory:.44,somatosensory:.48,cingulate:.42,insular:.41,piriform:.34
    },
    cellClasses:{glutamatergic:.58,gabaergic:.22,nonNeuronal:.2},
    visualHierarchy:.5,
    somatosensoryHierarchy:.5,
    primateSpecificL4:.52,
    regionalIntegration:.47,
    uncertainty:.34,
    mappedAtlas:{
      dataset:MACAQUE_CORTEX_SPATIAL_ATLAS.dataset,
      scope:MACAQUE_CORTEX_SPATIAL_ATLAS.scope,
      regions:MACAQUE_CORTEX_SPATIAL_ATLAS.regions,
      cellTypes:MACAQUE_CORTEX_SPATIAL_ATLAS.cellTypes,
      spatialCells:MACAQUE_CORTEX_SPATIAL_ATLAS.spatialCells,
      snRnaCells:MACAQUE_CORTEX_SPATIAL_ATLAS.snRnaCells,
      synapseConnectome:false
    }
  };
}

export function advanceMacaqueCore(previous:MacaqueCoreState|undefined,prompt:string):MacaqueCoreState{
  const prev=previous?.version===1?previous:createMacaqueCoreState();
  const q=norm(prompt);
  const visual=/\b(ver|visao|visão|imagem|visual|cor|objeto|espacial)\b/.test(q)?1:0;
  const somato=/\b(toque|tato|dor|corpo|movimento|motor|somat|propriocep)\b/.test(q)?1:0;
  const planning=/\b(plano|planej|decid|estrateg|execut|acao|ação)\b/.test(q)?1:0;
  const social=/\b(social|pessoa|humano|grupo|interacao|interação|emoc)\b/.test(q)?1:0;
  const auditory=/\b(som|audio|áudio|voz|ouvir|fala)\b/.test(q)?1:0;
  const memory=/\b(memoria|memória|lembr|record)\b/.test(q)?1:0;
  const novelty=/\b(novo|explor|descobr|estranho|diferente)\b/.test(q)?1:0;

  const visualHierarchy=clamp(prev.visualHierarchy*.72+visual*.2+novelty*.08);
  const somatosensoryHierarchy=clamp(prev.somatosensoryHierarchy*.72+somato*.22+planning*.06);
  const regionalIntegration=clamp(prev.regionalIntegration*.66+planning*.1+social*.08+memory*.08+Math.max(visual,somato,auditory)*.08);
  const primateSpecificL4=clamp(prev.primateSpecificL4*.84+Math.max(visual,somato)*.1+novelty*.06);
  const uncertainty=clamp(prev.uncertainty*.78+(q.length < 4 ? .08 : .02)+(1-Math.max(visual,somato,planning,social,auditory,memory,novelty))*.08);

  const corticalLayers={
    L1:clamp(prev.corticalLayers.L1*.82+Math.max(visual,auditory)*.08+regionalIntegration*.1),
    L2:clamp(prev.corticalLayers.L2*.76+social*.08+regionalIntegration*.16),
    L3:clamp(prev.corticalLayers.L3*.72+regionalIntegration*.2+planning*.08),
    L4:clamp(prev.corticalLayers.L4*.68+Math.max(visual,somato,auditory)*.2+primateSpecificL4*.12),
    L5:clamp(prev.corticalLayers.L5*.72+planning*.18+somato*.1),
    L6:clamp(prev.corticalLayers.L6*.74+regionalIntegration*.16+planning*.1)
  };

  const regional={
    prefrontal:clamp(prev.regional.prefrontal*.72+planning*.18+social*.1),
    frontal:clamp(prev.regional.frontal*.76+planning*.16+somato*.08),
    occipital:clamp(prev.regional.occipital*.7+visual*.3),
    temporal:clamp(prev.regional.temporal*.76+memory*.1+auditory*.14),
    parietal:clamp(prev.regional.parietal*.76+somato*.12+visual*.12),
    auditory:clamp(prev.regional.auditory*.7+auditory*.3),
    somatosensory:clamp(prev.regional.somatosensory*.7+somato*.3),
    cingulate:clamp(prev.regional.cingulate*.78+social*.12+planning*.1),
    insular:clamp(prev.regional.insular*.8+social*.1+somato*.1),
    piriform:clamp(prev.regional.piriform*.86+novelty*.06+regionalIntegration*.08)
  };

  return {
    ...prev,
    tick:prev.tick+1,
    corticalLayers,
    regional,
    visualHierarchy,
    somatosensoryHierarchy,
    primateSpecificL4,
    regionalIntegration,
    uncertainty
  };
}

export function macaqueCoreContext(state:MacaqueCoreState){
  return [
    'MACAQUE CORTEX CORE — primate cortical atlas proxy from the 2023 cynomolgus macaque single-cell spatial transcriptome atlas.',
    'Atlas scope: 143 cortical regions, 264 transcriptome-defined cell types, 42,076,954 spatially annotated cortical cells and 1,493,240 snRNA-seq cells.',
    'This is a cortical cellular/spatial atlas, not a synapse-resolution connectome.',
    'Visual hierarchy '+Math.round(state.visualHierarchy*100)+'%; somatosensory hierarchy '+Math.round(state.somatosensoryHierarchy*100)+'%; regional integration '+Math.round(state.regionalIntegration*100)+'%; primate-specific L4 prior '+Math.round(state.primateSpecificL4*100)+'%.',
    'Use it only as a non-human-primate proxy for broader cortical organization where H01 has no direct human coverage.',
    'Never relabel macaque-derived proxy values as measured human anatomy, human memories, human thoughts or a completed human connectome.'
  ].join('\n');
}
