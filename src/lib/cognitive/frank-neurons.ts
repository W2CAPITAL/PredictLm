export type FrankNeuronRegion='pfc'|'hippocampus'|'amygdala'|'insula'|'acc'|'thalamus'|'hypothalamus'|'visual'|'fly-mb'|'fly-cx';

export interface FrankNeuronMeshSummary{
  version:1;
  seed:number;
  tick:number;
  neuronCount:number;
  synapseCount:number;
  firingRate:number;
  synchrony:number;
  plasticity:number;
  regions:Record<FrankNeuronRegion,{neurons:number;firing:number;excitation:number;inhibition:number;plasticity:number}>;
  lastPattern:string[];
}

type N={v:number;thr:number;ref:number;exc:boolean;region:FrankNeuronRegion;adapt:number};
type E={a:number;b:number;w:number};

const regions:FrankNeuronRegion[]=['pfc','hippocampus','amygdala','insula','acc','thalamus','hypothalamus','visual','fly-mb','fly-cx'];
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
function rng(seed:number){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296)}

function build(seed:number,count=256){
  const r=rng(seed);
  const weights:Record<FrankNeuronRegion,number>={pfc:.16,hippocampus:.15,amygdala:.10,insula:.08,acc:.08,thalamus:.09,hypothalamus:.07,visual:.12,'fly-mb':.08,'fly-cx':.07};
  const cumulative: Array<[FrankNeuronRegion,number]>=[];let sum=0;
  for(const region of regions){sum+=weights[region];cumulative.push([region,sum])}
  const neurons:N[]=[];
  for(let i=0;i<count;i++){
    const x=r();const region=(cumulative.find(y=>x<=y[1])||cumulative[cumulative.length-1])[0];
    const exc=r()>(region==='amygdala'?.28:.2);
    neurons.push({v:r()*.25,thr:.62+r()*.16,ref:0,exc,region,adapt:.02+r()*.05});
  }
  const edges:E[]=[];const targetEdges=count*10;
  for(let i=0;i<targetEdges;i++){
    const a=Math.floor(r()*count),b=Math.floor(r()*count);
    if(a===b)continue;
    const same=neurons[a].region===neurons[b].region;
    const w=(neurons[a].exc?1:-1)*(same?.045:.024)*(0.5+r());
    edges.push({a,b,w});
  }
  return {neurons,edges,r};
}

export function createFrankNeuronMesh(seed=73021,count=256):FrankNeuronMeshSummary{
  const built=build(seed,count);
  return summarize(seed,0,built.neurons,built.edges,[],.5);
}

export function stepFrankNeuronMesh(
  previous:FrankNeuronMeshSummary|undefined,
  drives:Partial<Record<FrankNeuronRegion,number>>,
  options?:{emotionSalience?:number;reward?:number;predictionError?:number}
):FrankNeuronMeshSummary{
  const prev=previous?.version===1?previous:createFrankNeuronMesh();
  const {neurons,edges,r}=build(prev.seed,prev.neuronCount);
  // Reconstruct a stable approximate membrane state from the previous regional firing.
  for(const n of neurons)n.v=clamp((prev.regions[n.region]?.firing||.1)*.48+r()*.18,0,.9);
  const incoming=new Float32Array(neurons.length);
  const spikes=new Uint8Array(neurons.length);
  const sal=clamp(options?.emotionSalience??.5);
  const pe=clamp(options?.predictionError??.3);
  const reward=clamp(options?.reward??.5);
  let totalSpikes=0;
  for(let sub=0;sub<6;sub++){
    incoming.fill(0);
    for(const e of edges)if(spikes[e.a])incoming[e.b]+=e.w;
    for(let i=0;i<neurons.length;i++){
      const n=neurons[i];const drive=clamp(drives[n.region]??.15);
      if(n.ref>0){n.ref--;spikes[i]=0;continue}
      n.v=n.v*.86+drive*.18+incoming[i]+(r()-.5)*.025+sal*.018+pe*.012;
      if(n.v>=n.thr){
        spikes[i]=1;totalSpikes++;n.v=.05;n.ref=1+Math.floor(r()*2);
      }else spikes[i]=0;
    }
  }
  const pattern=regions
    .map(region=>[region,neurons.filter(n=>n.region===region&&n.v>.48).length] as const)
    .sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
  return summarize(prev.seed,prev.tick+1,neurons,edges,pattern,clamp(prev.plasticity*.82+reward*.1+pe*.08));
}

function summarize(seed:number,tick:number,neurons:N[],edges:E[],pattern:string[],plasticity:number):FrankNeuronMeshSummary{
  const reg={} as FrankNeuronMeshSummary['regions'];
  let active=0;
  for(const region of regions){
    const ns=neurons.filter(n=>n.region===region);
    const firing=ns.length?ns.filter(n=>n.v>.46).length/ns.length:0;
    active+=ns.filter(n=>n.v>.46).length;
    const exc=ns.filter(n=>n.exc).length/Math.max(1,ns.length);
    reg[region]={neurons:ns.length,firing,excitation:exc,inhibition:1-exc,plasticity};
  }
  const firingRate=active/Math.max(1,neurons.length);
  const vals=regions.map(r=>reg[r].firing);const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
  const variance=vals.reduce((a,b)=>a+(b-mean)*(b-mean),0)/vals.length;
  const synchrony=clamp(1-Math.sqrt(variance)*2);
  return {version:1,seed,tick,neuronCount:neurons.length,synapseCount:edges.length,firingRate,synchrony,plasticity,regions:reg,lastPattern:pattern};
}

export function frankNeuronContext(s:FrankNeuronMeshSummary){
  return [
    'FRANK VIRTUAL NEURON MESH',
    s.neuronCount+' reproducible virtual neurons, '+s.synapseCount+' sparse synapses; firing '+Math.round(s.firingRate*100)+'%; synchrony '+Math.round(s.synchrony*100)+'%; plasticity '+Math.round(s.plasticity*100)+'%.',
    'Dominant microcircuits: '+(s.lastPattern.join(', ')||'baseline')+'.',
    'This is a lightweight computational microcircuit informed by atlas/connectome priors, not a literal replay of donor neurons.'
  ].join('\n');
}
