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
  targetX:number;
  targetY:number;
  targetTicks:number;
  visited:string[];
  decision:string;
  lastStimulus:string;
  visible:string[];
  lastUtterance:string;
  silenceTicks:number;
  core:FlyCoreState;
}

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

function hash(input:string){
  let h=2166136261>>>0;
  for(let i=0;i<input.length;i++){
    h^=input.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  h^=h<<13;h^=h>>>17;h^=h<<5;
  return h>>>0;
}
function rnd(input:string){
  return hash(input)/4294967295;
}
function chooseWeighted<T extends {score:number}>(rows:T[],key:string){
  if(!rows.length)return null;
  const safe=rows.map(row=>({...row,weight:Math.max(.001,row.score)}));
  const total=safe.reduce((n,row)=>n+row.weight,0);
  let cursor=rnd(key)*total;
  for(const row of safe){
    cursor-=row.weight;
    if(cursor<=0)return row as T & {weight:number};
  }
  return safe[safe.length-1] as T & {weight:number};
}
function boundary(v:number,min:number,max:number){
  if(v<min)return min+(min-v)*.45;
  if(v>max)return max-(v-max)*.45;
  return v;
}

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
    targetId:null,
    targetX:520,
    targetY:130,
    targetTicks:0,
    visited:[],
    decision:'explorar o ambiente inicial',
    lastStimulus:'ambiente inicial',
    visible:[],
    lastUtterance:'',
    silenceTicks:0,
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
  const tick=prev.tick+1;
  const world=input.worldState||({
    person:{x:input.personX,y:input.personY,heading:0,location:input.personLocation},
    needs:{},neuro:{}
  } as any);
  const vision=perceiveFlyWorld(prev,world);
  const dxHuman=input.personX-prev.x;
  const dyHuman=input.personY-prev.y;
  const humanDistance=Math.max(1,Math.hypot(dxHuman,dyHuman));
  const nearPerson=humanDistance<95;
  const observation=[
    'simulação',
    'local '+input.personLocation,
    input.personAction||'sem ação humana',
    nearPerson?'humano próximo':'humano distante',
    vision.summary
  ].join(' · ');
  const core=advanceFlyCore(prev.core,observation);

  const priorVisited=Array.isArray(prev.visited)?prev.visited:[];
  const visualCandidates=vision.visible.map(item=>{
    const obj=worldObject(item.id);
    const attraction=obj?.flyAttraction??.2;
    const novelty=priorVisited.includes(item.id)?.36:1;
    const distanceUtility=1/(1+item.distance/70);
    const score=.08+item.salience*.42+attraction*.34+distanceUtility*.25+core.exploration*.12;
    return {item,obj,score:score*novelty};
  });

  let behavior:FlySimulationState['behavior']=prev.behavior||'explore';
  let targetId=prev.targetId||null;
  let targetX=Number.isFinite(prev.targetX)?prev.targetX:prev.x;
  let targetY=Number.isFinite(prev.targetY)?prev.targetY:prev.y;
  let targetLabel=prev.targetLabel||'ambiente';
  let targetTicks=Math.max(0,(prev.targetTicks||0)-1);
  let decision=prev.decision||'continuar explorando';

  const currentStillVisible=targetId&&vision.visible.some(x=>x.id===targetId);
  const threatInterrupt=core.threat>.56&&nearPerson;
  const staleTarget=targetTicks<=0||(!currentStillVisible&&targetId!==null);
  const canInterrupt=threatInterrupt||staleTarget||core.predictionError>.72;

  if(threatInterrupt){
    behavior='avoid';
    targetId=null;
    const awayX=prev.x-(dxHuman/humanDistance)*(110+70*rnd('fly-away-x|'+tick+'|'+prev.x.toFixed(1)));
    const awayY=prev.y-(dyHuman/humanDistance)*(90+60*rnd('fly-away-y|'+tick+'|'+prev.y.toFixed(1)));
    targetX=clamp(awayX,24,width-24);
    targetY=clamp(awayY,24,height-24);
    targetLabel='distância segura';
    targetTicks=4+Math.floor(rnd('fly-away-ticks|'+tick)*6);
    decision='interromper o plano atual por ameaça próxima';
  }else if(canInterrupt){
    const picked=chooseWeighted(visualCandidates,'fly-target|'+tick+'|'+prev.x.toFixed(1)+'|'+prev.y.toFixed(1));
    const inspectBias=core.salience*.52+core.mushroomBody*.18;
    if(picked&&picked.score>.18){
      targetId=picked.item.id;
      targetX=picked.item.x;
      targetY=picked.item.y;
      targetLabel=picked.item.label;
      const attraction=picked.obj?.flyAttraction??.2;
      behavior=attraction>.64&&picked.item.distance>46?'approach':'inspect';
      if(inspectBias<.42&&core.exploration>.58)behavior='explore';
      targetTicks=behavior==='inspect'
        ? 3+Math.floor(rnd('fly-inspect|'+tick)*5)
        : 5+Math.floor(rnd('fly-approach|'+tick)*8);
      decision=(behavior==='inspect'?'inspecionar ':'aproximar de ')+targetLabel+' por saliência, novidade e distância';
    }else if(core.inhibition>.7&&core.exploration<.44){
      behavior='hover';
      targetId=null;
      targetX=prev.x;
      targetY=prev.y;
      targetLabel='ponto atual';
      targetTicks=2+Math.floor(rnd('fly-hover|'+tick)*5);
      decision='pairar porque exploração está baixa e inibição está alta';
    }else{
      behavior='explore';
      targetId=null;
      const angle=rnd('fly-angle|'+tick+'|'+priorVisited.join(','))*Math.PI*2;
      const longStep=rnd('fly-step-kind|'+tick)>.78;
      const distance=longStep
        ? 120+160*rnd('fly-long-step|'+tick)
        : 45+95*rnd('fly-short-step|'+tick);
      targetX=clamp(prev.x+Math.cos(angle)*distance,24,width-24);
      targetY=clamp(prev.y+Math.sin(angle)*distance,24,height-24);
      targetLabel='nova área';
      targetTicks=5+Math.floor(rnd('fly-explore-ticks|'+tick)*10);
      decision=longStep?'exploração longa para quebrar repetição espacial':'exploração local guiada por novidade';
    }
  }

  const tx=targetX-prev.x;
  const ty=targetY-prev.y;
  const targetDistance=Math.max(1,Math.hypot(tx,ty));
  const speed=behavior==='avoid'?5.1:behavior==='approach'?3.9:behavior==='inspect'?2.2:behavior==='hover'?.55:3.0;
  const jitterScale=behavior==='hover'?.18:.42;
  const jitterX=(rnd('fly-jx|'+tick+'|'+targetLabel)-.5)*jitterScale;
  const jitterY=(rnd('fly-jy|'+tick+'|'+targetLabel)-.5)*jitterScale;
  let desiredVx=(tx/targetDistance)*speed+jitterX;
  let desiredVy=(ty/targetDistance)*speed+jitterY;

  if(targetDistance<18&&behavior!=='avoid'){
    desiredVx*=.34;
    desiredVy*=.34;
    targetTicks=Math.min(targetTicks,2);
  }

  const vx=clamp(prev.vx*.46+desiredVx*.54,-5.4,5.4);
  const vy=clamp(prev.vy*.46+desiredVy*.54,-4.8,4.8);
  let x=boundary(prev.x+vx,18,width-18);
  let y=boundary(prev.y+vy,20,height-22);

  if(!Number.isFinite(x))x=width/2;
  if(!Number.isFinite(y))y=height/2;

  const currentZ=Number.isFinite(prev.z)?prev.z:34;
  const currentVz=Number.isFinite(prev.vz)?prev.vz:1.2;
  const desiredZ=behavior==='avoid'
    ? 62
    : behavior==='inspect'
      ? 35+16*rnd('fly-z-inspect|'+tick)
      : behavior==='hover'
        ? currentZ
        : 30+38*rnd('fly-z-free|'+tick);
  const vz=clamp(currentVz*.48+(desiredZ-currentZ)*.13,-4,4);
  const z=clamp(currentZ+vz,20,78);

  const arrived=targetDistance<22;
  const visited=targetId&&arrived
    ? [...priorVisited.filter(id=>id!==targetId),targetId].slice(-7)
    : priorVisited.slice(-7);

  const changed=behavior!==prev.behavior||targetLabel!==prev.targetLabel;
  const shouldSpeak=changed&&core.salience>.58&&core.inhibition<.7
    ? rnd('fly-speak-change|'+tick)>.35
    : core.salience>.78&&prev.silenceTicks>8&&rnd('fly-speak-salient|'+tick)>.78;
  const utterance=shouldSpeak
    ? behavior==='avoid'
      ? 'Bzz! afastando.'
      : behavior==='approach'
        ? 'Bzz… '+targetLabel+'.'
        : behavior==='inspect'
          ? 'Bzz? '+targetLabel+'.'
          : behavior==='hover'
            ? 'Bzz… parado.'
            : 'Bzz… outra direção.'
    : '';

  return {
    version:1,
    x,y,vx,vy,z,vz,tick,
    behavior,targetLabel,targetId,targetX,targetY,targetTicks,visited,decision,
    lastStimulus:observation,
    visible:vision.visible.map(item=>item.label).slice(0,8),
    lastUtterance:utterance,
    silenceTicks:utterance?0:(prev.silenceTicks||0)+1,
    core
  };
}

export function flySimulationBubble(state:FlySimulationState){
  if(state.lastUtterance)return state.lastUtterance;
  if(state.behavior==='avoid')return 'zzzt — afastando';
  if(state.behavior==='inspect')return 'bzz? observando '+state.targetLabel;
  if(state.behavior==='approach')return 'bzz → '+state.targetLabel;
  if(state.behavior==='hover')return 'bzz… pairando';
  return 'bzz · '+(state.decision||'explorando');
}
