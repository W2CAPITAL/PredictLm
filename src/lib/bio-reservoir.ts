import type {BioLearningEvent} from './biointelligence-fabric';

export interface BioReservoirState{
  version:1;
  seed:number;
  tick:number;
  membrane:number[];
  traces:number[];
  firingRate:number;
  synchrony:number;
  predictionError:number;
  plasticity:number;
  lastSignature:string;
}

export interface BioReservoirStep{
  state:BioReservoirState;
  features:{
    firingRate:number;
    synchrony:number;
    predictionError:number;
    plasticity:number;
    noveltyBoost:number;
  };
}

const UNITS=48;
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));

function hash32(seed:number,a:number,b=0){
  let x=(seed^Math.imul(a+1,0x9e3779b1)^Math.imul(b+7,0x85ebca6b))>>>0;
  x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;
  return (x>>>0)/4294967295;
}
function signature(event:BioLearningEvent){
  return [event.surface,event.kind,event.action,event.success===false?'0':event.success===true?'1':'x'].join('|').slice(0,240);
}
function textHash(value:string){
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function eventFeatures(event:BioLearningEvent){
  const sig=signature(event);
  const h=textHash(sig);
  return [
    clamp(Number(event.novelty??.4)),
    clamp(Number(event.uncertainty??.35)),
    clamp(Number(event.salience??.5)),
    event.success===false?1:event.success===true?0:.4,
    event.kind==='simulation'||event.kind==='cognitive'?.8:.2,
    event.kind==='media'?.75:.15,
    event.kind==='build'?.75:.15,
    event.kind==='research'?.72:.12,
    ((h>>>0)&255)/255,
    ((h>>>8)&255)/255,
    ((h>>>16)&255)/255,
    ((h>>>24)&255)/255
  ];
}

export function createBioReservoirState(seed=0x51a9b33):BioReservoirState{
  return {
    version:1,
    seed,
    tick:0,
    membrane:Array.from({length:UNITS},(_,i)=>(hash32(seed,i)-.5)*.08),
    traces:Array.from({length:UNITS},()=>0),
    firingRate:0,
    synchrony:0,
    predictionError:.5,
    plasticity:.25,
    lastSignature:''
  };
}

export function normalizeBioReservoirState(raw:any):BioReservoirState{
  const fresh=createBioReservoirState(Number(raw?.seed)||undefined);
  if(!raw||raw.version!==1)return fresh;
  const membrane=Array.from({length:UNITS},(_,i)=>{
    const v=Number(raw.membrane?.[i]);
    return Number.isFinite(v)?Math.max(-1,Math.min(1,v)):fresh.membrane[i];
  });
  const traces=Array.from({length:UNITS},(_,i)=>clamp(Number(raw.traces?.[i])||0));
  return {
    ...fresh,
    ...raw,
    version:1,
    membrane,
    traces,
    tick:Math.max(0,Number(raw.tick)||0),
    firingRate:clamp(Number(raw.firingRate)||0),
    synchrony:clamp(Number(raw.synchrony)||0),
    predictionError:clamp(Number(raw.predictionError)||.5),
    plasticity:clamp(Number(raw.plasticity)||.25),
    lastSignature:String(raw.lastSignature||'').slice(0,240)
  };
}

export function advanceBioReservoir(previous:BioReservoirState|undefined,event:BioLearningEvent):BioReservoirStep{
  const prev=normalizeBioReservoirState(previous);
  const input=eventFeatures(event);
  const nextMembrane=new Array<number>(UNITS);
  const nextTraces=new Array<number>(UNITS);
  const spikes=new Array<number>(UNITS).fill(0);
  const learningRate=.018+.04*clamp(prev.predictionError);

  for(let i=0;i<UNITS;i++){
    let recurrent=0;
    for(let k=1;k<=4;k++){
      const j=(i-k*7+UNITS*8)%UNITS;
      const sign=hash32(prev.seed,i,j)>.46?1:-1;
      const weight=.035+hash32(prev.seed+19,i,j)*.085;
      recurrent+=prev.traces[j]*weight*sign;
    }
    const inputWeight=.12+hash32(prev.seed+71,i,prev.tick%31)*.24;
    const driven=(input[i%input.length]-.5)*inputWeight;
    const bias=(hash32(prev.seed+113,i)-.5)*.035;
    const membrane=prev.membrane[i]*.83+recurrent+driven+bias;
    const threshold=.3+(hash32(prev.seed+211,i)-.5)*.08;
    const fired=membrane>threshold?1:0;
    spikes[i]=fired;
    nextMembrane[i]=fired?-.12:Math.max(-.7,Math.min(.7,membrane));
    nextTraces[i]=clamp(prev.traces[i]*.86+fired*.32+input[(i+3)%input.length]*learningRate);
  }

  const firingRate=spikes.reduce((s,x)=>s+x,0)/UNITS;
  const meanTrace=nextTraces.reduce((s,x)=>s+x,0)/UNITS;
  const variance=nextTraces.reduce((s,x)=>s+(x-meanTrace)**2,0)/UNITS;
  const synchrony=clamp(1-Math.sqrt(variance)*2.2);
  const expected=clamp(prev.firingRate*.7+prev.traces.reduce((s,x)=>s+x,0)/UNITS*.3);
  const predictionError=clamp(Math.abs(firingRate-expected)*2+Number(event.uncertainty??.25)*.28+(event.success===false?.18:0));
  const plasticity=clamp(prev.plasticity*.84+predictionError*.1+Number(event.novelty??.35)*.06);
  const noveltyBoost=clamp(predictionError*.58+(1-synchrony)*.22+plasticity*.2);

  return {
    state:{
      version:1,
      seed:prev.seed,
      tick:prev.tick+1,
      membrane:nextMembrane,
      traces:nextTraces,
      firingRate,
      synchrony,
      predictionError,
      plasticity,
      lastSignature:signature(event)
    },
    features:{firingRate,synchrony,predictionError,plasticity,noveltyBoost}
  };
}

export function bioReservoirContext(state:BioReservoirState|undefined){
  const s=normalizeBioReservoirState(state);
  return [
    'LOCAL BIO-RESERVOIR · synthetic spiking-inspired controller, not living tissue.',
    'units '+UNITS,
    'tick '+s.tick,
    'firing '+Math.round(s.firingRate*100)+'%',
    'synchrony '+Math.round(s.synchrony*100)+'%',
    'prediction error '+Math.round(s.predictionError*100)+'%',
    'plasticity '+Math.round(s.plasticity*100)+'%'
  ].join(' · ');
}
