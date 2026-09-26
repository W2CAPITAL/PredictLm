import {observeBioAI} from './bioai';
import type {BioLearningEvent} from './biointelligence-fabric';

export type WetwareAdapterId='local-synthetic'|'cortical-cl1'|'finalspark-mea';

export interface WetwareAdapterDescriptor{
  id:WetwareAdapterId;
  label:string;
  mode:'built-in'|'optional-external';
  source:string;
  licensePolicy:string;
  requiresHardware:boolean;
  requiresExplicitEnable:boolean;
}

export interface WetwareFrameSummary{
  adapter:WetwareAdapterId;
  measured:boolean;
  timestamp:number;
  channels:number;
  samplesPerChannel:number;
  meanAbs:number;
  rms:number;
  peak:number;
  activity:number;
  synchrony:number;
  freshnessMs:number;
  fingerprint:string;
}

export const WETWARE_ADAPTERS:WetwareAdapterDescriptor[]=[
  {
    id:'local-synthetic',
    label:'PredictLM synthetic bio-reservoir',
    mode:'built-in',
    source:'src/lib/bio-reservoir.ts',
    licensePolicy:'native PredictLM implementation',
    requiresHardware:false,
    requiresExplicitEnable:false
  },
  {
    id:'cortical-cl1',
    label:'Cortical Labs CL1',
    mode:'optional-external',
    source:'Cortical-Labs/cl-sdk + official developer docs',
    licensePolicy:'reference-only for CC BY-NC SDK; do not copy SDK into commercial core',
    requiresHardware:true,
    requiresExplicitEnable:true
  },
  {
    id:'finalspark-mea',
    label:'FinalSpark Neuroplatform MEA',
    mode:'optional-external',
    source:'FinalSpark-np/LiveMEA_ts + Neuroplatform docs',
    licensePolicy:'MIT interface may be adapted; credentials and remote wetware remain user-authorized external I/O',
    requiresHardware:true,
    requiresExplicitEnable:true
  }
];

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));

function hash(values:number[]){
  let h=2166136261;
  for(const value of values){
    const n=Math.round(Number(value||0)*10000);
    h^=n&255;h=Math.imul(h,16777619);
    h^=(n>>>8)&255;h=Math.imul(h,16777619);
  }
  return (h>>>0).toString(36);
}

export function summarizeWetwareFrame(input:{
  adapter:WetwareAdapterId;
  channels:number[][];
  timestamp?:number;
  measured?:boolean;
  now?:number;
}):WetwareFrameSummary{
  const rows=Array.isArray(input.channels)?input.channels.slice(0,64):[];
  let count=0,sumAbs=0,sumSq=0,peak=0;
  const channelMeans:number[]=[];
  const channelActivity:number[]=[];

  for(const raw of rows){
    const channel=Array.isArray(raw)?raw.slice(0,4096):[];
    let localAbs=0,localSq=0,localPeak=0,crossings=0;
    let prev=0;
    for(const sampleRaw of channel){
      const sample=Number(sampleRaw);
      if(!Number.isFinite(sample))continue;
      const abs=Math.abs(sample);
      localAbs+=abs;localSq+=sample*sample;localPeak=Math.max(localPeak,abs);
      if((sample>0)!==(prev>0)&&Math.max(abs,Math.abs(prev))>localPeak*.28)crossings++;
      prev=sample;
      count++;sumAbs+=abs;sumSq+=sample*sample;peak=Math.max(peak,abs);
    }
    const n=Math.max(1,channel.length);
    channelMeans.push(localAbs/n);
    channelActivity.push(clamp(crossings/Math.max(8,n*.12)));
  }

  const channels=Math.max(0,rows.length);
  const samplesPerChannel=channels?Math.round(count/channels):0;
  const meanAbs=count?sumAbs/count:0;
  const rms=count?Math.sqrt(sumSq/count):0;
  const meanActivity=channelActivity.length?channelActivity.reduce((s,x)=>s+x,0)/channelActivity.length:0;
  const meanChannel=channelMeans.length?channelMeans.reduce((s,x)=>s+x,0)/channelMeans.length:0;
  const spread=channelMeans.length
    ?Math.sqrt(channelMeans.reduce((s,x)=>s+(x-meanChannel)**2,0)/channelMeans.length)
    :0;
  const synchrony=clamp(1-spread/Math.max(1e-9,meanChannel+spread));
  const timestamp=Number(input.timestamp||Date.now());
  const now=Number(input.now||Date.now());

  return {
    adapter:input.adapter,
    measured:input.measured===true,
    timestamp,
    channels,
    samplesPerChannel,
    meanAbs,
    rms,
    peak,
    activity:meanActivity,
    synchrony,
    freshnessMs:Math.max(0,now-timestamp),
    fingerprint:hash([channels,samplesPerChannel,meanAbs,rms,peak,meanActivity,synchrony])
  };
}

export function wetwareLearningEvent(summary:WetwareFrameSummary):BioLearningEvent{
  const stale=clamp(summary.freshnessMs/30000);
  const novelty=clamp(summary.activity*.46+(1-summary.synchrony)*.28+Math.min(1,summary.peak/(summary.rms*6+1e-9))*.26);
  const uncertainty=summary.measured?clamp(.18+stale*.55):clamp(.38+stale*.38);
  return {
    surface:'bioai/wetware/'+summary.adapter,
    action:'ingest '+(summary.measured?'measured':'simulated')+' neural frame '+summary.fingerprint,
    kind:'cognitive',
    success:summary.channels>0&&summary.samplesPerChannel>0,
    novelty,
    uncertainty,
    salience:clamp(.42+summary.activity*.36+(summary.measured ? .12 : 0)),
    metadata:{
      adapter:summary.adapter,
      measured:summary.measured,
      channels:summary.channels,
      samplesPerChannel:summary.samplesPerChannel,
      freshnessMs:Math.round(summary.freshnessMs)
    }
  };
}

export function ingestWetwareFrame(summary:WetwareFrameSummary){
  const event=wetwareLearningEvent(summary);
  return {event,...observeBioAI(event)};
}

export function wetwareAdapterGate(input:{
  adapter:WetwareAdapterId;
  explicitlyEnabled?:boolean;
  externalConfigured?:boolean;
}){
  const descriptor=WETWARE_ADAPTERS.find(x=>x.id===input.adapter)||WETWARE_ADAPTERS[0];
  if(descriptor.id==='local-synthetic')return{allowed:true,descriptor,reason:'built-in local synthetic reservoir'};
  if(!input.explicitlyEnabled)return{allowed:false,descriptor,reason:'external biological I/O requires explicit user enablement'};
  if(!input.externalConfigured)return{allowed:false,descriptor,reason:'authorized external endpoint/hardware is not configured'};
  return{allowed:true,descriptor,reason:'explicitly enabled external experimental adapter'};
}

export function wetwarePolicyContext(){
  return [
    'WETWARE BRIDGE POLICY',
    'PredictLM BioAI works fully offline with its synthetic reservoir.',
    'CL1 and FinalSpark are optional experimental adapters only and require explicit authorization/configuration.',
    'Measured electrode frames must remain labeled measured; decoded/controller state remains derived; simulated responses remain simulated.',
    'Store compact features/fingerprints by default, not raw high-volume electrophysiology.',
    'Never interpret electrode activity as readable thoughts, autobiographical memories or proof of consciousness.'
  ].join('\n');
}
