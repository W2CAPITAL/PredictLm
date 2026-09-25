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
  targetId:string|null;
  targetDwellTicks:number;
  avoidTargetId:string|null;
  avoidUntilTick:number;
  stalledTicks:number;
  lastX:number;
  lastY:number;
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
    x:470,y:92,vx:1.8,vy:.9,z:34,vz:1.2,tick:0,behavior:'explore',
    targetLabel:'ambiente',targetId:null,targetDwellTicks:0,avoidTargetId:null,avoidUntilTick:0,
    stalledTicks:0,lastX:470,lastY:92,lastStimulus:'ambiente inicial',visible:[],lastUtterance:'',
    silenceTicks:0,wanderTargetX:720,wanderTargetY:150,targetAge:0,
    core:core?.version===1?core:createFlyCoreState()
  };
}

function normalizeState(previous:FlySimulationState|undefined){
  const base=createFlySimulationState(previous?.core);
  if(!previous||previous.version!==1)return base;
  return {
    ...base,...previous,
    targetId:typeof previous.targetId==='string'?previous.targetId:null,
    targetDwellTicks:Number.isFinite(previous.targetDwellTicks)?previous.targetDwellTicks:0,
    avoidTargetId:typeof previous.avoidTargetId==='string'?previous.avoidTargetId:null,
    avoidUntilTick:Number.isFinite(previous.avoidUntilTick)?previous.avoidUntilTick:0,
    stalledTicks:Number.isFinite(previous.stalledTicks)?previous.stalledTicks:0,
    lastX:Number.isFinite(previous.lastX)?previous.lastX:previous.x,
    lastY:Number.isFinite(previous.lastY)?previous.lastY:previous.y
  };
}

function targetScore(item:{id:string;distance:number;salience:number}){
  const obj=worldObject(item.id);
  if(!obj)return -Infinity;
  let score=item.salience*19-item.distance*.045+(obj.flyAttraction||0)*18;
  if(obj.kind==='flower'||obj.kind==='fruit_tree'||obj.kind==='coffee')score+=16;
  if(obj.kind==='fridge'||obj.kind==='stove'||obj.kind==='table')score+=8;
  if(obj.kind==='lamp')score-=18;
  if(obj.kind==='bench'||obj.kind==='printer'||obj.kind==='whiteboard')score-=8;
  return score;
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
  const prev=normalizeState(previous);
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
  const cooled=prev.avoidTargetId&&prev.tick<prev.avoidUntilTick?prev.avoidTargetId:null;
  const currentVisible=prev.targetId?vision.visible.find(v=>v.id===prev.targetId):null;
  const candidates=vision.visible.filter(v=>v.id!==cooled).sort((a,b)=>targetScore(b)-targetScore(a));
  let bestVisual=currentVisible&&currentVisible.id!==cooled?currentVisible:(candidates[0]||null);
  let targetId=bestVisual?.id||null;

  const observation=[
    'simulacao','local '+input.personLocation,input.personAction||'sem ação',
    nearPerson?'humano próximo':'exploração livre',vision.summary
  ].join(' · ');
  const core=advanceFlyCore(prev.core,observation);

  const stimulus=bestVisual?worldObject(bestVisual.id):null;
  const stimulusDistance=bestVisual?.distance??Infinity;
  const stimulusAttraction=stimulus?.flyAttraction??0;
  let targetDwellTicks=targetId&&targetId===prev.targetId&&stimulusDistance<20?prev.targetDwellTicks+1:0;
  let avoidTargetId=prev.avoidTargetId;
  let avoidUntilTick=prev.avoidUntilTick;

  // A fly samples a stimulus, then leaves. No object is allowed to become a permanent magnet.
  if(targetId&&stimulusDistance<18&&targetDwellTicks>=6){
    avoidTargetId=targetId;
    avoidUntilTick=prev.tick+30;
    targetId=null;
    bestVisual=null;
    targetDwellTicks=0;
  }

  let behavior:FlySimulationState['behavior']='explore';
  if(core.threat>.55&&nearPerson)behavior='avoid';
  else if(bestVisual&&stimulusAttraction>.72&&stimulusDistance>20&&stimulusDistance<165)behavior='approach';
  else if(bestVisual&&stimulusDistance<=45)behavior='inspect';
  else if(core.inhibition>.76&&core.exploration<.36&&prev.tick%19===0)behavior='hover';

  const seed=((prev.tick+1)*1103515245 + Math.round(prev.x*97) + Math.round(prev.y*193))>>>0;
  const randA=(seed%10000)/10000;
  const randB=(((seed>>>8)^0x9e3779b9)%10000)/10000;
  let wanderTargetX=Number.isFinite(prev.wanderTargetX)?prev.wanderTargetX:720;
  let wanderTargetY=Number.isFinite(prev.wanderTargetY)?prev.wanderTargetY:150;
  let targetAge=(Number.isFinite(prev.targetAge)?prev.targetAge:0)+1;
  const movedLast=Math.hypot(prev.x-prev.lastX,prev.y-prev.lastY);
  let stalledTicks=behavior!=='hover'&&movedLast<.55?prev.stalledTicks+1:0;
  const waypointDistance=Math.hypot(wanderTargetX-prev.x,wanderTargetY-prev.y);
  const needsNewWaypoint=waypointDistance<38||targetAge>38||stalledTicks>=4;

  if(needsNewWaypoint){
    wanderTargetX=22+randA*Math.max(44,width-44);
    wanderTargetY=24+randB*Math.max(44,height-48);
    targetAge=0;
    if(stalledTicks>=4){
      avoidTargetId=prev.targetId||avoidTargetId;
      avoidUntilTick=prev.tick+24;
      targetId=null;bestVisual=null;targetDwellTicks=0;behavior='explore';stalledTicks=0;
    }
  }

  let tx=0,ty=0;
  if(behavior==='avoid'){
    tx=(-dx/distance)*5.8;ty=(-dy/distance)*5.1;
  }else if((behavior==='inspect'||behavior==='approach')&&bestVisual){
    const od=Math.max(1,Math.hypot(bestVisual.x-prev.x,bestVisual.y-prev.y));
    const speed=behavior==='approach'?7.1:4.6;
    tx=((bestVisual.x-prev.x)/od)*speed;
    ty=((bestVisual.y-prev.y)/od)*(speed*.9);
  }else if(behavior==='hover'){
    tx=0;ty=0;
  }else{
    const wd=Math.max(1,Math.hypot(wanderTargetX-prev.x,wanderTargetY-prev.y));
    const jitterX=(randA-.5)*1.3;
    const jitterY=(randB-.5)*1.3;
    tx=((wanderTargetX-prev.x)/wd)*(5.0+core.exploration*4.6)+jitterX;
    ty=((wanderTargetY-prev.y)/wd)*(4.5+core.exploration*4.2)+jitterY;
  }

  const inertia=behavior==='hover'?.5:.2;
  let vx=clamp(prev.vx*inertia+tx*(1-inertia),-12,12);
  let vy=clamp(prev.vy*inertia+ty*(1-inertia),-11,11);
  const altitudeJitter=(randA-.5)*10;
  const desiredZ=behavior==='avoid'?72:behavior==='inspect'?34:behavior==='hover'?38:54+altitudeJitter*1.3;
  let vz=clamp(currentVz*.42+(desiredZ-currentZ)*.16,-7,7);
  let z=clamp(currentZ+vz,12,96);
  let x=prev.x+vx,y=prev.y+vy;

  // Reflect at world bounds instead of teleporting to the opposite side.
  if(x<16){x=16;vx=Math.abs(vx)}
  if(x>width-16){x=width-16;vx=-Math.abs(vx)}
  if(y<18){y=18;vy=Math.abs(vy)}
  if(y>height-20){y=height-20;vy=-Math.abs(vy)}
  if(z<=12&&vz<0)vz=Math.abs(vz);
  if(z>=96&&vz>0)vz=-Math.abs(vz);

  const shouldSpeak=core.salience>.7&&core.inhibition<.62&&(prev.silenceTicks>5||prev.tick%13===0);
  const targetLabel=(behavior==='approach'||behavior==='inspect')&&bestVisual
    ? bestVisual.label
    : behavior==='avoid'?'distância segura':input.personLocation;
  const utterance=shouldSpeak
    ? behavior==='avoid'?'Bzz! longe.'
      : behavior==='approach'?'Bzz… '+targetLabel+'.'
        : behavior==='inspect'?'Bzz? verificando '+targetLabel+'.'
          :'Bzz… mudando de rota.'
    :'';

  return {
    ...prev,
    x,y,vx,vy,z,vz,tick:prev.tick+1,behavior,targetLabel,targetId,targetDwellTicks,
    avoidTargetId,avoidUntilTick,stalledTicks,lastX:prev.x,lastY:prev.y,lastStimulus:observation,
    visible:vision.visible.map(v=>v.label).slice(0,10),
    lastUtterance:utterance,silenceTicks:utterance?0:(prev.silenceTicks||0)+1,
    wanderTargetX,wanderTargetY,targetAge,core
  };
}

export function flySimulationBubble(state:FlySimulationState){
  if(state.lastUtterance)return state.lastUtterance;
  if(state.behavior==='avoid')return 'zzzt — afastando';
  if(state.behavior==='inspect')return 'bzz? verificando';
  if(state.behavior==='approach')return 'bzz → aproximando';
  if(state.behavior==='hover')return 'bzz… pairando';
  return 'bzz · rota nova';
}
