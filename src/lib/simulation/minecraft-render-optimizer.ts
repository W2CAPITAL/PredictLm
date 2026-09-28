export type MinecraftRenderPreset='auto'|'performance'|'balanced'|'quality'|'cinematic';

export interface MinecraftRenderProfile{
  id:MinecraftRenderPreset;
  label:string;
  targetFps:number;
  renderScale:number;
  minRenderScale:number;
  maxRenderScale:number;
  dprCap:number;
  detailRadius:number;
  farStep:1|2;
  sharpen:number;
  saturation:number;
  contrast:number;
  maxViewRadius:number;
  mediaFps:number;
}

export interface MinecraftRenderSample{
  renderMs:number;
  geometryMs:number;
  vertices:number;
  memoryPressure01:number;
}

export interface MinecraftAdaptiveState{
  scale:number;
  ewmaRenderMs:number;
  ewmaGeometryMs:number;
  pressure:number;
  samples:number;
  lastAdjustment:'up'|'down'|'hold';
}

export const MINECRAFT_RENDER_PROFILES:Record<MinecraftRenderPreset,MinecraftRenderProfile>={
  auto:{
    id:'auto',label:'Auto',targetFps:60,renderScale:.82,minRenderScale:.5,maxRenderScale:1,
    dprCap:1.4,detailRadius:9,farStep:2,sharpen:.32,saturation:1.03,contrast:1.03,maxViewRadius:24,mediaFps:60
  },
  performance:{
    id:'performance',label:'Performance',targetFps:60,renderScale:.58,minRenderScale:.5,maxRenderScale:.68,
    dprCap:1,detailRadius:6,farStep:2,sharpen:.42,saturation:1.02,contrast:1.04,maxViewRadius:24,mediaFps:60
  },
  balanced:{
    id:'balanced',label:'Balanced',targetFps:60,renderScale:.78,minRenderScale:.68,maxRenderScale:.86,
    dprCap:1.25,detailRadius:8,farStep:2,sharpen:.34,saturation:1.03,contrast:1.03,maxViewRadius:24,mediaFps:60
  },
  quality:{
    id:'quality',label:'Quality',targetFps:60,renderScale:1,minRenderScale:.86,maxRenderScale:1,
    dprCap:1.55,detailRadius:10,farStep:1,sharpen:.22,saturation:1.025,contrast:1.02,maxViewRadius:24,mediaFps:60
  },
  cinematic:{
    id:'cinematic',label:'Cinematic',targetFps:30,renderScale:1.15,minRenderScale:1,maxRenderScale:1.25,
    dprCap:1.75,detailRadius:12,farStep:1,sharpen:.16,saturation:1.05,contrast:1.04,maxViewRadius:24,mediaFps:30
  }
};

export function createAdaptiveRenderState(profile:MinecraftRenderProfile):MinecraftAdaptiveState{
  return{
    scale:profile.renderScale,
    ewmaRenderMs:1000/profile.targetFps,
    ewmaGeometryMs:0,
    pressure:0,
    samples:0,
    lastAdjustment:'hold'
  };
}

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export function updateAdaptiveRenderState(
  state:MinecraftAdaptiveState,
  sample:MinecraftRenderSample,
  profile:MinecraftRenderProfile
):MinecraftAdaptiveState{
  const a=state.samples<4?.45:.16;
  const ewmaRenderMs=state.ewmaRenderMs*(1-a)+sample.renderMs*a;
  const ewmaGeometryMs=state.ewmaGeometryMs*(1-a)+sample.geometryMs*a;
  const pressure=clamp(state.pressure*.8+sample.memoryPressure01*.2,0,1);
  if(profile.id!=='auto'){
    return{...state,scale:profile.renderScale,ewmaRenderMs,ewmaGeometryMs,pressure,samples:state.samples+1,lastAdjustment:'hold'};
  }

  const budget=1000/profile.targetFps;
  const slow=ewmaRenderMs>budget*1.12||ewmaGeometryMs>budget*.72||pressure>.78;
  const fast=ewmaRenderMs<budget*.68&&ewmaGeometryMs<budget*.45&&pressure<.55&&state.samples>8;
  let scale=state.scale;
  let lastAdjustment:MinecraftAdaptiveState['lastAdjustment']='hold';
  if(slow){
    scale=clamp(scale-.07,profile.minRenderScale,profile.maxRenderScale);
    lastAdjustment=scale<state.scale?'down':'hold';
  }else if(fast){
    scale=clamp(scale+.035,profile.minRenderScale,profile.maxRenderScale);
    lastAdjustment=scale>state.scale?'up':'hold';
  }
  return{scale,ewmaRenderMs,ewmaGeometryMs,pressure,samples:state.samples+1,lastAdjustment};
}

export function browserMemoryPressure01(){
  if(typeof performance==='undefined')return 0;
  const memory=(performance as any).memory as {usedJSHeapSize?:number;jsHeapSizeLimit?:number}|undefined;
  if(!memory?.usedJSHeapSize||!memory.jsHeapSizeLimit)return 0;
  return clamp(memory.usedJSHeapSize/memory.jsHeapSizeLimit,0,1);
}

export function browserHardwareTier(){
  if(typeof navigator==='undefined')return'medium' as const;
  const cores=navigator.hardwareConcurrency||4;
  const memory=(navigator as Navigator & {deviceMemory?:number}).deviceMemory||4;
  if(cores>=12&&memory>=8)return'high' as const;
  if(cores<=4||memory<=3)return'low' as const;
  return'medium' as const;
}

export function recommendedPresetForBrowser():MinecraftRenderPreset{
  const tier=browserHardwareTier();
  return tier==='high'?'quality':tier==='low'?'performance':'balanced';
}

export function effectiveRenderScale(profile:MinecraftRenderProfile,state:MinecraftAdaptiveState){
  return profile.id==='auto'?clamp(state.scale,profile.minRenderScale,profile.maxRenderScale):profile.renderScale;
}

export function effectiveDetailRadius(profile:MinecraftRenderProfile,state:MinecraftAdaptiveState){
  if(profile.id!=='auto')return profile.detailRadius;
  const scale=effectiveRenderScale(profile,state);
  if(scale<.62)return Math.max(5,profile.detailRadius-3);
  if(scale<.76)return Math.max(6,profile.detailRadius-2);
  return profile.detailRadius;
}

export function shouldDropTransientCaches(memoryPressure01:number,hidden:boolean){
  return hidden||memoryPressure01>.78;
}

export function renderCssFilter(profile:MinecraftRenderProfile,state:MinecraftAdaptiveState){
  const scale=effectiveRenderScale(profile,state);
  const sharpenBoost=scale<.75?.06:0;
  const contrast=profile.contrast+sharpenBoost;
  return'contrast('+contrast.toFixed(3)+') saturate('+profile.saturation.toFixed(3)+')';
}

export function captureMimeType(){
  if(typeof MediaRecorder==='undefined')return'';
  for(const type of ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']){
    if(MediaRecorder.isTypeSupported(type))return type;
  }
  return'';
}
