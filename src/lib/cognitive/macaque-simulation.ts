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
  targetId:string|null;
  targetTicks:number;
  actionProgress:number;
  cooldownTargetId:string|null;
  cooldownUntilTick:number;
  stalledTicks:number;
  lastX:number;
  lastY:number;
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
    targetLabel:'parque',targetId:null,targetTicks:0,actionProgress:0,cooldownTargetId:null,cooldownUntilTick:0,
    stalledTicks:0,lastX:170,lastY:155,visible:[],publicThought:'Vou observar o espaço e escolher algo que valha a pena explorar.',
    wanderTargetX:245,wanderTargetY:95,targetAge:0,
    core:core?.version===1?core:createMacaqueCoreState()
  };
}

function normalizeState(previous:MacaqueSimulationState|undefined){
  const base=createMacaqueSimulationState(previous?.core);
  if(!previous||previous.version!==1)return base;
  return {
    ...base,...previous,
    targetId:typeof previous.targetId==='string'?previous.targetId:null,
    targetTicks:Number.isFinite(previous.targetTicks)?previous.targetTicks:0,
    actionProgress:Number.isFinite(previous.actionProgress)?previous.actionProgress:0,
    cooldownTargetId:typeof previous.cooldownTargetId==='string'?previous.cooldownTargetId:null,
    cooldownUntilTick:Number.isFinite(previous.cooldownUntilTick)?previous.cooldownUntilTick:0,
    stalledTicks:Number.isFinite(previous.stalledTicks)?previous.stalledTicks:0,
    lastX:Number.isFinite(previous.lastX)?previous.lastX:previous.x,
    lastY:Number.isFinite(previous.lastY)?previous.lastY:previous.y
  };
}

function targetScore(item:{id:string;distance:number;salience:number}){
  const obj=worldObject(item.id);
  if(!obj)return -Infinity;
  let score=item.salience*18-item.distance*.055;
  if(obj.affordances.includes('forage')||obj.kind==='fruit_tree')score+=34;
  if(obj.affordances.includes('climb')||obj.kind==='climbing_frame'||obj.kind==='tree')score+=23;
  if(obj.affordances.includes('drink')||obj.kind==='water')score+=20;
  if(obj.affordances.includes('play')||obj.affordances.includes('explore'))score+=12;
  if(obj.kind==='lamp'||obj.kind==='phone'||obj.kind==='printer')score-=22;
  return score;
}

export function stepMacaqueSimulation(
  previous:MacaqueSimulationState|undefined,
  input:{worldState:LifeSimulationState;fly?:{x:number;y:number}}
):MacaqueSimulationState{
  const prev=normalizeState(previous);
  const vision=perceiveMacaqueWorld(prev,input.worldState,input.fly);
  const core=advanceMacaqueCore(prev.core,[
    'macaque simulation',vision.summary,
    'human '+input.worldState.person.currentAction,
    'location '+input.worldState.person.location
  ].join(' · '));

  const cooled=prev.cooldownTargetId&&prev.tick<prev.cooldownUntilTick?prev.cooldownTargetId:null;
  const currentVisible=prev.targetId?vision.visible.find(v=>v.id===prev.targetId):null;
  const candidates=vision.visible
    .filter(v=>v.id!==cooled)
    .sort((a,b)=>targetScore(b)-targetScore(a));
  let best:(typeof vision.visible)[number]|null=currentVisible&&currentVisible.id!==cooled?currentVisible:(candidates[0]||null);
  let targetId=best?.id||null;
  let targetTicks=targetId&&targetId===prev.targetId?prev.targetTicks+1:0;

  const nearHuman=Math.hypot(input.worldState.person.x-prev.x,input.worldState.person.y-prev.y)<78;
  const obj=best?worldObject(best.id):null;
  const distanceToTarget=best?.distance??Infinity;
  const interacting=!!obj&&distanceToTarget<24;

  let behavior:MacaqueSimulationState['behavior']='explore';
  if(nearHuman&&core.uncertainty>.62&&!interacting)behavior='social';
  else if(interacting&&obj&&(obj.affordances.includes('forage')||obj.kind==='fruit_tree'))behavior='forage';
  else if(interacting&&obj&&(obj.affordances.includes('climb')||obj.kind==='climbing_frame'||obj.kind==='tree'))behavior='climb';
  else if(interacting&&obj)behavior='inspect';
  else if(prev.tick%83>76&&!obj)behavior='rest';

  let actionProgress=interacting?Math.min(1,prev.actionProgress+.14):0;
  let cooldownTargetId=prev.cooldownTargetId;
  let cooldownUntilTick=prev.cooldownUntilTick;

  // Complete an interaction, remember the area as recently sampled, then move on.
  if(interacting&&actionProgress>=1&&targetId){
    cooldownTargetId=targetId;
    cooldownUntilTick=prev.tick+34;
    targetId=null;
    best=null;
    targetTicks=0;
    actionProgress=0;
    behavior='explore';
  }

  const seed=((prev.tick+11)*1664525+Math.round(prev.x*131)+Math.round(prev.y*313))>>>0;
  const randA=(seed%10000)/10000;
  const randB=(((seed>>>7)^0x85ebca6b)%10000)/10000;
  let wanderTargetX=prev.wanderTargetX,wanderTargetY=prev.wanderTargetY,targetAge=prev.targetAge+1;
  const movedLast=Math.hypot(prev.x-prev.lastX,prev.y-prev.lastY);
  let stalledTicks=(!interacting&&behavior!=='rest'&&movedLast<.65)?prev.stalledTicks+1:0;

  if(targetAge>46||Math.hypot(wanderTargetX-prev.x,wanderTargetY-prev.y)<28||stalledTicks>=4){
    wanderTargetX=35+randA*(LIFE_WORLD_WIDTH-70);
    wanderTargetY=35+randB*(LIFE_WORLD_HEIGHT-70);
    targetAge=0;
    if(stalledTicks>=4){
      targetId=null;best=null;targetTicks=0;
      cooldownTargetId=prev.targetId||cooldownTargetId;
      cooldownUntilTick=prev.tick+24;
      stalledTicks=0;
    }
  }

  let tx=wanderTargetX,ty=wanderTargetY;
  if(best&&targetId){tx=best.x;ty=best.y}
  if(behavior==='social'){tx=input.worldState.person.x;ty=input.worldState.person.y}

  const dx=tx-prev.x,dy=ty-prev.y,dist=Math.max(1,Math.hypot(dx,dy));
  const speed=behavior==='rest'||interacting?0:behavior==='social'?4.1:best?4.8:5.3;
  let vx=clamp(prev.vx*.24+(dx/dist)*speed*.76,-6.2,6.2);
  let vy=clamp(prev.vy*.24+(dy/dist)*speed*.76,-6.2,6.2);
  if(interacting){vx*=.12;vy*=.12}

  let x=prev.x+vx,y=prev.y+vy;
  if(x<22){x=22;vx=Math.abs(vx)}
  if(x>LIFE_WORLD_WIDTH-22){x=LIFE_WORLD_WIDTH-22;vx=-Math.abs(vx)}
  if(y<22){y=22;vy=Math.abs(vy)}
  if(y>LIFE_WORLD_HEIGHT-22){y=LIFE_WORLD_HEIGHT-22;vy=-Math.abs(vy)}

  const climbWave=behavior==='climb'?Math.sin((prev.tick+1)*.42)*5:0;
  const z=behavior==='climb'?clamp(20+actionProgress*24+climbWave,10,50):behavior==='forage'?12:10;
  const heading=Math.hypot(vx,vy)>.15?Math.atan2(vy,vx):prev.heading;
  const targetLabel=best?.label||(nearHuman&&behavior==='social'?'humano':'explorando outra área');
  const publicThought=behavior==='forage'
    ? 'Cheguei ao alimento. Vou manipular, conferir e depois procurar outra área.'
    : behavior==='climb'
      ? 'Estou usando os apoios e mudando de altura; depois vou escolher outra rota.'
      : behavior==='social'
        ? 'O humano está perto. Vou reduzir a distância sem repetir a mesma rota.'
        : behavior==='inspect'
          ? 'Estou perto o bastante para tocar e testar este objeto por alguns instantes.'
          : behavior==='rest'
            ? 'Vou parar brevemente, mas não transformar esta área em ponto fixo.'
            : best
              ? 'Escolhi '+best.label+' como próximo alvo e estou indo até ele.'
              : 'Vou atravessar o mapa e procurar outra oportunidade.';

  return {
    ...prev,
    x,y,z,vx,vy,heading,tick:prev.tick+1,behavior,targetLabel,targetId,targetTicks,actionProgress,
    cooldownTargetId,cooldownUntilTick,stalledTicks,lastX:prev.x,lastY:prev.y,
    visible:vision.visible.map(v=>v.label).slice(0,10),
    publicThought,wanderTargetX,wanderTargetY,targetAge,core
  };
}

export function macaqueSimulationBubble(state:MacaqueSimulationState){
  const pct=Math.round((state.actionProgress||0)*100);
  if((state.behavior==='forage'||state.behavior==='climb'||state.behavior==='inspect')&&pct>0)return state.behavior+' · '+pct+'%';
  return state.publicThought;
}
