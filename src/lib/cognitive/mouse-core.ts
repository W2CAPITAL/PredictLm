export interface MouseCoreState{
  version:1;
  visualIntegration:number;
  synapticDensity:number;
  functionalCoupling:number;
  mesoscaleProjection:number;
  cellTypeDiversity:number;
  inhibition:number;
  exploration:number;
  uncertainty:number;
  lastUpdated:number;
}

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const hash01=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967295};

export function createMouseCoreState():MouseCoreState{
  return {
    version:1,
    visualIntegration:.72,
    synapticDensity:.78,
    functionalCoupling:.68,
    mesoscaleProjection:.66,
    cellTypeDiversity:.74,
    inhibition:.52,
    exploration:.58,
    uncertainty:.34,
    lastUpdated:Date.now()
  };
}

export function advanceMouseCore(previous:MouseCoreState|undefined,prompt:string):MouseCoreState{
  const prev=previous?.version===1?previous:createMouseCoreState();
  const q=String(prompt||'').toLowerCase();
  const visual=/\b(imagem|visual|foto|cor|objeto|video|vídeo|ver|visão|vision)\b/i.test(q);
  const spatial=/\b(espa[cç]o|mapa|rota|movimento|naveg|ambiente|simula)\b/i.test(q);
  const uncertainty=/\b(talvez|incerto|confirme|verifique|evid[eê]ncia|pesquis)\b/i.test(q);
  const entropy=hash01(q+'|'+prev.lastUpdated);
  return {
    version:1,
    visualIntegration:clamp(prev.visualIntegration*.82+(visual ? .15 : .03)),
    synapticDensity:clamp(prev.synapticDensity*.96+.04),
    functionalCoupling:clamp(prev.functionalCoupling*.82+((visual||spatial) ? .12 : .04)+entropy*.02),
    mesoscaleProjection:clamp(prev.mesoscaleProjection*.86+(spatial ? .10 : .03)),
    cellTypeDiversity:clamp(prev.cellTypeDiversity*.98+.02),
    inhibition:clamp(prev.inhibition*.9+(uncertainty ? .08 : .03)),
    exploration:clamp(prev.exploration*.82+(spatial ? .12 : .04)+entropy*.03),
    uncertainty:clamp(prev.uncertainty*.72+(uncertainty ? .18 : .06)),
    lastUpdated:Date.now()
  };
}

export function mouseCoreContext(state:MouseCoreState){
  return [
    'MOUSE CORE — mapped-data controller, not a whole biological mouse brain simulation.',
    'MICrONS reference: ~1 mm³ visual cortex, >120k reconstructed neurons/cells-scale anatomy and >523M detected synapses; functional imaging covers ~75k pyramidal neurons.',
    'Allen reference: whole-brain mesoscale projection atlas + mouse brain cell atlas; these are projection/cell-type resources, not a whole-brain synapse-resolution connectome.',
    'Signals: visual integration '+Math.round(state.visualIntegration*100)+'%; functional coupling '+Math.round(state.functionalCoupling*100)+'%; mesoscale projection '+Math.round(state.mesoscaleProjection*100)+'%; cell diversity '+Math.round(state.cellTypeDiversity*100)+'%; inhibition '+Math.round(state.inhibition*100)+'%; exploration '+Math.round(state.exploration*100)+'%; uncertainty '+Math.round(state.uncertainty*100)+'%.'
  ].join('\n');
}
