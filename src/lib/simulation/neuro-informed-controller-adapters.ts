import {minecraftNeuralDecision,type MinecraftNeuralAction} from '@/lib/simulation/minecraft-neural-controller';
import {
  CONTROLLER_COVERAGE,
  digestObservation,
  type CognitiveController,
  type ControllerAction,
  type DecisionTrace,
  type NeuroControllerId,
  type SensoriumObservation
} from '@/lib/simulation/cognitive-world-contract';

interface RuntimeMemory{
  episodic:string[];
  spatial:string[];
  goal:string;
  trace?:DecisionTrace;
}

function clamp(n:number,min=0,max=1){return Math.max(min,Math.min(max,n))}
function sign(n:number): -1|0|1{return n===0?0:n>0?1:-1}

function deterministicDirection(seed:number,tick:number,id:NeuroControllerId):[-1|0|1,-1|0|1]{
  const salt={human:101,macaque:211,mouse:307,fly:401}[id];
  const n=(Math.imul((seed^salt)>>>0,(tick+17)>>>0)+2654435761)>>>0;
  const dirs:[-1|0|1,-1|0|1][]=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  return dirs[n%dirs.length];
}

function nearest<T extends {dx:number;dz:number}>(items:T[]){
  return items.slice().sort((a,b)=>(Math.abs(a.dx)+Math.abs(a.dz))-(Math.abs(b.dx)+Math.abs(b.dz)))[0];
}

function foodCount(obs:SensoriumObservation){
  return (obs.inventory.food||0)+(obs.inventory.bread||0)+(obs.inventory.apple||0)+(obs.inventory.raw_meat||0);
}

function plannerCandidate(id:NeuroControllerId,obs:SensoriumObservation,neural:MinecraftNeuralAction):ControllerAction|undefined{
  if(foodCount(obs)>0&&obs.hunger<9)return{type:'interact',target:'food',rationaleCode:id+':planner-eat'};
  if((obs.inventory.wood||0)>=1&&(obs.inventory.planks||0)<4)return{type:'craft',recipe:'planks',rationaleCode:id+':planner-planks'};
  if((obs.inventory.planks||0)>=4&&(obs.inventory.crafting_table||0)<1)return{type:'craft',recipe:'crafting_table',rationaleCode:id+':planner-table'};
  if(neural==='build'&&(obs.inventory.planks||0)>=2)return{type:'craft',recipe:'sticks',rationaleCode:id+':planner-sticks'};
  return undefined;
}

function reactiveCandidate(id:NeuroControllerId,obs:SensoriumObservation):ControllerAction|undefined{
  const threat=nearest(obs.entities.filter(x=>x.hostile));
  if(!threat)return undefined;
  const distance=Math.abs(threat.dx)+Math.abs(threat.dz);
  const threshold=id==='fly'?7:id==='mouse'?5:id==='macaque'?4:3;
  if(distance>threshold)return undefined;
  return{
    type:'move',
    dx:sign(-threat.dx),
    dz:sign(-threat.dz),
    rationaleCode:id+':reactive-threat'
  };
}

function neuralToAction(id:NeuroControllerId,obs:SensoriumObservation,action:MinecraftNeuralAction):ControllerAction{
  if(action==='avoid_threat'){
    const threat=nearest(obs.entities.filter(x=>x.hostile));
    if(threat)return{type:'move',dx:sign(-threat.dx),dz:sign(-threat.dz),rationaleCode:id+':lif-avoid'};
  }
  if(action==='forage'){
    if(foodCount(obs)>0)return{type:'interact',target:'food',rationaleCode:id+':lif-eat'};
    const passive=nearest(obs.entities.filter(x=>!x.hostile));
    if(passive)return{type:'move',dx:sign(passive.dx),dz:sign(passive.dz),rationaleCode:id+':lif-forage'};
  }
  if(action==='seek_social'){
    const entity=nearest(obs.entities.filter(x=>!x.hostile));
    if(entity)return{type:'move',dx:sign(entity.dx),dz:sign(entity.dz),rationaleCode:id+':lif-social'};
  }
  if(action==='build'){
    if((obs.inventory.wood||0)>0)return{type:'craft',recipe:'planks',rationaleCode:id+':lif-build'};
  }
  const [dx,dz]=deterministicDirection(obs.seed,obs.tick,id);
  return{type:'move',dx,dz,rationaleCode:id+':lif-explore'};
}

export function createNeuroInformedMinecraftController(id:NeuroControllerId):CognitiveController{
  let memory:RuntimeMemory={episodic:[],spatial:[],goal:'explore'};
  const profile=CONTROLLER_COVERAGE[id];

  return{
    id,
    label:profile.label,
    mode:'neuro-informed',
    reset(){
      memory={episodic:[],spatial:[],goal:'explore'};
    },
    step(obs){
      const digest=digestObservation(obs);
      const positionKey=obs.position.dimension+':'+Math.floor(obs.position.x/4)+':'+Math.floor(obs.position.z/4);
      const memoryWrites:string[]=[];
      if(!memory.spatial.includes(positionKey)){
        memory.spatial=[...memory.spatial.slice(-127),positionKey];
        memoryWrites.push('spatial:'+positionKey);
      }
      if(memory.episodic[memory.episodic.length-1]!==digest){
        memory.episodic=[...memory.episodic.slice(-31),digest];
        memoryWrites.push('episode:'+obs.tick);
      }

      const hostiles=obs.entities.filter(x=>x.hostile);
      const nearestSocial=nearest(obs.entities.filter(x=>!x.hostile));
      const novelty=memory.spatial.length<8?1:clamp(1-memory.spatial.length/128);
      const neural=minecraftNeuralDecision({
        seed:obs.seed,
        tick:obs.tick,
        hunger01:clamp((20-obs.hunger)/20),
        threat01:clamp(hostiles.length/3),
        novelty01:novelty,
        socialDistance:nearestSocial?Math.min(24,Math.abs(nearestSocial.dx)+Math.abs(nearestSocial.dz)):24,
        shelterNeed01:(obs.inventory.bed||0)>0?.1:.8
      });

      const reactive=reactiveCandidate(id,obs);
      const planner=plannerCandidate(id,obs,neural.action);
      let selectedBy:DecisionTrace['selectedBy']='planner';
      let action:ControllerAction;

      if(reactive){
        selectedBy='reactive';
        action=reactive;
        memory.goal='avoid-threat';
      }else if(planner){
        action=planner;
        memory.goal=planner.recipe?'craft:'+planner.recipe:'forage';
      }else{
        action=neuralToAction(id,obs,neural.action);
        selectedBy='reactive';
        memory.goal=neural.action;
      }

      memory.trace={
        tick:obs.tick,
        observationDigest:digest,
        memoryWrites,
        plannerCandidate:planner,
        reactiveCandidate:reactive,
        selectedBy,
        action
      };
      return action;
    },
    trace(){
      return memory.trace;
    }
  };
}
