import {advanceFlyCore,createFlyCoreState,type FlyCoreState} from './fly-core';
import {LIFE_WORLD_HEIGHT,LIFE_WORLD_WIDTH,perceiveFlyWorld,worldObject} from '../life-world-open';
import type {LifeSimulationState} from '../life-simulation-engine';

export interface FlySimulationState{
  version:1;
  x:number;
  y:number;
  vx:number;
  vy:number;
  z:number;
  vz:number;
  tick:number;
  behavior:'explore'|'inspect'|'avoid'|'hover'|'approach';
  targetLabel:string;
  lastStimulus:string;
  visible:string[];
  lastUtterance:string;
  silenceTicks:number;
  wanderTargetX:number;
  wanderTargetY:number;
  targetAge:number;
  core:FlyCoreState;
}

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export function createFlySimulationState(core?:FlyCoreState):FlySimulationState{
  return {
    version:1,
    x:470,
    y:92,
    vx:1.8,
    vy:.9,
    z:34,
    vz:1.2,
    tick:0,
    behavior:'explore',
    targetLabel:'ambiente',
    lastStimulus:'ambiente inicial',
    visible:[],
    lastUtterance:'',
    silenceTicks:0,
    wanderTargetX:720,
    wanderTargetY:150,
    targetAge:0,
    core:core?.version===1?core:createFlyCoreState()
  };
}

export function stepFlySimulation(
  previous:FlySimulationState|undefined,
  input:{
    personX:number;
    personY:number;
    personAction:string;
    personLocation:string;
    worldState?:LifeSimulationState;
    width?:number;
    height?:number;
  }
):FlySimulationState{
  const prev=previous?.version===1?previous:createFlySimulationState();
  const width=input.width||LIFE_WORLD_WIDTH;
  const height=input.height||LIFE_WORLD_HEIGHT;
  const currentZ=Number.isFinite(prev.z)?prev.z:34;
  const currentVz=Number.isFinite(prev.vz)?prev.vz:1.2;
  const dx=input.personX-prev.x;
  const dy=input.personY-prev.y;
  const distance=Math.max(1,Math.hypot(dx,dy));
  const nearPerson=distance<90;
  const world=input.worldState||({
    person:{x:input.personX,y:input.personY,heading:0,location:input.personLocation},
    needs:{},neuro:{}
  } as any);
  const vision=perceiveFlyWorld(prev,world);
  const bestVisual=vision.visible[0];
  const observation=[
    'simulacao',
    'local '+input.personLocation,
    input.personAction||'sem ação',
    nearPerson?'humano próximo':'exploração livre',
    vision.summary
  ].join(' · ');

  const core=advanceFlyCore(prev.core,observation);
  let behavior:FlySimulationState['behavior']='explore';

  const stimulus=bestVisual?worldObject(bestVisual.id):null;
  const stimulusDistance=bestVisual?.distance??Infinity;
  const stimulusAttraction=stimulus?.flyAttraction??0;

  if(core.threat>.55&&nearPerson)behavior='avoid';
  else if(bestVisual&&stimulusAttraction>.7&&stimulusDistance<150)behavior='approach';
  else if(bestVisual&&core.salience>.55&&stimulusDistance<105)behavior='inspect';
  else if(core.inhibition>.64&&core.exploration<.52)behavior='hover';

  const seed=((prev.tick+1)*1103515245 + Math.round(prev.x*97) + Math.round(prev.y*193))>>>0;
  const randA=(seed%10000)/10000;
  const randB=(((seed>>>8)^0x9e3779b9)%10000)/10000;
  let wanderTargetX=Number.isFinite(prev.wanderTargetX)?prev.wanderTargetX:720;
  let wanderTargetY=Number.isFinite(prev.wanderTargetY)?prev.wanderTargetY:150;
  let targetAge=(Number.isFinite(prev.targetAge)?prev.targetAge:0)+1;
  const waypointDistance=Math.hypot(wanderTargetX-prev.x,wanderTargetY-prev.y);
  const needsNewWaypoint=waypointDistance<30||targetAge>58;

  if(needsNewWaypoint){
    wanderTargetX=24+randA*Math.max(40,width-48);
    wanderTargetY=26+randB*Math.max(40,height-54);
    targetAge=0;
  }

  let tx=0;
  let ty=0;

  if(behavior==='avoid'){
    tx=(-dx/distance)*4.4;
    ty=(-dy/distance)*3.5;
  }else if(behavior==='inspect'){
    const txObj=bestVisual?.x??input.personX,tyObj=bestVisual?.y??input.personY;
    const od=Math.max(1,Math.hypot(txObj-prev.x,tyObj-prev.y));
    tx=((txObj-prev.x)/od)*2.2;
    ty=((tyObj-prev.y)/od)*1.9;
  }else if(behavior==='approach'){
    const txObj=bestVisual?.x??input.personX,tyObj=bestVisual?.y??input.personY;
    const od=Math.max(1,Math.hypot(txObj-prev.x,tyObj-prev.y));
    tx=((txObj-prev.x)/od)*4.4;
    ty=((tyObj-prev.y)/od)*3.8;
  }else if(behavior==='hover'){
    tx=0;
    ty=0;
  }else{
    const wd=Math.max(1,Math.hypot(wanderTargetX-prev.x,wanderTargetY-prev.y));
    const jitterX=(randA-.5)*.7;
    const jitterY=(randB-.5)*.7;
    tx=((wanderTargetX-prev.x)/wd)*(2.6+core.exploration*3.1)+jitterX;
    ty=((wanderTargetY-prev.y)/wd)*(2.2+core.exploration*2.8)+jitterY;
  }

  const inertia=behavior==='hover' ? .72 : .38;
  const vx=clamp(prev.vx*inertia+tx*(1-inertia),-8,8);
  const vy=clamp(prev.vy*inertia+ty*(1-inertia),-7,7);
  const altitudeJitter=(randA-.5)*8;
  const desiredZ=behavior==='avoid'?58:behavior==='inspect'?42:behavior==='hover'?36:48+altitudeJitter;
  const vz=clamp(currentVz*.5+(desiredZ-currentZ)*.12,-4,4);
  const z=clamp(currentZ+vz,20,76);
  let x=prev.x+vx;
  let y=prev.y+vy;

  if(x<18||x>width-18)x=clamp(width-x,18,width-18);
  if(y<20||y>height-22)y=clamp(height-y,20,height-22);

  const shouldSpeak=core.salience>.7&&core.inhibition<.62&&(prev.silenceTicks>5||prev.tick%13===0);
  const targetLabel=behavior==='approach'||behavior==='inspect'
    ? (bestVisual?.label||'humano')
    : behavior==='avoid'
      ? 'distância segura'
      : input.personLocation;
  const utterance=shouldSpeak
    ? behavior==='avoid'
      ? 'Bzz! longe.'
      : behavior==='approach'
        ? 'Bzz… '+targetLabel+'.'
        : behavior==='inspect'
          ? 'Bzz? olhando '+targetLabel+'.'
          : 'Bzz… explorando.'
    : '';

  return {
    version:1,
    x,
    y,
    vx,
    vy,
    z,
    vz,
    tick:prev.tick+1,
    behavior,
    targetLabel,
    lastStimulus:observation,
    visible:vision.visible.map(x=>x.label).slice(0,8),
    lastUtterance:utterance,
    silenceTicks:utterance?0:(prev.silenceTicks||0)+1,
    wanderTargetX,
    wanderTargetY,
    targetAge,
    core
  };
}

export function flySimulationBubble(state:FlySimulationState){
  if(state.lastUtterance)return state.lastUtterance;
  if(state.behavior==='avoid')return 'zzzt — afastando';
  if(state.behavior==='inspect')return 'bzz? observando';
  if(state.behavior==='approach')return 'bzz → chegando perto';
  if(state.behavior==='hover')return 'bzz… pairando';
  return 'bzz · explorando';
}
