import {advanceFlyCore,createFlyCoreState,type FlyCoreState} from './fly-core';
import {LIFE_WORLD_HEIGHT,LIFE_WORLD_WIDTH,WORLD_OBJECTS,perceiveFlyWorld,worldObject} from '../life-world-open';
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
  targetId:string|null;
  targetX:number;
  targetY:number;
  goal:string;
  boredom:number;
  lastTargets:string[];
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
    targetId:'work-coffee',
    targetX:720,
    targetY:172,
    goal:'explorar um estímulo diferente',
    boredom:.18,
    lastTargets:[],
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
  const recent=new Set(Array.isArray(prev.lastTargets)?prev.lastTargets:[]);
  const visibleRanked=vision.visible
    .map(v=>({v,obj:worldObject(v.id)}))
    .filter(x=>x.obj)
    .map(x=>({
      ...x,
      score:(x.v.salience||0)*1.4+(x.obj!.flyAttraction||0)*1.1-(recent.has(x.obj!.id)?.7:0)-Math.min(.5,x.v.distance/320)
    }))
    .sort((a,b)=>b.score-a.score);
  const bestVisual=visibleRanked[0]?.v;
  const reachedTarget=Math.hypot((prev.targetX??prev.x)-prev.x,(prev.targetY??prev.y)-prev.y)<24;
  const targetStale=prev.tick%45===0||reachedTarget||!prev.targetId;
  let chosen=targetStale?(visibleRanked[0]?.obj||null):worldObject(String(prev.targetId||''));
  if(!chosen){
    const candidates=WORLD_OBJECTS
      .filter(obj=>!recent.has(obj.id))
      .map(obj=>({obj,score:obj.flyAttraction*1.25+obj.salience*.65+((obj.id.length*(prev.tick+3))%17)/30}))
      .sort((a,b)=>b.score-a.score);
    chosen=candidates[0]?.obj||WORLD_OBJECTS[(prev.tick*7)%Math.max(1,WORLD_OBJECTS.length)]||null;
  }
  const targetX=chosen?.x??Math.max(24,Math.min(width-24,(prev.x+173)%width));
  const targetY=chosen?.y??Math.max(24,Math.min(height-24,(prev.y+119)%height));
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

  const phase=(prev.tick+1)*.43;
  const targetDx=targetX-prev.x;
  const targetDy=targetY-prev.y;
  const targetDistance=Math.max(1,Math.hypot(targetDx,targetDy));
  let tx=(targetDx/targetDistance)*2.15;
  let ty=(targetDy/targetDistance)*1.9;
  // Small sensory jitter prevents perfectly straight robotic paths without creating circular orbits.
  tx+=(Math.sin((prev.tick+1)*1.91)*.18);
  ty+=(Math.sin((prev.tick+1)*2.37+.7)*.15);

  if(behavior==='avoid'){
    tx+=(-dx/distance)*4.2;
    ty+=(-dy/distance)*3.3;
  }else if(behavior==='inspect'){
    tx+=(targetDx/targetDistance)*.75;
    ty+=(targetDy/targetDistance)*.65;
  }else if(behavior==='approach'){
    tx+=(targetDx/targetDistance)*1.85;
    ty+=(targetDy/targetDistance)*1.55;
  }else if(behavior==='hover'){
    tx*=.35;
    ty*=.35;
  }else{
    tx+=(targetDx/targetDistance)*core.exploration*.9;
    ty+=(targetDy/targetDistance)*core.exploration*.75;
  }

  const vx=clamp(prev.vx*.55+tx*.45,-5,5);
  const vy=clamp(prev.vy*.55+ty*.45,-4,4);
  const desiredZ=behavior==='avoid'?58:behavior==='inspect'?42:behavior==='hover'?36:48+Math.sin(phase*.82)*10;
  const vz=clamp(currentVz*.5+(desiredZ-currentZ)*.12,-4,4);
  const z=clamp(currentZ+vz,20,76);
  let x=prev.x+vx;
  let y=prev.y+vy;

  if(x<18||x>width-18)x=clamp(width-x,18,width-18);
  if(y<20||y>height-22)y=clamp(height-y,20,height-22);

  const shouldSpeak=core.salience>.7&&core.inhibition<.62&&(prev.silenceTicks>5||prev.tick%13===0);
  const targetLabel=behavior==='avoid'
    ? 'distância segura'
    : (chosen?.label||bestVisual?.label||input.personLocation);
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
    targetId:chosen?.id||null,
    targetX,
    targetY,
    goal:behavior==='avoid'
      ? 'afastar-se de ameaça'
      : behavior==='inspect'
        ? 'inspecionar '+targetLabel
        : behavior==='approach'
          ? 'alcançar '+targetLabel
          : 'procurar um estímulo novo em '+targetLabel,
    boredom:clamp((prev.boredom??.18)*.82+(reachedTarget?.12:0)-(chosen&&!recent.has(chosen.id)?.08:0),0,1),
    lastTargets:reachedTarget&&chosen
      ? [chosen.id,...(prev.lastTargets||[]).filter(x=>x!==chosen!.id)].slice(0,8)
      : (prev.lastTargets||[]).slice(0,8),
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
