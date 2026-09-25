import {FLYWIRE_FAFB_V783} from './connectome-provenance';

export interface FlyCoreState{
  version:1;
  tick:number;
  novelty:number;
  salience:number;
  threat:number;
  rewardPrediction:number;
  mushroomBody:number;
  centralComplex:number;
  sensoryDrive:number;
  orientation:number;
  exploration:number;
  inhibition:number;
  actionSelection:number;
  predictionError:number;
  mappedSubgraph:{
    dataset:string;
    release:string;
    neuronScale:number;
    synapseScale:number;
    richClubFraction:number;
    neuropilCount:number;
  };
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const norm=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();

export function createFlyCoreState():FlyCoreState{
  return {
    version:1,
    tick:0,
    novelty:.42,
    salience:.38,
    threat:.12,
    rewardPrediction:.5,
    mushroomBody:.45,
    centralComplex:.46,
    sensoryDrive:.4,
    orientation:.5,
    exploration:.58,
    inhibition:.48,
    actionSelection:.4,
    predictionError:.34,
    mappedSubgraph:{
      dataset:FLYWIRE_FAFB_V783.dataset,
      release:FLYWIRE_FAFB_V783.release,
      neuronScale:FLYWIRE_FAFB_V783.neuronsApprox,
      synapseScale:FLYWIRE_FAFB_V783.synapsesApprox,
      richClubFraction:.30,
      neuropilCount:78
    }
  };
}

function signals(prompt:string){
  const q=norm(prompt);
  const words=q.split(/[^a-z0-9]+/).filter(Boolean);
  const unique=new Set(words.filter(x=>x.length>3)).size;
  const novelty=clamp(.2+unique/28);
  const threat=/\b(perigo|ameaca|ameaça|fraude|golpe|dano|medo|risco|ataque|malware|senha|crime)\b/.test(q)?1:0;
  const reward=/\b(gosto|adoro|amo|legal|bom|melhor|sucesso|funciona|acertou|obrigad)\b/.test(q)?1:0;
  const negative=/\b(ruim|burro|inutil|inútil|erro|falhou|falha|odeio|pior)\b/.test(q)?1:0;
  const action=/\b(faca|faça|crie|corrija|implemente|integre|mande|gere|abra|teste|mude|responda)\b/.test(q)?1:0;
  const orient=/\b(onde|direcao|direção|lado|caminho|rota|proximo|próximo|antes|depois)\b/.test(q)?1:0;
  const uncertainty=/\b(talvez|acho|duvida|dúvida|incerto|nao sei|não sei|será)\b/.test(q)?1:0;
  return {novelty,threat,reward,negative,action,orient,uncertainty};
}

export function advanceFlyCore(previous:FlyCoreState|undefined,prompt:string):FlyCoreState{
  const prev=previous?.version===1?previous:createFlyCoreState();
  const s=signals(prompt);

  // Runtime weights intentionally use network motifs observed in the FlyWire
  // connectome (recurrent/reciprocal, feed-forward and rich-club integration)
  // as a compact control system. This is not a 139k-neuron biophysical simulation.
  const sensoryDrive=clamp(prev.sensoryDrive*.52+s.novelty*.32+s.threat*.16);
  const salience=clamp(prev.salience*.46+sensoryDrive*.24+s.threat*.2+s.action*.1);
  const threat=clamp(prev.threat*.58+s.threat*.34-s.reward*.06);
  const inhibition=clamp(prev.inhibition*.62+threat*.18+s.uncertainty*.12+.08);
  const mushroomBody=clamp(prev.mushroomBody*.64+s.reward*.16+s.negative*.12+s.novelty*.08);
  const centralComplex=clamp(prev.centralComplex*.56+salience*.18+s.orient*.14+s.action*.12);
  const orientation=clamp(prev.orientation*.52+centralComplex*.3+s.orient*.18);
  const rewardPrediction=clamp(prev.rewardPrediction*.72+s.reward*.16+(1-s.negative)*.06+mushroomBody*.06);
  const predictionError=clamp(prev.predictionError*.62+s.uncertainty*.18+s.negative*.14+(1-rewardPrediction)*.06);
  const exploration=clamp(prev.exploration*.58+s.novelty*.25+predictionError*.12-threat*.08);
  const actionSelection=clamp(prev.actionSelection*.42+centralComplex*.24+salience*.2+s.action*.2-inhibition*.12);

  return {
    ...prev,
    tick:prev.tick+1,
    novelty:s.novelty,
    salience,
    threat,
    rewardPrediction,
    mushroomBody,
    centralComplex,
    sensoryDrive,
    orientation,
    exploration,
    inhibition,
    actionSelection,
    predictionError
  };
}

export function flyCoreContext(state:FlyCoreState){
  return [
    'FLY CONNECTOME CORE — compact controller derived from FlyWire FAFB v783 network organization.',
    'This uses real connectome-derived scale and circuit motifs, not a claim that the full fly brain is being simulated.',
    'Salience '+Math.round(state.salience*100)+'%; threat '+Math.round(state.threat*100)+'%; exploration '+Math.round(state.exploration*100)+'%; inhibition '+Math.round(state.inhibition*100)+'%.',
    'Mushroom-body associative drive '+Math.round(state.mushroomBody*100)+'%; central-complex action/orientation drive '+Math.round(state.centralComplex*100)+'%.',
    'Use high salience to stay tightly on-topic, high threat to verify before action, high exploration to consider one useful alternative, and inhibition to suppress irrelevant retrieval.',
    'Do not expose these control values unless the user is explicitly inspecting Cognitive Lab.'
  ].join('\n');
}
