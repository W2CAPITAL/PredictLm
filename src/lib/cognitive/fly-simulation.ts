import {advanceFlyCore,createFlyCoreState,type FlyCoreState} from './fly-core';

export interface FlySimulationState{
  version:1;
  x:number;
  y:number;
  vx:number;
  vy:number;
  tick:number;
  behavior:'explore'|'inspect'|'avoid'|'hover'|'approach';
  targetLabel:string;
  lastStimulus:string;
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
    tick:0,
    behavior:'explore',
    targetLabel:'ambiente',
    lastStimulus:'ambiente inicial',
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
    width?:number;
    height?:number;
  }
):FlySimulationState{
  const prev=previous?.version===1?previous:createFlySimulationState();
  const width=input.width||640;
  const height=input.height||360;
  const dx=input.personX-prev.x;
  const dy=input.personY-prev.y;
  const distance=Math.max(1,Math.hypot(dx,dy));
  const nearPerson=distance<90;
  const observation=[
    'simulacao',
    'local '+input.personLocation,
    input.personAction||'sem ação',
    nearPerson?'objeto grande próximo':'exploração livre'
  ].join(' · ');

  const core=advanceFlyCore(prev.core,observation);
  let behavior:FlySimulationState['behavior']='explore';

  if(core.threat>.55&&nearPerson)behavior='avoid';
  else if(core.salience>.62&&distance<180)behavior='inspect';
  else if(core.actionSelection>.63&&distance>=180)behavior='approach';
  else if(core.inhibition>.64&&core.exploration<.52)behavior='hover';

  const phase=(prev.tick+1)*.43;
  let tx=Math.cos(phase)*2.4;
  let ty=Math.sin(phase*1.37)*1.8;

  if(behavior==='avoid'){
    tx+=(-dx/distance)*4.2;
    ty+=(-dy/distance)*3.3;
  }else if(behavior==='inspect'){
    tx+=(dx/distance)*1.5;
    ty+=(dy/distance)*1.2;
  }else if(behavior==='approach'){
    tx+=(dx/distance)*2.4;
    ty+=(dy/distance)*1.8;
  }else if(behavior==='hover'){
    tx*=.35;
    ty*=.35;
  }else{
    tx+=Math.cos(phase*.53)*core.exploration*2.4;
    ty+=Math.sin(phase*.71)*core.exploration*2.0;
  }

  const vx=clamp(prev.vx*.55+tx*.45,-5,5);
  const vy=clamp(prev.vy*.55+ty*.45,-4,4);
  let x=prev.x+vx;
  let y=prev.y+vy;

  if(x<18||x>width-18)x=clamp(width-x,18,width-18);
  if(y<20||y>height-22)y=clamp(height-y,20,height-22);

  return {
    version:1,
    x,
    y,
    vx,
    vy,
    tick:prev.tick+1,
    behavior,
    targetLabel:behavior==='approach'||behavior==='inspect'?'Predict':behavior==='avoid'?'distância segura':input.personLocation,
    lastStimulus:observation,
    core
  };
}

export function flySimulationBubble(state:FlySimulationState){
  if(state.behavior==='avoid')return 'zzzt — afastando';
  if(state.behavior==='inspect')return 'bzz? observando';
  if(state.behavior==='approach')return 'bzz → chegando perto';
  if(state.behavior==='hover')return 'bzz… pairando';
  return 'bzz · explorando';
}
