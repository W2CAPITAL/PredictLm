import {advanceMacaqueCore,createMacaqueCoreState,type MacaqueCoreState} from './macaque-core';
import {LIFE_WORLD_HEIGHT,LIFE_WORLD_WIDTH,perceiveMacaqueWorld,worldObject} from '../life-world-open';
import type {LifeSimulationState} from '../life-simulation-engine';

export interface MacaqueSimulationState{
  version:1;
  x:number;
  y:number;
  z:number;
  vx:number;
  vy:number;
  heading:number;
  tick:number;
  behavior:'explore'|'inspect'|'forage'|'climb'|'rest'|'social';
  targetLabel:string;
  visible:string[];
  publicThought:string;
  wanderTargetX:number;
  wanderTargetY:number;
  targetAge:number;
  core:MacaqueCoreState;
}

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export function createMacaqueSimulationState(core?:MacaqueCoreState):MacaqueSimulationState{
  return {
    version:1,x:170,y:155,z:10,vx:1.5,vy:.8,heading:.25,tick:0,behavior:'explore',
    targetLabel:'parque',visible:[],publicThought:'Vou observar o espaço e escolher algo que valha a pena explorar.',
    wanderTargetX:245,wanderTargetY:95,targetAge:0,
    core:core?.version===1?core:createMacaqueCoreState()
  };
}

export function stepMacaqueSimulation(
  previous:MacaqueSimulationState|undefined,
  input:{worldState:LifeSimulationState;fly?:{x:number;y:number}}
):MacaqueSimulationState{
  const prev=previous?.version===1?previous:createMacaqueSimulationState();
  const vision=perceiveMacaqueWorld(prev,input.worldState,input.fly);
  const best=vision.visible[0];
  const obj=best?worldObject(best.id):null;
  const observation=[
    'macaque simulation',vision.summary,
    'human '+input.worldState.person.currentAction,
    'location '+input.worldState.person.location
  ].join(' · ');
  const core=advanceMacaqueCore(prev.core,observation);
  const seed=((prev.tick+11)*1664525+Math.round(prev.x*131)+Math.round(prev.y*313))>>>0;
  const randA=(seed%10000)/10000;
  const randB=(((seed>>>7)^0x85ebca6b)%10000)/10000;
  const nearHuman=Math.hypot(input.worldState.person.x-prev.x,input.worldState.person.y-prev.y)<80;

  let behavior:MacaqueSimulationState['behavior']='explore';
  if(nearHuman&&core.uncertainty>.52)behavior='social';
  else if(obj&&(obj.affordances.includes('forage')||obj.kind==='fruit_tree'))behavior='forage';
  else if(obj&&(obj.affordances.includes('climb')||obj.kind==='climbing_frame'||obj.kind==='tree'))behavior='climb';
  else if(best&&best.distance<70)behavior='inspect';
  else if(prev.tick%47>39)behavior='rest';

  let wanderTargetX=prev.wanderTargetX,wanderTargetY=prev.wanderTargetY,targetAge=prev.targetAge+1;
  if(targetAge>58||Math.hypot(wanderTargetX-prev.x,wanderTargetY-prev.y)<24){
    wanderTargetX=45+randA*260;
    wanderTargetY=45+randB*195;
    targetAge=0;
  }
  let tx=wanderTargetX,ty=wanderTargetY;
  if((behavior==='inspect'||behavior==='forage'||behavior==='climb')&&best){tx=best.x;ty=best.y}
  if(behavior==='social'){tx=input.worldState.person.x;ty=input.worldState.person.y}

  const dx=tx-prev.x,dy=ty-prev.y,dist=Math.max(1,Math.hypot(dx,dy));
  const speed=behavior==='rest'?0:behavior==='inspect'?2.2:behavior==='social'?3.4:4.6;
  const vx=clamp(prev.vx*.35+(dx/dist)*speed*.65,-5.2,5.2);
  const vy=clamp(prev.vy*.35+(dy/dist)*speed*.65,-5.2,5.2);
  const x=clamp(prev.x+vx,24,LIFE_WORLD_WIDTH-24);
  const y=clamp(prev.y+vy,24,LIFE_WORLD_HEIGHT-24);
  const z=behavior==='climb'?clamp(18+Math.sin(prev.tick*.28)*8,10,34):10;
  const targetLabel=best?.label||(nearHuman?'humano':'parque');
  const publicThought=behavior==='forage'
    ? 'Esse alvo pode ter alimento. Vou aproximar, conferir e decidir se vale o esforço.'
    : behavior==='climb'
      ? 'Uma rota elevada amplia o que consigo perceber; vou testar apoio e distância.'
      : behavior==='social'
        ? 'O humano está perto. Vou observar postura e movimento antes de reduzir a distância.'
        : behavior==='inspect'
          ? 'Esse objeto é novo o bastante para um teste curto.'
          : behavior==='rest'
            ? 'Vou parar por um momento e manter o ambiente no campo de atenção.'
            : 'Vou mudar de área para não repetir sempre a mesma rota.';

  return {
    ...prev,x,y,z,vx,vy,heading:Math.atan2(vy,vx||.001),tick:prev.tick+1,behavior,targetLabel,
    visible:vision.visible.map(v=>v.label).slice(0,10),publicThought,wanderTargetX,wanderTargetY,targetAge,core
  };
}

export function macaqueSimulationBubble(state:MacaqueSimulationState){
  return state.publicThought;
}
